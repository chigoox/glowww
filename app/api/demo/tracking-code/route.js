import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId') || 'demo-site-123';
  const userId = searchParams.get('userId') || 'demo-user-456';
  const siteName = searchParams.get('siteName') || 'My Awesome Site';
  const propertyId = process.env.GA_PROPERTY_ID || 'GA_PROPERTY_ID';

  const trackingCode = `<!-- Google Analytics 4 (Platform Tracking) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${propertyId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${propertyId}', {
    custom_map: {
      'custom_dimension_1': 'site_id',
      'custom_dimension_2': 'user_id',
      'custom_dimension_3': 'site_name'
    }
  });

  // Send custom dimensions with page views
  gtag('event', 'page_view', {
    site_id: '${siteId}',
    user_id: '${userId}',
    site_name: '${siteName}'
  });

  // Track custom events with site context
  window.trackSiteEvent = function(eventName, parameters = {}) {
    gtag('event', eventName, {
      site_id: '${siteId}',
      user_id: '${userId}',
      site_name: '${siteName}',
      ...parameters
    });
  };
</script>

<!-- Example usage for custom events -->
<!-- 
<button onclick="trackSiteEvent('button_click', { button_name: 'Contact Us' })">
  Contact Us
</button>
-->`;

  return NextResponse.json({
    success: true,
    siteId,
    userId,
    siteName,
    propertyId: propertyId === 'GA_PROPERTY_ID' ? 'Not configured' : propertyId,
    trackingCode,
    instructions: [
      '1. Copy the tracking code above',
      '2. Add it to the <head> section of your site',
      '3. Replace demo values with your actual site information',
      '4. Analytics data will appear within 24-48 hours',
      '5. Use trackSiteEvent() function for custom events'
    ],
    customEvents: {
      'button_click': "trackSiteEvent('button_click', { button_name: 'Contact Us' })",
      'form_submit': "trackSiteEvent('form_submit', { form_name: 'Contact Form' })",
      'file_download': "trackSiteEvent('file_download', { file_name: 'brochure.pdf' })",
      'video_play': "trackSiteEvent('video_play', { video_title: 'Introduction Video' })"
    }
  });
}
