# Glowww - Advanced Website Builder Platform

Glowww is a comprehensive, AI-powered website building platform that enables users to create, customize, and deploy professional websites with advanced template marketplace capabilities.

## 🚀 Features

### Core Platform
- **Visual Website Builder** - Drag-and-drop interface with real-time preview
- **Multi-tenant Architecture** - Support for multiple users and organizations
- **Authentication System** - Secure user management with Firebase Auth
- **E-commerce Integration** - Built-in shopping cart, payment processing, and order management
- **SEO Optimization** - Built-in SEO tools and meta management
- **Mobile Responsive** - All templates and pages are mobile-first responsive

### 🎯 Template Marketplace (Phase 2)
- **AI-Powered Recommendations** - Smart template suggestions based on user behavior
- **Template Collections** - Curated bundles and themed template sets
- **Advanced Discovery Engine** - Machine learning-based template search and discovery
- **Template Moderation System** - Quality control with Wilson Score algorithm
- **Analytics Dashboard** - Comprehensive metrics for template performance
- **Pro User Features** - Advanced template creation and AI recommendations for premium users

### 🤖 AI & Machine Learning
- **Smart Recommendations** - Multiple algorithm types for personalized suggestions
- **User Behavior Analysis** - Track interactions for continuous improvement
- **Search Intent Recognition** - Understand user search patterns and preferences
- **Quality Scoring** - Automated template quality assessment

## 📁 Project Structure

```
app/
├── Components/          # Reusable UI components
│   ├── TemplateModeration.jsx
│   ├── TemplateCollections.jsx
│   ├── SmartTemplateRecommendations.jsx
│   └── TemplateAnalyticsDashboard.jsx
├── dashboard/          # User dashboard
├── admin/             # Admin panel (e-commerce focused)
├── Editor/            # Visual page editor
├── api/               # API endpoints
│   ├── collections/   # Template collections API
│   ├── recommendations/ # AI recommendations API
│   └── analytics/     # Analytics tracking API
└── templates/         # Public template marketplace

lib/
├── templateCollections.js    # Collections management engine
├── templateDiscovery.js     # AI-powered discovery system
├── templateModeration.js    # Template moderation system
└── auth.js                  # Authentication utilities
```

## 🛠 Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore
- Stripe account (for e-commerce features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/glowww.git
cd glowww
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local`:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Template Marketplace
NEXT_PUBLIC_ENABLE_TEMPLATE_MARKETPLACE=true
NEXT_PUBLIC_TEMPLATE_AI_RECOMMENDATIONS=true
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Template Marketplace Features

### User Experience
- **Browse Templates** at `/templates` - Public marketplace with search and filtering
- **AI Recommendations** - Personalized template suggestions based on user behavior
- **Template Collections** - Curated sets and bundles for specific use cases
- **Preview & Download** - Interactive template previews before use

### Admin Features
- **Template Moderation** - Review and approve user-submitted templates
- **Analytics Dashboard** - Track template performance, user engagement, and revenue
- **Collection Management** - Create and manage template collections and bundles
- **Quality Control** - Automated quality scoring with manual review capabilities

### Developer API
```javascript
// Get personalized recommendations
GET /api/recommendations

// Track user interactions
POST /api/analytics/track

// Manage collections (admin)
POST /api/collections
```

## 🎨 Technology Stack

- **Frontend**: Next.js 14, React, Ant Design, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase Functions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Payments**: Stripe
- **Analytics**: Google Analytics, Custom analytics system
- **AI/ML**: Custom recommendation algorithms, behavioral analysis

## 📈 Performance Features

- **Lazy Loading** - Components and images load on demand
- **Caching Strategy** - Smart caching for optimal performance
- **Code Splitting** - Automatic route-based code splitting
- **Image Optimization** - Next.js Image component with lazy loading
- **SEO Optimization** - Built-in meta management and sitemap generation

## Email System (Overview)
Multi-tenant email layer with:
- Template + custom sends (preview, idempotency, retry/backoff)
- Suppressions & warm-up caps
- Message detail re-render
- Analytics (30d series + template breakdown) in dashboard modal
- CSV export & inbound capture

Endpoints quick list: `/api/email/send`, `/custom-send`, `/templates`, `/templates/preview`, `/messages`, `/messages/[id]`, `/messages/export`, `/suppressions`, `/warmup/stats`, `/analytics/summary`, `/inbound`.

See detailed documentation in `docs/EMAIL_SYSTEM.md`.

## 📚 Documentation

- [Phase 2 Template Marketplace Documentation](./PHASE2_TEMPLATE_MARKETPLACE_DOCUMENTATION.md) - Comprehensive guide to AI-powered features
- [Email System Documentation](./docs/EMAIL_SYSTEM.md) - Email system implementation details
- [User Analytics System](./docs/USER_ANALYTICS_SYSTEM.md) - Analytics and tracking documentation

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and feel free to submit pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.