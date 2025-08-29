# User Analytics System

## Overview

Our platform provides comprehensive analytics for all user sites through a single Google Analytics 4 property with custom dimensions. This approach allows:

- **Platform-wide insights** for administrators
- **Individual user analytics** for site owners
- **Site-specific breakdowns** using custom dimensions
- **Real-time tracking** across all sites

## How It Works

### Single Property Architecture
- All sites on the platform use the same GA4 property
- Custom dimensions separate data by user and site
- Efficient tracking and reporting
- Centralized analytics management

### Custom Dimensions
The system uses three custom dimensions:
1. **site_id** - Unique identifier for each site
2. **user_id** - Owner of the site
3. **site_name** - Human-readable site name

### User Dashboard Features
- **Overview**: Total pageviews, visitors, and sessions for all user sites
- **Site Breakdown**: Performance metrics for each individual site
- **Real-time Data**: Current active users and page views
- **Tracking Code**: Automatically generated for each site

### Admin Dashboard Features
- **Platform Metrics**: Total users, sites, and analytics
- **Top Sites**: Best performing sites across the platform
- **Growth Analytics**: User and site growth over time
- **System Health**: Analytics connection status

## API Endpoints

### User Analytics
- `GET /api/user/analytics?userId={id}&range={period}` - User overview analytics
- `GET /api/user/analytics?userId={id}&siteId={id}&type=site` - Site-specific analytics
- `GET /api/user/analytics?userId={id}&type=realtime` - Real-time data

### Tracking Code
- `GET /api/user/analytics/tracking?userId={id}&siteId={id}` - Get tracking code for site
- `GET /api/demo/tracking-code` - Demo tracking code with examples

### Admin Analytics
- `GET /api/admin/platform/metrics` - Platform-wide metrics (admin only)
- `GET /api/admin/debug/ga-test` - Test Google Analytics connection

## Implementation

### For Site Owners
1. Go to Dashboard → Analytics tab
2. Click "Get Tracking Code" for your site
3. Copy the provided code
4. Add it to your site's `<head>` section
5. Wait 24-48 hours for data to appear

### For Developers
```javascript
// The tracking code automatically sends page views with custom dimensions
gtag('event', 'page_view', {
  site_id: 'your-site-id',
  user_id: 'your-user-id',
  site_name: 'Your Site Name'
});

// Track custom events with site context
window.trackSiteEvent('button_click', { 
  button_name: 'Contact Us' 
});
```

### Environment Variables
```bash
GA_ENABLED=true
GA_PROPERTY_ID=your-ga4-property-id
GA_PROJECT_ID=your-google-cloud-project
GA_SA_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GA_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## Benefits

### For Users
- No need to create their own Google Analytics accounts
- Automatic tracking setup
- Professional analytics dashboard
- Real-time insights

### For Platform
- Unified analytics approach
- Better platform insights
- Easier maintenance
- Cost-effective solution

## Custom Events

The system supports tracking custom events:

```javascript
// Button clicks
trackSiteEvent('button_click', { button_name: 'Subscribe' });

// Form submissions
trackSiteEvent('form_submit', { form_name: 'Contact Form' });

// File downloads
trackSiteEvent('file_download', { file_name: 'brochure.pdf' });

// Video interactions
trackSiteEvent('video_play', { video_title: 'Product Demo' });
```

## Data Flow

1. **Site Visit**: User visits a site with tracking code
2. **Data Collection**: GA4 collects standard metrics + custom dimensions
3. **API Processing**: Platform APIs query GA4 with dimension filters
4. **Dashboard Display**: User sees their site-specific analytics
5. **Admin Overview**: Admins see platform-wide aggregated data

## Future Enhancements

- **Export functionality** for analytics data
- **Custom date ranges** for detailed analysis
- **Email reports** with weekly/monthly summaries
- **Advanced filtering** by geography, device, etc.
- **Goal tracking** and conversion analytics
