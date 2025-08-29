# Platform Admin Dashboard

A comprehensive admin dashboard for platform-wide management and analytics.

## 🎯 Overview

The Platform Admin Dashboard provides administrators with powerful tools to monitor, manage, and analyze the entire platform ecosystem. This includes site management, user oversight, system health monitoring, and detailed analytics across all platform operations.

## ✨ Features

### 📊 Platform Analytics & Metrics
- **Real-time Statistics**: Total sites, users, visitors, and page views
- **Growth Tracking**: Period-over-period growth rates with visual indicators  
- **Time Series Charts**: Interactive charts showing platform trends over time
- **Top Performance Lists**: Highest performing sites and most active users

### 🌐 Site Management
- **Complete Site Directory**: View all sites created on the platform
- **Site Details**: Name, owner, status, view counts, creation dates
- **Admin Controls**: 
  - View live sites
  - Edit sites with full owner permissions
  - Access site analytics directly
  - Delete sites (with confirmation)
- **Bulk Operations**: Export site data as CSV
- **Site Status Tracking**: Published, draft, or archived sites

### 👥 User Management  
- **User Directory**: Complete list of all platform users
- **User Profiles**: Display names, emails, subscription tiers, join dates
- **Usage Analytics**: Site counts and total view metrics per user
- **Account Status**: Email verification, subscription status, last activity
- **User Insights**: Activity patterns and engagement metrics

### 📧 Email System Analytics
- **Email Metrics**: Total sent, delivery rates, open rates, click rates
- **Performance Tracking**: Bounce rates and engagement statistics
- **Time Series Analysis**: Email performance trends over time
- **Service Health**: Email system uptime and performance monitoring

### 🔧 System Health Monitoring
- **Service Status**: Real-time status of all platform services
  - Web Server
  - Database
  - Email Service  
  - File Storage
  - Analytics
  - CDN
- **Resource Monitoring**: CPU, memory, storage, and bandwidth usage
- **Performance Metrics**: Response times and system performance scores
- **Uptime Tracking**: Service availability percentages

### 📈 Advanced Analytics
- **Multi-dimensional Charts**: Line charts, area charts, bar charts
- **Custom Date Ranges**: 7 days, 30 days, 90 days, 1 year
- **Export Capabilities**: CSV exports for all data types
- **Real-time Updates**: Live data refresh and monitoring

## 🚀 Access & Security

### Admin Authentication
- **Tier-based Access**: Only users with `admin` tier can access
- **JWT Verification**: Secure token-based authentication
- **Role-based Permissions**: Admin-only API endpoints
- **Auto-redirect**: Non-admin users redirected to main dashboard

### API Security
- All admin APIs require `Bearer` token authentication
- Firebase Admin SDK for user verification
- Custom claims validation for admin privileges
- Comprehensive error handling and logging

## 🎨 User Interface

### Modern Design
- **Ant Design Components**: Professional, accessible UI components
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Supports system theme preferences
- **Interactive Charts**: Recharts integration for data visualization
- **Loading States**: Skeleton loaders and progress indicators

### Navigation
- **Tab-based Layout**: Overview, Sites, Users, Email, System tabs
- **Quick Actions**: Export, refresh, filter options
- **Contextual Menus**: Dropdown actions for sites and users
- **Search & Filter**: Advanced filtering capabilities

## 📱 Platform Integration

### Dashboard Integration
- **Seamless Navigation**: Integrated into main dashboard as "Platform Admin" tab
- **Conditional Display**: Tab only visible to admin users
- **Dynamic Loading**: Lazy-loaded component for performance
- **State Management**: Shared authentication context

### API Endpoints
```
GET /api/admin/platform/metrics     - Platform overview metrics
GET /api/admin/platform/sites       - All sites data
GET /api/admin/platform/users       - All users data  
GET /api/admin/platform/email-metrics - Email system analytics
GET /api/admin/platform/timeseries  - Historical trend data
GET /api/admin/platform/health      - System health status
GET /api/admin/platform/export      - Data export functionality
```

## 🛠️ Technical Implementation

### Frontend Stack
- **Next.js 15**: React framework with App Router
- **Ant Design**: UI component library
- **Recharts**: Data visualization library
- **Firebase Auth**: User authentication
- **Dynamic Imports**: Performance optimization

### Backend Stack
- **Next.js API Routes**: Server-side endpoints
- **Firebase Admin SDK**: Administrative operations
- **Firestore**: Database queries and analytics
- **JWT Verification**: Secure API access
- **CSV Export**: Data export functionality

### Data Sources
- **Firestore Collections**:
  - `sites` - Site information and metadata
  - `users` - User profiles and subscription data
  - `analytics` - Page view and visitor data
  - `emailLogs` - Email sending and engagement data
  - `emailMessages` - Message history and metrics

## 📋 Usage Instructions

### Accessing the Admin Dashboard
1. Log in with an admin account (`tier: 'admin'`)
2. Navigate to main dashboard
3. Click the "Platform Admin" tab (only visible to admins)
4. Explore different sections using the sub-tabs

### Managing Sites
1. Go to "Sites" tab in Platform Admin
2. View complete site directory with sorting/filtering
3. Use dropdown menu for each site:
   - **View Live Site**: Open site in new tab
   - **Edit as Owner**: Full editor access with admin override
   - **View Analytics**: Direct access to site analytics
   - **Delete Site**: Remove site (with confirmation)

### Monitoring System Health
1. Navigate to "System" tab
2. View real-time service status indicators
3. Monitor resource usage graphs
4. Check individual service uptime percentages

### Exporting Data
1. Use "Export" buttons in Sites/Users tabs
2. Select data type (sites, users, analytics, emails)
3. Choose date range
4. Download CSV file automatically

## 🔮 Future Enhancements

### Planned Features
- **Advanced Filtering**: Complex search and filter combinations
- **Bulk Actions**: Mass operations on sites and users
- **Alert System**: Automated alerts for system issues
- **A/B Testing**: Platform-wide feature testing
- **Advanced Analytics**: Machine learning insights
- **API Rate Limiting**: Advanced security controls
- **Audit Logs**: Complete admin action logging

### Performance Optimizations
- **Data Caching**: Redis integration for faster queries
- **Lazy Loading**: Progressive data loading
- **Real-time Updates**: WebSocket integration
- **Background Jobs**: Async data processing

## 🎉 Benefits

### For Platform Administrators
- **Complete Visibility**: Full platform oversight and control
- **Data-Driven Decisions**: Comprehensive analytics and reporting
- **Efficient Management**: Streamlined site and user administration
- **Proactive Monitoring**: Early detection of issues and trends

### For Platform Users
- **Better Support**: Admins can quickly diagnose and resolve issues  
- **Improved Performance**: Proactive system monitoring ensures uptime
- **Enhanced Features**: Data-driven platform improvements
- **Reliable Service**: Comprehensive health monitoring

The Platform Admin Dashboard transforms platform management from reactive to proactive, providing administrators with the tools they need to ensure optimal platform performance and user experience.
