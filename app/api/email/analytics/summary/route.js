import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Enhanced Email Analytics with Advanced Insights
// GET /api/email/analytics/summary?siteId=...&days=30&compareToEnd=...&segments=...
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const days = Math.min(Number(url.searchParams.get('days')) || 30, 90);
    const compareToEnd = url.searchParams.get('compareToEnd'); // Compare to previous period
    const segments = url.searchParams.get('segments')?.split(',') || []; // Segmentation options
    
    if (!siteId) return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
    
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get current period data
    const currentSnap = await adminDb.collection('emailMessages')
      .where('siteId', '==', siteId)
      .where('createdAt', '>=', since)
      .get();
    
    // Get comparison period data if requested
    let comparisonSnap = null;
    if (compareToEnd) {
      const comparisonSince = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000);
      const comparisonUntil = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      comparisonSnap = await adminDb.collection('emailMessages')
        .where('siteId', '==', siteId)
        .where('createdAt', '>=', comparisonSince)
        .where('createdAt', '<', comparisonUntil)
        .get();
    }
    
    // Process current period
    const currentPeriod = processEmailData(currentSnap, days, since);
    
    // Process comparison period
    let comparisonPeriod = null;
    if (comparisonSnap) {
      const comparisonSince = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000);
      comparisonPeriod = processEmailData(comparisonSnap, days, comparisonSince);
    }
    
    // Calculate insights and predictions
    const insights = calculateInsights(currentPeriod, comparisonPeriod);
    const predictions = calculatePredictions(currentPeriod.series);
    const segmentation = calculateSegmentation(currentPeriod, segments);
    const heatmap = calculateSendTimeHeatmap(currentSnap);
    
    return NextResponse.json({
      ok: true,
      period: {
        days,
        since: since.toISOString(),
        until: new Date().toISOString()
      },
      current: currentPeriod,
      comparison: comparisonPeriod,
      insights,
      predictions,
      segmentation,
      heatmap,
      recommendations: generateRecommendations(currentPeriod, insights)
    });
  } catch (e) {
    console.error('Email analytics error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

function processEmailData(snap, days, since) {
  const byDay = new Map();
  const templateAgg = new Map();
  const deviceAgg = new Map();
  const locationAgg = new Map();
  const subjectAnalysis = new Map();
  
  let totalSent = 0, totalOpens = 0, totalClicks = 0, totalBounced = 0, totalDelivered = 0;
  let uniqueOpens = 0, uniqueClicks = 0, totalComplaints = 0;
  let totalUnsubscribes = 0;
  
  const uniqueOpenEmails = new Set();
  const uniqueClickEmails = new Set();
  
  snap.forEach(doc => {
    const d = doc.data();
    if (d.test) return; // exclude test sends from main analytics
    
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : 
                   (d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : null);
    if (!created) return;
    
    const dayKey = created.toISOString().slice(0, 10);
    const rec = byDay.get(dayKey) || {
      date: dayKey,
      sent: 0, opens: 0, clicks: 0, bounced: 0, delivered: 0, complaints: 0, unsubscribes: 0,
      uniqueOpens: 0, uniqueClicks: 0
    };
    
    // Basic metrics
    rec.sent += 1;
    totalSent += 1;
    
    // Delivery tracking
    if (d.status === 'delivered') {
      rec.delivered += 1;
      totalDelivered += 1;
    } else if (d.status === 'bounced') {
      rec.bounced += 1;
      totalBounced += 1;
    }
    
    // Engagement tracking with deduplication
    const recipientEmail = d.to?.toLowerCase();
    if (d.opensCount && recipientEmail) {
      rec.opens += d.opensCount;
      totalOpens += d.opensCount;
      if (!uniqueOpenEmails.has(recipientEmail)) {
        uniqueOpenEmails.add(recipientEmail);
        rec.uniqueOpens += 1;
      }
    }
    
    if (d.clicksCount && recipientEmail) {
      rec.clicks += d.clicksCount;
      totalClicks += d.clicksCount;
      if (!uniqueClickEmails.has(recipientEmail)) {
        uniqueClickEmails.add(recipientEmail);
        rec.uniqueClicks += 1;
      }
    }
    
    // Complaint and unsubscribe tracking
    if (d.complaints) {
      rec.complaints += d.complaints;
      totalComplaints += d.complaints;
    }
    if (d.unsubscribes) {
      rec.unsubscribes += d.unsubscribes;
      totalUnsubscribes += d.unsubscribes;
    }
    
    byDay.set(dayKey, rec);
    
    // Template performance analysis
    if (d.templateKey) {
      const t = templateAgg.get(d.templateKey) || {
        templateKey: d.templateKey,
        sent: 0, opens: 0, clicks: 0, bounced: 0, delivered: 0,
        uniqueOpens: 0, uniqueClicks: 0, complaints: 0, unsubscribes: 0,
        avgTimeToOpen: 0, avgTimeToClick: 0
      };
      
      t.sent += 1;
      t.opens += d.opensCount || 0;
      t.clicks += d.clicksCount || 0;
      if (d.opensCount && recipientEmail) t.uniqueOpens += 1;
      if (d.clicksCount && recipientEmail) t.uniqueClicks += 1;
      if (d.status === 'bounced') t.bounced += 1;
      if (d.status === 'delivered') t.delivered += 1;
      t.complaints += d.complaints || 0;
      t.unsubscribes += d.unsubscribes || 0;
      
      // Calculate engagement timing
      if (d.firstOpenAt && created) {
        const timeToOpen = (d.firstOpenAt.toDate() - created) / (1000 * 60); // minutes
        t.avgTimeToOpen = ((t.avgTimeToOpen * (t.sent - 1)) + timeToOpen) / t.sent;
      }
      if (d.firstClickAt && created) {
        const timeToClick = (d.firstClickAt.toDate() - created) / (1000 * 60); // minutes
        t.avgTimeToClick = ((t.avgTimeToClick * (t.sent - 1)) + timeToClick) / t.sent;
      }
      
      templateAgg.set(d.templateKey, t);
    }
    
    // Device and location analysis
    if (d.deviceInfo) {
      const device = d.deviceInfo.type || 'unknown';
      const count = deviceAgg.get(device) || 0;
      deviceAgg.set(device, count + 1);
    }
    
    if (d.geoInfo) {
      const location = d.geoInfo.country || 'unknown';
      const count = locationAgg.get(location) || 0;
      locationAgg.set(location, count + 1);
    }
    
    // Subject line analysis
    if (d.subject) {
      const subjectKey = d.subject;
      const existing = subjectAnalysis.get(subjectKey) || {
        subject: subjectKey,
        sent: 0, opens: 0, clicks: 0,
        openRate: 0, clickRate: 0
      };
      existing.sent += 1;
      existing.opens += d.opensCount || 0;
      existing.clicks += d.clicksCount || 0;
      existing.openRate = existing.sent > 0 ? (existing.opens / existing.sent) * 100 : 0;
      existing.clickRate = existing.sent > 0 ? (existing.clicks / existing.sent) * 100 : 0;
      subjectAnalysis.set(subjectKey, existing);
    }
  });
  
  uniqueOpens = uniqueOpenEmails.size;
  uniqueClicks = uniqueClickEmails.size;
  
  // Fill in missing days with zero data
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    const existing = byDay.get(dayKey);
    series.push(existing || {
      date: dayKey,
      sent: 0, opens: 0, clicks: 0, bounced: 0, delivered: 0, 
      complaints: 0, unsubscribes: 0, uniqueOpens: 0, uniqueClicks: 0
    });
  }
  
  // Calculate rates
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0;
  const bounceRate = totalSent > 0 ? Math.round((totalBounced / totalSent) * 1000) / 10 : 0;
  const openRate = totalSent > 0 ? Math.round((uniqueOpens / totalSent) * 1000) / 10 : 0;
  const clickRate = totalSent > 0 ? Math.round((uniqueClicks / totalSent) * 1000) / 10 : 0;
  const complaintRate = totalSent > 0 ? Math.round((totalComplaints / totalSent) * 1000) / 10 : 0;
  const unsubscribeRate = totalSent > 0 ? Math.round((totalUnsubscribes / totalSent) * 1000) / 10 : 0;
  
  return {
    totalSent,
    totalOpens,
    totalClicks,
    totalBounced,
    totalDelivered,
    totalComplaints,
    totalUnsubscribes,
    uniqueOpens,
    uniqueClicks,
    deliveryRate,
    bounceRate,
    openRate,
    clickRate,
    complaintRate,
    unsubscribeRate,
    series: series.sort((a, b) => a.date.localeCompare(b.date)),
    templates: Array.from(templateAgg.values()).sort((a, b) => b.sent - a.sent),
    devices: Array.from(deviceAgg.entries()).map(([device, count]) => ({ device, count })),
    locations: Array.from(locationAgg.entries()).map(([country, count]) => ({ country, count })),
    subjects: Array.from(subjectAnalysis.values()).sort((a, b) => b.openRate - a.openRate).slice(0, 10)
  };
}

function calculateInsights(current, comparison) {
  const insights = [];
  
  if (comparison) {
    // Performance comparisons
    const openRateChange = current.openRate - comparison.openRate;
    const clickRateChange = current.clickRate - comparison.clickRate;
    const bounceRateChange = current.bounceRate - comparison.bounceRate;
    
    if (Math.abs(openRateChange) > 2) {
      insights.push({
        type: openRateChange > 0 ? 'positive' : 'negative',
        metric: 'Open Rate',
        change: openRateChange,
        message: `Open rate ${openRateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(openRateChange).toFixed(1)}% compared to previous period`
      });
    }
    
    if (Math.abs(clickRateChange) > 1) {
      insights.push({
        type: clickRateChange > 0 ? 'positive' : 'negative',
        metric: 'Click Rate',
        change: clickRateChange,
        message: `Click rate ${clickRateChange > 0 ? 'improved' : 'declined'} by ${Math.abs(clickRateChange).toFixed(1)}% from last period`
      });
    }
    
    if (Math.abs(bounceRateChange) > 1) {
      insights.push({
        type: bounceRateChange < 0 ? 'positive' : 'negative',
        metric: 'Bounce Rate',
        change: bounceRateChange,
        message: `Bounce rate ${bounceRateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(bounceRateChange).toFixed(1)}%`
      });
    }
  }
  
  // Performance benchmarks
  if (current.openRate > 25) {
    insights.push({
      type: 'positive',
      metric: 'Open Rate',
      message: `Excellent open rate of ${current.openRate}% (industry average: 20-25%)`
    });
  } else if (current.openRate < 15) {
    insights.push({
      type: 'negative',
      metric: 'Open Rate',
      message: `Open rate of ${current.openRate}% is below industry average (20-25%)`
    });
  }
  
  if (current.clickRate > 3) {
    insights.push({
      type: 'positive',
      metric: 'Click Rate',
      message: `Strong click rate of ${current.clickRate}% (industry average: 2-3%)`
    });
  }
  
  if (current.bounceRate > 5) {
    insights.push({
      type: 'warning',
      metric: 'Bounce Rate',
      message: `Bounce rate of ${current.bounceRate}% is high - consider list cleaning`
    });
  }
  
  // Template performance insights
  const bestTemplate = current.templates[0];
  if (bestTemplate && bestTemplate.sent > 5) {
    const templateOpenRate = (bestTemplate.uniqueOpens / bestTemplate.sent) * 100;
    if (templateOpenRate > current.openRate * 1.2) {
      insights.push({
        type: 'positive',
        metric: 'Template Performance',
        message: `Template "${bestTemplate.templateKey}" is performing ${Math.round(templateOpenRate - current.openRate)}% better than average`
      });
    }
  }
  
  return insights;
}

function calculatePredictions(series) {
  if (series.length < 7) return null;
  
  // Simple trend analysis for next 7 days
  const recentData = series.slice(-7);
  const avgSent = recentData.reduce((sum, day) => sum + day.sent, 0) / recentData.length;
  const avgOpenRate = recentData.reduce((sum, day) => {
    const rate = day.sent > 0 ? (day.uniqueOpens / day.sent) * 100 : 0;
    return sum + rate;
  }, 0) / recentData.length;
  
  // Calculate trend direction
  const firstHalf = recentData.slice(0, 3).reduce((sum, day) => sum + day.sent, 0) / 3;
  const secondHalf = recentData.slice(-3).reduce((sum, day) => sum + day.sent, 0) / 3;
  const trend = secondHalf > firstHalf ? 'increasing' : secondHalf < firstHalf ? 'decreasing' : 'stable';
  
  return {
    predictedDailySent: Math.round(avgSent),
    predictedOpenRate: Math.round(avgOpenRate * 10) / 10,
    trend,
    confidence: series.length > 14 ? 'high' : series.length > 7 ? 'medium' : 'low'
  };
}

function calculateSegmentation(current, segments) {
  if (segments.length === 0) return null;
  
  const segmentData = {};
  
  if (segments.includes('template')) {
    segmentData.byTemplate = current.templates.map(t => ({
      name: t.templateKey,
      sent: t.sent,
      openRate: t.sent > 0 ? Math.round((t.uniqueOpens / t.sent) * 1000) / 10 : 0,
      clickRate: t.sent > 0 ? Math.round((t.uniqueClicks / t.sent) * 1000) / 10 : 0
    }));
  }
  
  if (segments.includes('device')) {
    segmentData.byDevice = current.devices;
  }
  
  if (segments.includes('location')) {
    segmentData.byLocation = current.locations;
  }
  
  return segmentData;
}

function calculateSendTimeHeatmap(snap) {
  const hourMap = new Map();
  const dayMap = new Map();
  
  snap.forEach(doc => {
    const d = doc.data();
    if (d.test) return;
    
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : 
                   (d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : null);
    if (!created) return;
    
    const hour = created.getHours();
    const day = created.getDay(); // 0 = Sunday
    
    const hourCount = hourMap.get(hour) || 0;
    hourMap.set(hour, hourCount + 1);
    
    const dayCount = dayMap.get(day) || 0;
    dayMap.set(day, dayCount + 1);
  });
  
  return {
    byHour: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourMap.get(i) || 0
    })),
    byDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, i) => ({
      day: name,
      count: dayMap.get(i) || 0
    }))
  };
}

function generateRecommendations(current, insights) {
  const recommendations = [];
  
  // Performance-based recommendations
  if (current.openRate < 20) {
    recommendations.push({
      priority: 'high',
      category: 'Subject Lines',
      title: 'Improve Subject Lines',
      description: 'Your open rate is below average. Try A/B testing different subject line styles.',
      action: 'Create more compelling, personalized subject lines'
    });
  }
  
  if (current.clickRate < 2) {
    recommendations.push({
      priority: 'medium',
      category: 'Content',
      title: 'Enhance Email Content',
      description: 'Low click rates suggest content may not be engaging enough.',
      action: 'Include clear CTAs and more relevant content'
    });
  }
  
  if (current.bounceRate > 3) {
    recommendations.push({
      priority: 'high',
      category: 'List Quality',
      title: 'Clean Email List',
      description: 'High bounce rate indicates outdated email addresses.',
      action: 'Remove bounced emails and validate new subscriptions'
    });
  }
  
  // Template-based recommendations
  const topTemplate = current.templates[0];
  if (topTemplate && current.templates.length > 1) {
    const topTemplateRate = (topTemplate.uniqueOpens / topTemplate.sent) * 100;
    if (topTemplateRate > current.openRate * 1.5) {
      recommendations.push({
        priority: 'medium',
        category: 'Templates',
        title: 'Replicate Best Template',
        description: `Template "${topTemplate.templateKey}" is performing exceptionally well.`,
        action: 'Apply similar design and messaging to other templates'
      });
    }
  }
  
  // Timing recommendations
  if (current.series.length > 7) {
    const weekendSends = current.series.filter(day => {
      const d = new Date(day.date);
      const dayOfWeek = d.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });
    
    if (weekendSends.length > 0) {
      const weekendOpenRate = weekendSends.reduce((sum, day) => {
        return sum + (day.sent > 0 ? (day.uniqueOpens / day.sent) * 100 : 0);
      }, 0) / weekendSends.length;
      
      if (weekendOpenRate < current.openRate * 0.8) {
        recommendations.push({
          priority: 'low',
          category: 'Timing',
          title: 'Avoid Weekend Sends',
          description: 'Weekend emails show lower engagement rates.',
          action: 'Schedule sends for Tuesday-Thursday for better performance'
        });
      }
    }
  }
  
  return recommendations;
}