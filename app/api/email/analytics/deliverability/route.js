import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Advanced Deliverability Insights API
// GET /api/email/analytics/deliverability?siteId=...&days=30&includeRecommendations=true
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const days = Math.min(Number(url.searchParams.get('days')) || 30, 90);
    const includeRecommendations = url.searchParams.get('includeRecommendations') !== 'false';
    
    if (!siteId) {
      return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
    }
    
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get email messages and delivery events
    const messagesSnap = await adminDb.collection('emailMessages')
      .where('siteId', '==', siteId)
      .where('createdAt', '>=', since)
      .get();
    
    // Get suppression list data
    const suppressionsSnap = await adminDb.collection('emailSuppressions')
      .where('siteId', '==', siteId)
      .get();
    
    // Analyze deliverability metrics
    const deliverabilityMetrics = analyzeDeliverability(messagesSnap, suppressionsSnap);
    const reputationScore = calculateReputationScore(deliverabilityMetrics);
    const insights = generateDeliverabilityInsights(deliverabilityMetrics);
    const recommendations = includeRecommendations ? generateDeliverabilityRecommendations(deliverabilityMetrics, reputationScore) : [];
    
    return NextResponse.json({
      ok: true,
      period: {
        days,
        since: since.toISOString(),
        until: new Date().toISOString()
      },
      metrics: deliverabilityMetrics,
      reputationScore,
      insights,
      recommendations,
      benchmarks: getIndustryBenchmarks()
    });
  } catch (e) {
    console.error('Deliverability analytics error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

function analyzeDeliverability(messagesSnap, suppressionsSnap) {
  const metrics = {
    totalSent: 0,
    delivered: 0,
    bounced: 0,
    softBounces: 0,
    hardBounces: 0,
    complaints: 0,
    unsubscribes: 0,
    blocked: 0,
    deferred: 0,
    
    // Rates
    deliveryRate: 0,
    bounceRate: 0,
    complaintRate: 0,
    unsubscribeRate: 0,
    
    // Time-based analysis
    series: new Map(),
    
    // Provider analysis
    providerBreakdown: new Map(),
    
    // Content analysis
    subjectLineIssues: [],
    contentFlags: [],
    
    // Authentication status
    authenticationStatus: {
      spf: { pass: 0, fail: 0, unknown: 0 },
      dkim: { pass: 0, fail: 0, unknown: 0 },
      dmarc: { pass: 0, fail: 0, unknown: 0 }
    },
    
    // IP reputation
    ipReputation: new Map(),
    
    // Engagement patterns
    engagementMetrics: {
      quickOpens: 0, // Opens within 1 hour
      delayedOpens: 0, // Opens after 24 hours
      mobileOpens: 0,
      desktopOpens: 0,
      avgTimeToOpen: 0,
      engagementScore: 0
    }
  };
  
  // Process messages
  messagesSnap.forEach(doc => {
    const data = doc.data();
    if (data.test) return; // Skip test emails
    
    metrics.totalSent++;
    
    const createdAt = data.createdAt?.toDate() || new Date();
    const dayKey = createdAt.toISOString().slice(0, 10);
    
    // Initialize day data
    if (!metrics.series.has(dayKey)) {
      metrics.series.set(dayKey, {
        date: dayKey,
        sent: 0, delivered: 0, bounced: 0, complaints: 0,
        softBounces: 0, hardBounces: 0, blocked: 0
      });
    }
    
    const dayData = metrics.series.get(dayKey);
    dayData.sent++;
    
    // Status analysis
    switch (data.status) {
      case 'delivered':
        metrics.delivered++;
        dayData.delivered++;
        break;
      case 'bounced':
        metrics.bounced++;
        dayData.bounced++;
        
        // Classify bounce type
        if (data.bounceType === 'hard' || data.bounceReason?.includes('permanent')) {
          metrics.hardBounces++;
          dayData.hardBounces++;
        } else {
          metrics.softBounces++;
          dayData.softBounces++;
        }
        break;
      case 'blocked':
        metrics.blocked++;
        dayData.blocked++;
        break;
      case 'deferred':
        metrics.deferred++;
        break;
    }
    
    // Complaints and unsubscribes
    if (data.complaints > 0) {
      metrics.complaints += data.complaints;
      dayData.complaints += data.complaints;
    }
    
    if (data.unsubscribes > 0) {
      metrics.unsubscribes += data.unsubscribes;
    }
    
    // Provider analysis
    const domain = data.to ? data.to.split('@')[1]?.toLowerCase() : 'unknown';
    const provider = classifyEmailProvider(domain);
    const providerData = metrics.providerBreakdown.get(provider) || {
      provider,
      sent: 0, delivered: 0, bounced: 0, complaints: 0,
      deliveryRate: 0, bounceRate: 0, complaintRate: 0
    };
    
    providerData.sent++;
    if (data.status === 'delivered') providerData.delivered++;
    if (data.status === 'bounced') providerData.bounced++;
    if (data.complaints > 0) providerData.complaints += data.complaints;
    
    // Calculate rates
    providerData.deliveryRate = providerData.sent > 0 ? (providerData.delivered / providerData.sent) * 100 : 0;
    providerData.bounceRate = providerData.sent > 0 ? (providerData.bounced / providerData.sent) * 100 : 0;
    providerData.complaintRate = providerData.sent > 0 ? (providerData.complaints / providerData.sent) * 100 : 0;
    
    metrics.providerBreakdown.set(provider, providerData);
    
    // Authentication analysis
    if (data.spfResult) {
      const result = data.spfResult.toLowerCase();
      if (result.includes('pass')) metrics.authenticationStatus.spf.pass++;
      else if (result.includes('fail')) metrics.authenticationStatus.spf.fail++;
      else metrics.authenticationStatus.spf.unknown++;
    }
    
    if (data.dkimResult) {
      const result = data.dkimResult.toLowerCase();
      if (result.includes('pass')) metrics.authenticationStatus.dkim.pass++;
      else if (result.includes('fail')) metrics.authenticationStatus.dkim.fail++;
      else metrics.authenticationStatus.dkim.unknown++;
    }
    
    if (data.dmarcResult) {
      const result = data.dmarcResult.toLowerCase();
      if (result.includes('pass')) metrics.authenticationStatus.dmarc.pass++;
      else if (result.includes('fail')) metrics.authenticationStatus.dmarc.fail++;
      else metrics.authenticationStatus.dmarc.unknown++;
    }
    
    // IP reputation tracking
    if (data.sendingIp) {
      const ipData = metrics.ipReputation.get(data.sendingIp) || {
        ip: data.sendingIp,
        sent: 0, delivered: 0, bounced: 0, complaints: 0
      };
      ipData.sent++;
      if (data.status === 'delivered') ipData.delivered++;
      if (data.status === 'bounced') ipData.bounced++;
      if (data.complaints > 0) ipData.complaints += data.complaints;
      metrics.ipReputation.set(data.sendingIp, ipData);
    }
    
    // Engagement analysis
    if (data.firstOpenAt) {
      const timeToOpen = (data.firstOpenAt.toDate() - createdAt) / (1000 * 60); // minutes
      
      if (timeToOpen <= 60) {
        metrics.engagementMetrics.quickOpens++;
      } else if (timeToOpen >= 1440) {
        metrics.engagementMetrics.delayedOpens++;
      }
      
      if (metrics.engagementMetrics.avgTimeToOpen === 0) {
        metrics.engagementMetrics.avgTimeToOpen = timeToOpen;
      } else {
        metrics.engagementMetrics.avgTimeToOpen = 
          (metrics.engagementMetrics.avgTimeToOpen + timeToOpen) / 2;
      }
    }
    
    // Device analysis
    if (data.deviceInfo?.type === 'mobile') {
      metrics.engagementMetrics.mobileOpens++;
    } else if (data.deviceInfo?.type === 'desktop') {
      metrics.engagementMetrics.desktopOpens++;
    }
    
    // Subject line analysis
    if (data.subject && data.status === 'blocked') {
      analyzeSubjectLine(data.subject, metrics.subjectLineIssues);
    }
  });
  
  // Calculate overall rates
  metrics.deliveryRate = metrics.totalSent > 0 ? (metrics.delivered / metrics.totalSent) * 100 : 0;
  metrics.bounceRate = metrics.totalSent > 0 ? (metrics.bounced / metrics.totalSent) * 100 : 0;
  metrics.complaintRate = metrics.totalSent > 0 ? (metrics.complaints / metrics.totalSent) * 100 : 0;
  metrics.unsubscribeRate = metrics.totalSent > 0 ? (metrics.unsubscribes / metrics.totalSent) * 100 : 0;
  
  // Calculate engagement score
  const totalEngagement = metrics.engagementMetrics.quickOpens + 
                          metrics.engagementMetrics.delayedOpens;
  if (totalEngagement > 0) {
    metrics.engagementMetrics.engagementScore = 
      (metrics.engagementMetrics.quickOpens / totalEngagement) * 100;
  }
  
  // Convert maps to arrays
  metrics.series = Array.from(metrics.series.values()).sort((a, b) => a.date.localeCompare(b.date));
  metrics.providerBreakdown = Array.from(metrics.providerBreakdown.values())
    .sort((a, b) => b.sent - a.sent);
  metrics.ipReputation = Array.from(metrics.ipReputation.values());
  
  // Process suppressions
  const suppressions = {
    total: suppressionsSnap.size,
    byReason: new Map(),
    recentTrends: new Map()
  };
  
  suppressionsSnap.forEach(doc => {
    const data = doc.data();
    const reason = data.reason || 'unknown';
    const count = suppressions.byReason.get(reason) || 0;
    suppressions.byReason.set(reason, count + 1);
    
    // Track suppression trends
    const createdAt = data.createdAt?.toDate() || new Date();
    const dayKey = createdAt.toISOString().slice(0, 10);
    const dayCount = suppressions.recentTrends.get(dayKey) || 0;
    suppressions.recentTrends.set(dayKey, dayCount + 1);
  });
  
  metrics.suppressions = {
    ...suppressions,
    byReason: Array.from(suppressions.byReason.entries()).map(([reason, count]) => ({ reason, count })),
    recentTrends: Array.from(suppressions.recentTrends.entries()).map(([date, count]) => ({ date, count }))
  };
  
  return metrics;
}

function classifyEmailProvider(domain) {
  const providers = {
    'gmail.com': 'Gmail',
    'googlemail.com': 'Gmail',
    'yahoo.com': 'Yahoo',
    'ymail.com': 'Yahoo',
    'hotmail.com': 'Microsoft',
    'outlook.com': 'Microsoft',
    'live.com': 'Microsoft',
    'msn.com': 'Microsoft',
    'aol.com': 'AOL',
    'icloud.com': 'Apple',
    'me.com': 'Apple',
    'mac.com': 'Apple'
  };
  
  return providers[domain] || 'Other';
}

function analyzeSubjectLine(subject, issues) {
  const spamWords = [
    'free', 'urgent', 'limited time', 'act now', 'guaranteed', 'no risk',
    'winner', 'congratulations', 'cash', 'money', 'credit', 'loan'
  ];
  
  const foundSpamWords = spamWords.filter(word => 
    subject.toLowerCase().includes(word.toLowerCase())
  );
  
  if (foundSpamWords.length > 0) {
    issues.push({
      subject,
      issue: 'Spam words detected',
      words: foundSpamWords,
      severity: foundSpamWords.length > 2 ? 'high' : 'medium'
    });
  }
  
  if (subject.length > 60) {
    issues.push({
      subject,
      issue: 'Subject line too long',
      length: subject.length,
      severity: 'low'
    });
  }
  
  if (/[!]{2,}/.test(subject) || /[?]{2,}/.test(subject)) {
    issues.push({
      subject,
      issue: 'Excessive punctuation',
      severity: 'medium'
    });
  }
}

function calculateReputationScore(metrics) {
  let score = 100;
  
  // Delivery rate impact (40% weight)
  const deliveryPenalty = Math.max(0, 95 - metrics.deliveryRate) * 0.4;
  score -= deliveryPenalty;
  
  // Bounce rate impact (25% weight)
  const bouncePenalty = Math.max(0, metrics.bounceRate - 2) * 2.5;
  score -= bouncePenalty;
  
  // Complaint rate impact (20% weight)
  const complaintPenalty = Math.max(0, metrics.complaintRate - 0.1) * 20;
  score -= complaintPenalty;
  
  // Authentication failures (10% weight)
  const totalAuth = metrics.authenticationStatus.spf.pass + metrics.authenticationStatus.spf.fail + metrics.authenticationStatus.spf.unknown;
  if (totalAuth > 0) {
    const authFailRate = (metrics.authenticationStatus.spf.fail / totalAuth) * 100;
    const authPenalty = Math.max(0, authFailRate - 5) * 0.1;
    score -= authPenalty;
  }
  
  // Engagement bonus (5% weight)
  if (metrics.engagementMetrics.engagementScore > 70) {
    score += 2;
  } else if (metrics.engagementMetrics.engagementScore < 30) {
    score -= 2;
  }
  
  return {
    overall: Math.max(0, Math.min(100, Math.round(score))),
    factors: {
      delivery: Math.max(0, 100 - deliveryPenalty * 2.5),
      bounces: Math.max(0, 100 - bouncePenalty * 4),
      complaints: Math.max(0, 100 - complaintPenalty * 5),
      authentication: totalAuth > 0 ? Math.max(0, 100 - (authFailRate * 2)) : 100,
      engagement: metrics.engagementMetrics.engagementScore
    },
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
  };
}

function generateDeliverabilityInsights(metrics) {
  const insights = [];
  
  // Delivery rate insights
  if (metrics.deliveryRate < 95) {
    insights.push({
      type: 'warning',
      category: 'Delivery',
      title: 'Low Delivery Rate',
      message: `${metrics.deliveryRate.toFixed(1)}% delivery rate is below optimal (>95%)`,
      impact: 'high',
      metric: 'deliveryRate',
      value: metrics.deliveryRate
    });
  }
  
  // Bounce rate insights
  if (metrics.bounceRate > 5) {
    insights.push({
      type: 'error',
      category: 'Bounces',
      title: 'High Bounce Rate',
      message: `${metrics.bounceRate.toFixed(1)}% bounce rate indicates list quality issues`,
      impact: 'high',
      metric: 'bounceRate',
      value: metrics.bounceRate
    });
  }
  
  // Complaint rate insights
  if (metrics.complaintRate > 0.5) {
    insights.push({
      type: 'error',
      category: 'Complaints',
      title: 'High Complaint Rate',
      message: `${metrics.complaintRate.toFixed(2)}% complaint rate may harm sender reputation`,
      impact: 'critical',
      metric: 'complaintRate',
      value: metrics.complaintRate
    });
  }
  
  // Authentication insights
  const totalSpf = metrics.authenticationStatus.spf.pass + metrics.authenticationStatus.spf.fail;
  if (totalSpf > 0 && metrics.authenticationStatus.spf.fail / totalSpf > 0.1) {
    insights.push({
      type: 'warning',
      category: 'Authentication',
      title: 'SPF Failures',
      message: `${Math.round((metrics.authenticationStatus.spf.fail / totalSpf) * 100)}% SPF failures detected`,
      impact: 'medium'
    });
  }
  
  // Provider-specific insights
  const gmailData = metrics.providerBreakdown.find(p => p.provider === 'Gmail');
  if (gmailData && gmailData.deliveryRate < 90) {
    insights.push({
      type: 'warning',
      category: 'Provider Issues',
      title: 'Gmail Delivery Issues',
      message: `Only ${gmailData.deliveryRate.toFixed(1)}% delivery rate to Gmail`,
      impact: 'high'
    });
  }
  
  // Engagement insights
  if (metrics.engagementMetrics.engagementScore < 30) {
    insights.push({
      type: 'info',
      category: 'Engagement',
      title: 'Low Engagement',
      message: `Only ${metrics.engagementMetrics.engagementScore.toFixed(1)}% of recipients engage quickly`,
      impact: 'medium'
    });
  }
  
  // Subject line insights
  if (metrics.subjectLineIssues.length > 0) {
    const highSeverityIssues = metrics.subjectLineIssues.filter(i => i.severity === 'high').length;
    if (highSeverityIssues > 0) {
      insights.push({
        type: 'warning',
        category: 'Content',
        title: 'Subject Line Issues',
        message: `${highSeverityIssues} high-risk subject lines detected`,
        impact: 'medium'
      });
    }
  }
  
  return insights;
}

function generateDeliverabilityRecommendations(metrics, reputation) {
  const recommendations = [];
  
  if (metrics.bounceRate > 3) {
    recommendations.push({
      priority: 'high',
      category: 'List Management',
      title: 'Clean Your Email List',
      description: 'High bounce rates indicate outdated or invalid email addresses.',
      actions: [
        'Remove hard bounced emails immediately',
        'Implement double opt-in for new subscribers',
        'Use email validation service before sending',
        'Monitor soft bounces and remove after 3-5 attempts'
      ],
      expectedImpact: 'Reduce bounce rate by 2-3%',
      effort: 'Low'
    });
  }
  
  if (metrics.complaintRate > 0.1) {
    recommendations.push({
      priority: 'critical',
      category: 'Content & Permissions',
      title: 'Reduce Spam Complaints',
      description: 'High complaint rates can severely damage sender reputation.',
      actions: [
        'Review email content for spam trigger words',
        'Ensure clear unsubscribe links',
        'Send only to engaged subscribers',
        'Implement preference center for content types'
      ],
      expectedImpact: 'Improve reputation score by 10-15 points',
      effort: 'Medium'
    });
  }
  
  if (reputation.factors.authentication < 90) {
    recommendations.push({
      priority: 'high',
      category: 'Authentication',
      title: 'Fix Email Authentication',
      description: 'Authentication failures impact deliverability across all providers.',
      actions: [
        'Verify SPF record includes all sending IPs',
        'Ensure DKIM signatures are properly configured',
        'Implement DMARC policy (start with p=none)',
        'Monitor authentication reports regularly'
      ],
      expectedImpact: 'Improve deliverability by 3-5%',
      effort: 'Medium'
    });
  }
  
  if (metrics.engagementMetrics.engagementScore < 40) {
    recommendations.push({
      priority: 'medium',
      category: 'Engagement',
      title: 'Improve Email Engagement',
      description: 'Low engagement signals to providers that content may not be wanted.',
      actions: [
        'Segment lists based on engagement history',
        'A/B test send times and content',
        'Remove inactive subscribers (6+ months)',
        'Optimize for mobile devices (60%+ mobile opens)'
      ],
      expectedImpact: 'Increase engagement by 15-20%',
      effort: 'High'
    });
  }
  
  // Provider-specific recommendations
  const outlierProviders = metrics.providerBreakdown.filter(p => 
    p.deliveryRate < metrics.deliveryRate - 10 && p.sent > 10
  );
  
  if (outlierProviders.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'Provider Relations',
      title: 'Address Provider-Specific Issues',
      description: `${outlierProviders.map(p => p.provider).join(', ')} showing lower delivery rates.`,
      actions: [
        'Monitor provider-specific feedback loops',
        'Review content for provider-specific filters',
        'Consider warming up IP reputation with gradual volume increases',
        'Contact provider support for persistent issues'
      ],
      expectedImpact: 'Normalize delivery rates across providers',
      effort: 'High'
    });
  }
  
  if (metrics.subjectLineIssues.filter(i => i.severity === 'high').length > 0) {
    recommendations.push({
      priority: 'low',
      category: 'Content Optimization',
      title: 'Optimize Subject Lines',
      description: 'Several subject lines contain potential spam indicators.',
      actions: [
        'Avoid excessive capitalization and punctuation',
        'Remove or replace spam trigger words',
        'Keep subject lines under 50 characters',
        'A/B test subject line variations'
      ],
      expectedImpact: 'Reduce blocked emails by 1-2%',
      effort: 'Low'
    });
  }
  
  return recommendations.sort((a, b) => {
    const priority = { critical: 4, high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}

function getIndustryBenchmarks() {
  return {
    deliveryRate: { excellent: 95, good: 90, average: 85, poor: 80 },
    bounceRate: { excellent: 2, good: 5, average: 8, poor: 10 },
    complaintRate: { excellent: 0.1, good: 0.3, average: 0.5, poor: 1.0 },
    unsubscribeRate: { excellent: 0.2, good: 0.5, average: 1.0, poor: 2.0 },
    reputationScore: { excellent: 90, good: 80, average: 70, poor: 60 }
  };
}
