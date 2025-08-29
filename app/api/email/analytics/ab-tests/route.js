import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A/B Testing Analytics API
// GET /api/email/analytics/ab-tests?siteId=...&testId=...&status=active
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const testId = url.searchParams.get('testId');
    const status = url.searchParams.get('status') || 'all'; // active, completed, all
    
    if (!siteId) {
      return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
    }
    
    let query = adminDb.collection('emailABTests').where('siteId', '==', siteId);
    
    if (testId) {
      query = query.where('testId', '==', testId);
    }
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    const testsSnap = await query.orderBy('createdAt', 'desc').get();
    const tests = [];
    
    for (const testDoc of testsSnap.docs) {
      const testData = testDoc.data();
      const testResults = await calculateTestResults(testData);
      tests.push({
        ...testData,
        ...testResults
      });
    }
    
    return NextResponse.json({
      ok: true,
      tests,
      summary: calculateTestsSummary(tests)
    });
  } catch (e) {
    console.error('A/B testing analytics error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST /api/email/analytics/ab-tests - Create new A/B test
export async function POST(req) {
  try {
    const body = await req.json();
    const { siteId, testName, variants, trafficSplit, testMetric, duration, subjectA, subjectB, templateA, templateB } = body;
    
    if (!siteId || !testName || !variants || variants.length < 2) {
      return NextResponse.json({ ok: false, error: 'Invalid test configuration' }, { status: 400 });
    }
    
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testDoc = {
      testId,
      siteId,
      testName,
      status: 'active',
      createdAt: new Date(),
      endDate: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null,
      variants: variants.map((variant, index) => ({
        id: `variant_${String.fromCharCode(65 + index)}`, // A, B, C, etc.
        name: variant.name || `Variant ${String.fromCharCode(65 + index)}`,
        subject: variant.subject || (index === 0 ? subjectA : subjectB),
        template: variant.template || (index === 0 ? templateA : templateB),
        trafficPercentage: variant.trafficPercentage || (trafficSplit ? trafficSplit[index] : 50),
        sent: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        uniqueOpens: 0,
        uniqueClicks: 0
      })),
      testMetric: testMetric || 'openRate', // openRate, clickRate, conversionRate
      minSampleSize: 100, // Minimum emails per variant for statistical significance
      confidenceLevel: 0.95,
      statisticalSignificance: false,
      winner: null,
      config: {
        trafficSplit: trafficSplit || [50, 50],
        duration,
        autoStop: true, // Stop when statistical significance reached
        minRunTime: 24 // Minimum hours to run test
      }
    };
    
    await adminDb.collection('emailABTests').doc(testId).set(testDoc);
    
    return NextResponse.json({
      ok: true,
      test: testDoc
    });
  } catch (e) {
    console.error('Create A/B test error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

async function calculateTestResults(testData) {
  const results = {
    variants: [],
    statisticalSignificance: false,
    winner: null,
    confidence: 0,
    recommendedAction: 'continue',
    insights: []
  };
  
  // Get actual performance data for each variant
  for (const variant of testData.variants) {
    const messagesSnap = await adminDb.collection('emailMessages')
      .where('siteId', '==', testData.siteId)
      .where('abTestId', '==', testData.testId)
      .where('abVariant', '==', variant.id)
      .get();
    
    let sent = 0, opens = 0, clicks = 0, bounces = 0;
    const uniqueEmails = new Set();
    const uniqueOpens = new Set();
    const uniqueClicks = new Set();
    
    messagesSnap.forEach(doc => {
      const d = doc.data();
      if (d.test) return;
      
      sent++;
      uniqueEmails.add(d.to);
      
      if (d.opensCount > 0) {
        opens += d.opensCount;
        uniqueOpens.add(d.to);
      }
      
      if (d.clicksCount > 0) {
        clicks += d.clicksCount;
        uniqueClicks.add(d.to);
      }
      
      if (d.status === 'bounced') {
        bounces++;
      }
    });
    
    const openRate = sent > 0 ? (uniqueOpens.size / sent) * 100 : 0;
    const clickRate = sent > 0 ? (uniqueClicks.size / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounces / sent) * 100 : 0;
    
    results.variants.push({
      ...variant,
      sent,
      opens,
      clicks,
      bounces,
      uniqueOpens: uniqueOpens.size,
      uniqueClicks: uniqueClicks.size,
      openRate,
      clickRate,
      bounceRate,
      conversionRate: clickRate // Simplified - in real app this would be actual conversions
    });
  }
  
  // Calculate statistical significance
  if (results.variants.length === 2 && results.variants.every(v => v.sent >= testData.minSampleSize)) {
    const [variantA, variantB] = results.variants;
    const metricA = getMetricValue(variantA, testData.testMetric);
    const metricB = getMetricValue(variantB, testData.testMetric);
    
    const significance = calculateStatisticalSignificance(
      variantA.sent, metricA,
      variantB.sent, metricB,
      testData.confidenceLevel
    );
    
    results.statisticalSignificance = significance.significant;
    results.confidence = significance.confidence;
    
    if (significance.significant) {
      results.winner = metricA > metricB ? variantA.id : variantB.id;
      results.recommendedAction = 'stop';
      results.insights.push({
        type: 'success',
        message: `${results.winner} is the winner with ${Math.abs(metricA - metricB).toFixed(2)}% improvement`,
        metric: testData.testMetric,
        improvement: Math.abs(metricA - metricB)
      });
    }
  }
  
  // Generate insights
  if (results.variants.length >= 2) {
    const sortedVariants = [...results.variants].sort((a, b) => 
      getMetricValue(b, testData.testMetric) - getMetricValue(a, testData.testMetric)
    );
    
    const best = sortedVariants[0];
    const worst = sortedVariants[sortedVariants.length - 1];
    
    if (best.sent > 50 && worst.sent > 50) {
      const improvement = getMetricValue(best, testData.testMetric) - getMetricValue(worst, testData.testMetric);
      
      if (improvement > 2) {
        results.insights.push({
          type: 'info',
          message: `${best.name} is outperforming ${worst.name} by ${improvement.toFixed(1)}%`,
          metric: testData.testMetric,
          improvement
        });
      }
    }
  }
  
  // Check test duration and sample size
  const testAge = (Date.now() - testData.createdAt.toDate().getTime()) / (1000 * 60 * 60); // hours
  const totalSent = results.variants.reduce((sum, v) => sum + v.sent, 0);
  
  if (testAge < testData.config?.minRunTime || 24) {
    results.insights.push({
      type: 'warning',
      message: `Test needs to run for at least ${testData.config?.minRunTime || 24} hours (currently ${Math.round(testAge)}h)`
    });
  }
  
  if (totalSent < testData.minSampleSize * results.variants.length) {
    const needed = (testData.minSampleSize * results.variants.length) - totalSent;
    results.insights.push({
      type: 'info',
      message: `Need ${needed} more emails for reliable results (${totalSent}/${testData.minSampleSize * results.variants.length})`
    });
  }
  
  return results;
}

function getMetricValue(variant, metric) {
  switch (metric) {
    case 'openRate': return variant.openRate;
    case 'clickRate': return variant.clickRate;
    case 'conversionRate': return variant.conversionRate;
    default: return variant.openRate;
  }
}

function calculateStatisticalSignificance(sampleA, rateA, sampleB, rateB, confidenceLevel = 0.95) {
  // Simplified statistical significance calculation
  // In production, use proper statistical libraries
  
  const pA = rateA / 100; // Convert percentage to probability
  const pB = rateB / 100;
  
  const pooled = (sampleA * pA + sampleB * pB) / (sampleA + sampleB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1/sampleA + 1/sampleB));
  
  if (se === 0) return { significant: false, confidence: 0, zScore: 0 };
  
  const zScore = Math.abs(pA - pB) / se;
  
  // Critical values for different confidence levels
  const criticalValues = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  };
  
  const critical = criticalValues[confidenceLevel] || 1.96;
  const significant = zScore > critical;
  
  // Approximate confidence calculation
  const confidence = significant ? Math.min(0.99, 0.5 + (zScore / (2 * critical)) * 0.45) : Math.max(0.5, 0.5 + (zScore / critical) * 0.45);
  
  return {
    significant,
    confidence,
    zScore
  };
}

function calculateTestsSummary(tests) {
  const active = tests.filter(t => t.status === 'active').length;
  const completed = tests.filter(t => t.status === 'completed').length;
  const withWinners = tests.filter(t => t.winner).length;
  
  const avgImprovement = tests
    .filter(t => t.winner && t.variants.length === 2)
    .reduce((sum, t) => {
      const winner = t.variants.find(v => v.id === t.winner);
      const loser = t.variants.find(v => v.id !== t.winner);
      if (winner && loser) {
        const improvement = getMetricValue(winner, t.testMetric) - getMetricValue(loser, t.testMetric);
        return sum + improvement;
      }
      return sum;
    }, 0);
  
  return {
    total: tests.length,
    active,
    completed,
    withWinners,
    avgImprovement: withWinners > 0 ? avgImprovement / withWinners : 0,
    recentTests: tests.slice(0, 5)
  };
}
