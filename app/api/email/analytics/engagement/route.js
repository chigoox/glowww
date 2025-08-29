import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Advanced Engagement & Cohort Analysis API
// GET /api/email/analytics/engagement?siteId=...&cohortType=monthly&includeChurn=true
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const cohortType = url.searchParams.get('cohortType') || 'monthly'; // weekly, monthly, quarterly
    const includeChurn = url.searchParams.get('includeChurn') !== 'false';
    const days = Math.min(Number(url.searchParams.get('days')) || 90, 365);
    
    if (!siteId) {
      return NextResponse.json({ ok: false, error: 'siteId required' }, { status: 400 });
    }
    
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get email messages for engagement analysis
    const messagesSnap = await adminDb.collection('emailMessages')
      .where('siteId', '==', siteId)
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .get();
    
    // Get subscriber data for cohort analysis
    const subscribersSnap = await adminDb.collection('emailSubscribers')
      .where('siteId', '==', siteId)
      .get();
    
    // Perform analyses
    const engagementAnalysis = analyzeEngagement(messagesSnap, days);
    const cohortAnalysis = analyzeCohorts(subscribersSnap, messagesSnap, cohortType);
    const churnAnalysis = includeChurn ? analyzeChurn(subscribersSnap, messagesSnap) : null;
    const segmentAnalysis = analyzeEngagementSegments(messagesSnap, subscribersSnap);
    const predictiveInsights = generatePredictiveInsights(engagementAnalysis, cohortAnalysis);
    
    return NextResponse.json({
      ok: true,
      period: {
        days,
        since: since.toISOString(),
        until: new Date().toISOString()
      },
      engagement: engagementAnalysis,
      cohorts: cohortAnalysis,
      churn: churnAnalysis,
      segments: segmentAnalysis,
      predictions: predictiveInsights,
      recommendations: generateEngagementRecommendations(engagementAnalysis, segmentAnalysis)
    });
  } catch (e) {
    console.error('Engagement analytics error:', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

function analyzeEngagement(messagesSnap, days) {
  const engagement = {
    totalEmails: 0,
    uniqueRecipients: new Set(),
    engagementMetrics: {
      opens: 0,
      clicks: 0,
      uniqueOpeners: new Set(),
      uniqueClickers: new Set(),
      multipleOpens: 0,
      multipleClicks: 0,
      forwardShares: 0
    },
    
    // Time-based engagement
    timeAnalysis: {
      hourlyPattern: new Array(24).fill(0).map((_, i) => ({ hour: i, opens: 0, clicks: 0 })),
      dailyPattern: new Array(7).fill(0).map((_, i) => ({ 
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], 
        opens: 0, clicks: 0 
      })),
      timeToEngagement: {
        immediate: 0, // < 1 hour
        quick: 0, // 1-6 hours
        delayed: 0, // 6-24 hours
        late: 0 // > 24 hours
      }
    },
    
    // Content performance
    contentAnalysis: {
      subjectLineLength: new Map(),
      contentTypes: new Map(),
      attachmentImpact: { withAttachments: { sent: 0, opens: 0 }, withoutAttachments: { sent: 0, opens: 0 } }
    },
    
    // Device and location insights
    deviceEngagement: new Map(),
    locationEngagement: new Map(),
    
    // Engagement decay over time
    engagementDecay: [],
    
    // Top performers
    topSubjects: [],
    topTemplates: []
  };
  
  const subjectPerformance = new Map();
  const templatePerformance = new Map();
  
  messagesSnap.forEach(doc => {
    const data = doc.data();
    if (data.test) return;
    
    engagement.totalEmails++;
    const recipientEmail = data.to?.toLowerCase();
    if (recipientEmail) {
      engagement.uniqueRecipients.add(recipientEmail);
    }
    
    const createdAt = data.createdAt?.toDate() || new Date();
    
    // Track engagement metrics
    const opens = data.opensCount || 0;
    const clicks = data.clicksCount || 0;
    
    engagement.engagementMetrics.opens += opens;
    engagement.engagementMetrics.clicks += clicks;
    
    if (opens > 0 && recipientEmail) {
      engagement.engagementMetrics.uniqueOpeners.add(recipientEmail);
      if (opens > 1) engagement.engagementMetrics.multipleOpens++;
    }
    
    if (clicks > 0 && recipientEmail) {
      engagement.engagementMetrics.uniqueClickers.add(recipientEmail);
      if (clicks > 1) engagement.engagementMetrics.multipleClicks++;
    }
    
    if (data.forwardCount > 0) {
      engagement.engagementMetrics.forwardShares += data.forwardCount;
    }
    
    // Time analysis
    if (data.firstOpenAt) {
      const firstOpen = data.firstOpenAt.toDate();
      const openHour = firstOpen.getHours();
      const openDay = firstOpen.getDay();
      
      engagement.timeAnalysis.hourlyPattern[openHour].opens++;
      engagement.timeAnalysis.dailyPattern[openDay].opens++;
      
      // Time to engagement
      const timeToOpen = (firstOpen - createdAt) / (1000 * 60 * 60); // hours
      if (timeToOpen < 1) engagement.timeAnalysis.timeToEngagement.immediate++;
      else if (timeToOpen < 6) engagement.timeAnalysis.timeToEngagement.quick++;
      else if (timeToOpen < 24) engagement.timeAnalysis.timeToEngagement.delayed++;
      else engagement.timeAnalysis.timeToEngagement.late++;
    }
    
    if (data.firstClickAt) {
      const firstClick = data.firstClickAt.toDate();
      const clickHour = firstClick.getHours();
      const clickDay = firstClick.getDay();
      
      engagement.timeAnalysis.hourlyPattern[clickHour].clicks++;
      engagement.timeAnalysis.dailyPattern[clickDay].clicks++;
    }
    
    // Content analysis
    if (data.subject) {
      const length = Math.floor(data.subject.length / 10) * 10; // Group by 10-char buckets
      const lengthData = engagement.contentAnalysis.subjectLineLength.get(length) || { length, sent: 0, opens: 0, clicks: 0 };
      lengthData.sent++;
      lengthData.opens += opens;
      lengthData.clicks += clicks;
      engagement.contentAnalysis.subjectLineLength.set(length, lengthData);
      
      // Track subject performance
      const subjectData = subjectPerformance.get(data.subject) || {
        subject: data.subject,
        sent: 0, opens: 0, clicks: 0, uniqueOpens: new Set(), uniqueClicks: new Set()
      };
      subjectData.sent++;
      subjectData.opens += opens;
      subjectData.clicks += clicks;
      if (opens > 0 && recipientEmail) subjectData.uniqueOpens.add(recipientEmail);
      if (clicks > 0 && recipientEmail) subjectData.uniqueClicks.add(recipientEmail);
      subjectPerformance.set(data.subject, subjectData);
    }
    
    // Template performance
    if (data.templateKey) {
      const templateData = templatePerformance.get(data.templateKey) || {
        template: data.templateKey,
        sent: 0, opens: 0, clicks: 0, uniqueOpens: new Set(), uniqueClicks: new Set()
      };
      templateData.sent++;
      templateData.opens += opens;
      templateData.clicks += clicks;
      if (opens > 0 && recipientEmail) templateData.uniqueOpens.add(recipientEmail);
      if (clicks > 0 && recipientEmail) templateData.uniqueClicks.add(recipientEmail);
      templatePerformance.set(data.templateKey, templateData);
    }
    
    // Attachment impact
    if (data.attachments && data.attachments.length > 0) {
      engagement.contentAnalysis.attachmentImpact.withAttachments.sent++;
      engagement.contentAnalysis.attachmentImpact.withAttachments.opens += opens;
    } else {
      engagement.contentAnalysis.attachmentImpact.withoutAttachments.sent++;
      engagement.contentAnalysis.attachmentImpact.withoutAttachments.opens += opens;
    }
    
    // Device and location engagement
    if (data.deviceInfo?.type && opens > 0) {
      const device = data.deviceInfo.type;
      const deviceData = engagement.deviceEngagement.get(device) || { device, opens: 0, clicks: 0, uniqueUsers: new Set() };
      deviceData.opens += opens;
      deviceData.clicks += clicks;
      if (recipientEmail) deviceData.uniqueUsers.add(recipientEmail);
      engagement.deviceEngagement.set(device, deviceData);
    }
    
    if (data.geoInfo?.country && opens > 0) {
      const country = data.geoInfo.country;
      const locationData = engagement.locationEngagement.get(country) || { country, opens: 0, clicks: 0, uniqueUsers: new Set() };
      locationData.opens += opens;
      locationData.clicks += clicks;
      if (recipientEmail) locationData.uniqueUsers.add(recipientEmail);
      engagement.locationEngagement.set(country, locationData);
    }
  });
  
  // Convert sets to counts
  engagement.engagementMetrics.uniqueOpeners = engagement.engagementMetrics.uniqueOpeners.size;
  engagement.engagementMetrics.uniqueClickers = engagement.engagementMetrics.uniqueClickers.size;
  engagement.uniqueRecipients = engagement.uniqueRecipients.size;
  
  // Convert maps to arrays and calculate rates
  engagement.contentAnalysis.subjectLineLength = Array.from(engagement.contentAnalysis.subjectLineLength.values())
    .map(item => ({
      ...item,
      openRate: item.sent > 0 ? (item.opens / item.sent) * 100 : 0,
      clickRate: item.sent > 0 ? (item.clicks / item.sent) * 100 : 0
    }))
    .sort((a, b) => a.length - b.length);
  
  engagement.deviceEngagement = Array.from(engagement.deviceEngagement.values())
    .map(item => ({
      ...item,
      uniqueUsers: item.uniqueUsers.size,
      avgOpensPerUser: item.uniqueUsers.size > 0 ? item.opens / item.uniqueUsers.size : 0
    }))
    .sort((a, b) => b.opens - a.opens);
  
  engagement.locationEngagement = Array.from(engagement.locationEngagement.values())
    .map(item => ({
      ...item,
      uniqueUsers: item.uniqueUsers.size,
      avgOpensPerUser: item.uniqueUsers.size > 0 ? item.opens / item.uniqueUsers.size : 0
    }))
    .sort((a, b) => b.opens - a.opens);
  
  // Top performers
  engagement.topSubjects = Array.from(subjectPerformance.values())
    .filter(s => s.sent >= 5) // Minimum volume for reliability
    .map(s => ({
      ...s,
      uniqueOpens: s.uniqueOpens.size,
      uniqueClicks: s.uniqueClicks.size,
      openRate: s.sent > 0 ? (s.uniqueOpens.size / s.sent) * 100 : 0,
      clickRate: s.sent > 0 ? (s.uniqueClicks.size / s.sent) * 100 : 0
    }))
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 10);
  
  engagement.topTemplates = Array.from(templatePerformance.values())
    .filter(t => t.sent >= 5)
    .map(t => ({
      ...t,
      uniqueOpens: t.uniqueOpens.size,
      uniqueClicks: t.uniqueClicks.size,
      openRate: t.sent > 0 ? (t.uniqueOpens.size / t.sent) * 100 : 0,
      clickRate: t.sent > 0 ? (t.uniqueClicks.size / t.sent) * 100 : 0
    }))
    .sort((a, b) => b.openRate - a.openRate)
    .slice(0, 10);
  
  return engagement;
}

function analyzeCohorts(subscribersSnap, messagesSnap, cohortType) {
  const cohorts = new Map();
  const subscriberEngagement = new Map();
  
  // Group subscribers by signup period
  subscribersSnap.forEach(doc => {
    const data = doc.data();
    const signupDate = data.createdAt?.toDate() || data.signupDate?.toDate();
    if (!signupDate) return;
    
    const cohortKey = getCohortKey(signupDate, cohortType);
    const cohort = cohorts.get(cohortKey) || {
      cohort: cohortKey,
      signupDate: signupDate,
      subscribers: new Set(),
      totalSignups: 0
    };
    
    cohort.subscribers.add(data.email?.toLowerCase());
    cohort.totalSignups++;
    cohorts.set(cohortKey, cohort);
    
    subscriberEngagement.set(data.email?.toLowerCase(), {
      email: data.email?.toLowerCase(),
      signupDate,
      cohort: cohortKey,
      totalEmails: 0,
      totalOpens: 0,
      totalClicks: 0,
      lastEngaged: null,
      engagementScore: 0
    });
  });
  
  // Track engagement by cohort
  messagesSnap.forEach(doc => {
    const data = doc.data();
    if (data.test) return;
    
    const recipient = data.to?.toLowerCase();
    const engagement = subscriberEngagement.get(recipient);
    if (!engagement) return;
    
    engagement.totalEmails++;
    engagement.totalOpens += data.opensCount || 0;
    engagement.totalClicks += data.clicksCount || 0;
    
    if (data.opensCount > 0 || data.clicksCount > 0) {
      engagement.lastEngaged = data.createdAt?.toDate() || new Date();
    }
    
    // Update cohort engagement
    const cohort = cohorts.get(engagement.cohort);
    if (cohort) {
      if (!cohort.engagement) {
        cohort.engagement = {
          totalEmails: 0,
          totalOpens: 0,
          totalClicks: 0,
          activeUsers: new Set(),
          engagedUsers: new Set()
        };
      }
      
      cohort.engagement.totalEmails++;
      cohort.engagement.totalOpens += data.opensCount || 0;
      cohort.engagement.totalClicks += data.clicksCount || 0;
      cohort.engagement.activeUsers.add(recipient);
      
      if (data.opensCount > 0 || data.clicksCount > 0) {
        cohort.engagement.engagedUsers.add(recipient);
      }
    }
  });
  
  // Calculate cohort metrics
  const cohortAnalysis = Array.from(cohorts.values())
    .filter(cohort => cohort.engagement)
    .map(cohort => {
      const activeRate = cohort.totalSignups > 0 ? 
        (cohort.engagement.activeUsers.size / cohort.totalSignups) * 100 : 0;
      const engagementRate = cohort.engagement.activeUsers.size > 0 ? 
        (cohort.engagement.engagedUsers.size / cohort.engagement.activeUsers.size) * 100 : 0;
      
      return {
        ...cohort,
        subscribers: cohort.subscribers.size,
        engagement: {
          ...cohort.engagement,
          activeUsers: cohort.engagement.activeUsers.size,
          engagedUsers: cohort.engagement.engagedUsers.size,
          activeRate,
          engagementRate,
          avgEmailsPerUser: cohort.engagement.activeUsers.size > 0 ? 
            cohort.engagement.totalEmails / cohort.engagement.activeUsers.size : 0,
          avgOpensPerUser: cohort.engagement.activeUsers.size > 0 ? 
            cohort.engagement.totalOpens / cohort.engagement.activeUsers.size : 0
        }
      };
    })
    .sort((a, b) => new Date(a.signupDate) - new Date(b.signupDate));
  
  return {
    cohorts: cohortAnalysis,
    summary: {
      totalCohorts: cohortAnalysis.length,
      avgActiveRate: cohortAnalysis.reduce((sum, c) => sum + c.engagement.activeRate, 0) / cohortAnalysis.length || 0,
      avgEngagementRate: cohortAnalysis.reduce((sum, c) => sum + c.engagement.engagementRate, 0) / cohortAnalysis.length || 0,
      bestCohort: cohortAnalysis.reduce((best, current) => 
        current.engagement.engagementRate > (best?.engagement.engagementRate || 0) ? current : best, null
      ),
      worstCohort: cohortAnalysis.reduce((worst, current) => 
        current.engagement.engagementRate < (worst?.engagement.engagementRate || 100) ? current : worst, null
      )
    }
  };
}

function analyzeChurn(subscribersSnap, messagesSnap) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  
  const subscribers = new Map();
  
  // Initialize subscriber data
  subscribersSnap.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      subscribers.set(data.email.toLowerCase(), {
        email: data.email.toLowerCase(),
        signupDate: data.createdAt?.toDate() || data.signupDate?.toDate(),
        status: data.status || 'active',
        lastEngaged: null,
        totalEmails: 0,
        totalOpens: 0,
        totalClicks: 0,
        engagementScore: 0
      });
    }
  });
  
  // Track engagement
  messagesSnap.forEach(doc => {
    const data = doc.data();
    if (data.test) return;
    
    const subscriber = subscribers.get(data.to?.toLowerCase());
    if (!subscriber) return;
    
    subscriber.totalEmails++;
    subscriber.totalOpens += data.opensCount || 0;
    subscriber.totalClicks += data.clicksCount || 0;
    
    if (data.opensCount > 0 || data.clicksCount > 0) {
      const engagementDate = data.createdAt?.toDate() || new Date();
      if (!subscriber.lastEngaged || engagementDate > subscriber.lastEngaged) {
        subscriber.lastEngaged = engagementDate;
      }
    }
  });
  
  // Calculate engagement scores and classify subscribers
  const classifications = {
    active: [], // Engaged in last 30 days
    atRisk: [], // No engagement 30-60 days
    inactive: [], // No engagement 60-90 days
    churned: [], // No engagement 90+ days
    unsubscribed: [] // Explicitly unsubscribed
  };
  
  subscribers.forEach(subscriber => {
    // Calculate engagement score
    subscriber.engagementScore = subscriber.totalEmails > 0 ? 
      ((subscriber.totalOpens + subscriber.totalClicks * 2) / subscriber.totalEmails) * 100 : 0;
    
    if (subscriber.status === 'unsubscribed') {
      classifications.unsubscribed.push(subscriber);
    } else if (!subscriber.lastEngaged) {
      classifications.churned.push(subscriber);
    } else if (subscriber.lastEngaged > thirtyDaysAgo) {
      classifications.active.push(subscriber);
    } else if (subscriber.lastEngaged > sixtyDaysAgo) {
      classifications.atRisk.push(subscriber);
    } else if (subscriber.lastEngaged > ninetyDaysAgo) {
      classifications.inactive.push(subscriber);
    } else {
      classifications.churned.push(subscriber);
    }
  });
  
  const totalSubscribers = subscribers.size;
  
  return {
    total: totalSubscribers,
    classifications: {
      active: {
        count: classifications.active.length,
        percentage: totalSubscribers > 0 ? (classifications.active.length / totalSubscribers) * 100 : 0,
        avgEngagementScore: classifications.active.reduce((sum, s) => sum + s.engagementScore, 0) / classifications.active.length || 0
      },
      atRisk: {
        count: classifications.atRisk.length,
        percentage: totalSubscribers > 0 ? (classifications.atRisk.length / totalSubscribers) * 100 : 0,
        avgEngagementScore: classifications.atRisk.reduce((sum, s) => sum + s.engagementScore, 0) / classifications.atRisk.length || 0
      },
      inactive: {
        count: classifications.inactive.length,
        percentage: totalSubscribers > 0 ? (classifications.inactive.length / totalSubscribers) * 100 : 0,
        avgEngagementScore: classifications.inactive.reduce((sum, s) => sum + s.engagementScore, 0) / classifications.inactive.length || 0
      },
      churned: {
        count: classifications.churned.length,
        percentage: totalSubscribers > 0 ? (classifications.churned.length / totalSubscribers) * 100 : 0,
        avgEngagementScore: classifications.churned.reduce((sum, s) => sum + s.engagementScore, 0) / classifications.churned.length || 0
      },
      unsubscribed: {
        count: classifications.unsubscribed.length,
        percentage: totalSubscribers > 0 ? (classifications.unsubscribed.length / totalSubscribers) * 100 : 0
      }
    },
    churnRate: {
      monthly: totalSubscribers > 0 ? ((classifications.atRisk.length + classifications.inactive.length + classifications.churned.length) / totalSubscribers) * 100 : 0,
      quarterly: totalSubscribers > 0 ? (classifications.churned.length / totalSubscribers) * 100 : 0
    },
    riskFactors: identifyChurnRiskFactors(classifications)
  };
}

function analyzeEngagementSegments(messagesSnap, subscribersSnap) {
  const segments = {
    champions: [], // High frequency, high engagement
    loyalists: [], // Regular engagement, lower frequency
    newSubscribers: [], // Recent signups
    promising: [], // Good engagement, new
    needsAttention: [], // Declining engagement
    cannotLose: [], // High value, declining
    hibernating: [] // Low engagement, long-term subscribers
  };
  
  const subscriberMap = new Map();
  
  // Map subscribers
  subscribersSnap.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      subscriberMap.set(data.email.toLowerCase(), {
        email: data.email.toLowerCase(),
        signupDate: data.createdAt?.toDate() || data.signupDate?.toDate() || new Date(),
        totalEmails: 0,
        totalOpens: 0,
        totalClicks: 0,
        lastEngaged: null,
        daysSinceSignup: 0,
        engagementScore: 0,
        frequency: 0
      });
    }
  });
  
  // Calculate engagement metrics
  messagesSnap.forEach(doc => {
    const data = doc.data();
    if (data.test) return;
    
    const subscriber = subscriberMap.get(data.to?.toLowerCase());
    if (!subscriber) return;
    
    subscriber.totalEmails++;
    subscriber.totalOpens += data.opensCount || 0;
    subscriber.totalClicks += data.clicksCount || 0;
    
    if (data.opensCount > 0 || data.clicksCount > 0) {
      subscriber.lastEngaged = data.createdAt?.toDate() || new Date();
    }
  });
  
  // Classify subscribers
  const now = new Date();
  
  subscriberMap.forEach(subscriber => {
    subscriber.daysSinceSignup = Math.floor((now - subscriber.signupDate) / (1000 * 60 * 60 * 24));
    subscriber.engagementScore = subscriber.totalEmails > 0 ? 
      ((subscriber.totalOpens + subscriber.totalClicks * 2) / subscriber.totalEmails) * 100 : 0;
    subscriber.frequency = subscriber.daysSinceSignup > 0 ? 
      subscriber.totalEmails / (subscriber.daysSinceSignup / 7) : 0; // Emails per week
    
    const daysSinceLastEngaged = subscriber.lastEngaged ? 
      Math.floor((now - subscriber.lastEngaged) / (1000 * 60 * 60 * 24)) : subscriber.daysSinceSignup;
    
    // Segmentation logic
    if (subscriber.engagementScore > 80 && subscriber.frequency > 2) {
      segments.champions.push(subscriber);
    } else if (subscriber.engagementScore > 60 && subscriber.frequency > 1) {
      segments.loyalists.push(subscriber);
    } else if (subscriber.daysSinceSignup < 30) {
      segments.newSubscribers.push(subscriber);
    } else if (subscriber.daysSinceSignup < 90 && subscriber.engagementScore > 40) {
      segments.promising.push(subscriber);
    } else if (subscriber.engagementScore > 20 && daysSinceLastEngaged > 30) {
      segments.needsAttention.push(subscriber);
    } else if (subscriber.frequency > 2 && daysSinceLastEngaged > 60) {
      segments.cannotLose.push(subscriber);
    } else {
      segments.hibernating.push(subscriber);
    }
  });
  
  // Calculate segment statistics
  const totalSubscribers = subscriberMap.size;
  const segmentStats = {};
  
  Object.keys(segments).forEach(segmentName => {
    const segment = segments[segmentName];
    segmentStats[segmentName] = {
      count: segment.length,
      percentage: totalSubscribers > 0 ? (segment.length / totalSubscribers) * 100 : 0,
      avgEngagementScore: segment.reduce((sum, s) => sum + s.engagementScore, 0) / segment.length || 0,
      avgFrequency: segment.reduce((sum, s) => sum + s.frequency, 0) / segment.length || 0,
      totalValue: segment.reduce((sum, s) => sum + (s.totalOpens + s.totalClicks * 2), 0)
    };
  });
  
  return {
    segments: segmentStats,
    insights: generateSegmentInsights(segmentStats, totalSubscribers)
  };
}

function generatePredictiveInsights(engagement, cohorts) {
  const insights = {
    engagementTrend: 'stable', // increasing, stable, decreasing
    predictedChurn: 0,
    recommendedActions: [],
    riskFactors: []
  };
  
  // Analyze engagement trend
  if (cohorts.cohorts.length >= 3) {
    const recentCohorts = cohorts.cohorts.slice(-3);
    const avgRecent = recentCohorts.reduce((sum, c) => sum + c.engagement.engagementRate, 0) / recentCohorts.length;
    const olderCohorts = cohorts.cohorts.slice(-6, -3);
    const avgOlder = olderCohorts.reduce((sum, c) => sum + c.engagement.engagementRate, 0) / olderCohorts.length || avgRecent;
    
    if (avgRecent > avgOlder * 1.1) {
      insights.engagementTrend = 'increasing';
    } else if (avgRecent < avgOlder * 0.9) {
      insights.engagementTrend = 'decreasing';
      insights.riskFactors.push('Declining engagement across recent cohorts');
    }
  }
  
  // Predict churn based on engagement patterns
  const totalEngagement = engagement.engagementMetrics.opens + engagement.engagementMetrics.clicks;
  const engagementRate = engagement.totalEmails > 0 ? (totalEngagement / engagement.totalEmails) * 100 : 0;
  
  if (engagementRate < 20) {
    insights.predictedChurn = 25; // 25% predicted churn
    insights.riskFactors.push('Low overall engagement rate');
  } else if (engagementRate < 40) {
    insights.predictedChurn = 15;
    insights.riskFactors.push('Below average engagement rate');
  } else {
    insights.predictedChurn = 5;
  }
  
  return insights;
}

function generateEngagementRecommendations(engagement, segments) {
  const recommendations = [];
  
  // Champions segment
  if (segments.segments.champions?.percentage < 10) {
    recommendations.push({
      priority: 'high',
      segment: 'Champions',
      title: 'Grow Champion Segment',
      description: 'Only ' + (segments.segments.champions?.percentage || 0).toFixed(1) + '% of subscribers are highly engaged',
      actions: [
        'Create exclusive content for top performers',
        'Implement referral programs',
        'Offer early access to new features/products',
        'Send personalized thank you messages'
      ]
    });
  }
  
  // Needs Attention segment
  if (segments.segments.needsAttention?.percentage > 20) {
    recommendations.push({
      priority: 'high',
      segment: 'Needs Attention',
      title: 'Re-engage Declining Subscribers',
      description: (segments.segments.needsAttention?.percentage || 0).toFixed(1) + '% of subscribers need attention',
      actions: [
        'Create win-back email campaign',
        'Survey for content preferences',
        'Reduce email frequency temporarily',
        'Offer special incentives or content'
      ]
    });
  }
  
  // Hibernating segment
  if (segments.segments.hibernating?.percentage > 30) {
    recommendations.push({
      priority: 'medium',
      segment: 'Hibernating',
      title: 'Address Inactive Subscribers',
      description: (segments.segments.hibernating?.percentage || 0).toFixed(1) + '% of subscribers are inactive',
      actions: [
        'Implement sunset policy (remove after 6 months)',
        'Send reactivation campaign',
        'Update email preferences',
        'Consider list hygiene cleanup'
      ]
    });
  }
  
  // Time-based insights
  const bestHour = engagement.timeAnalysis.hourlyPattern
    .reduce((best, current) => current.opens > best.opens ? current : best);
  
  if (bestHour.opens > 0) {
    recommendations.push({
      priority: 'low',
      segment: 'All',
      title: 'Optimize Send Times',
      description: `Peak engagement occurs at ${bestHour.hour}:00`,
      actions: [
        `Schedule important emails around ${bestHour.hour}:00`,
        'A/B test different send times',
        'Consider subscriber timezone preferences',
        'Monitor engagement patterns monthly'
      ]
    });
  }
  
  return recommendations;
}

function getCohortKey(date, cohortType) {
  switch (cohortType) {
    case 'weekly':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    default: // monthly
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

function identifyChurnRiskFactors(classifications) {
  const factors = [];
  
  const totalActive = classifications.active.length + classifications.atRisk.length;
  const totalChurned = classifications.inactive.length + classifications.churned.length;
  
  if (totalChurned > totalActive) {
    factors.push({
      factor: 'High Churn Rate',
      severity: 'high',
      description: 'More subscribers are churned/inactive than active'
    });
  }
  
  const avgActiveEngagement = classifications.active.reduce((sum, s) => sum + s.engagementScore, 0) / classifications.active.length || 0;
  const avgAtRiskEngagement = classifications.atRisk.reduce((sum, s) => sum + s.engagementScore, 0) / classifications.atRisk.length || 0;
  
  if (avgActiveEngagement < 40) {
    factors.push({
      factor: 'Low Active Engagement',
      severity: 'medium',
      description: 'Even active subscribers show low engagement scores'
    });
  }
  
  if (avgAtRiskEngagement > avgActiveEngagement * 0.8) {
    factors.push({
      factor: 'Rapid Engagement Decline',
      severity: 'high',
      description: 'At-risk subscribers had similar engagement to active ones'
    });
  }
  
  return factors;
}

function generateSegmentInsights(segmentStats, totalSubscribers) {
  const insights = [];
  
  if (segmentStats.champions.percentage > 15) {
    insights.push({
      type: 'positive',
      message: `Strong champion segment (${segmentStats.champions.percentage.toFixed(1)}%) indicates excellent content quality`
    });
  }
  
  if (segmentStats.hibernating.percentage > 40) {
    insights.push({
      type: 'warning',
      message: `Large hibernating segment (${segmentStats.hibernating.percentage.toFixed(1)}%) suggests list quality issues`
    });
  }
  
  if (segmentStats.newSubscribers.percentage > 20) {
    insights.push({
      type: 'info',
      message: `High new subscriber percentage (${segmentStats.newSubscribers.percentage.toFixed(1)}%) shows good growth`
    });
  }
  
  const highValueSegments = segmentStats.champions.count + segmentStats.loyalists.count;
  const lowValueSegments = segmentStats.hibernating.count + segmentStats.needsAttention.count;
  
  if (highValueSegments < lowValueSegments) {
    insights.push({
      type: 'warning',
      message: 'More low-value subscribers than high-value ones - focus on engagement'
    });
  }
  
  return insights;
}
