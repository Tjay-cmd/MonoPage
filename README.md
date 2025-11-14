# BusinessBuilder (MonoPage) - SaaS Website Builder Platform

A professional SaaS platform that enables small businesses (barbers, photographers, tutors, etc.) to create stunning one-page websites with integrated PayFast payments.

## 🚀 Features

- **Visual Website Builder** - Drag-and-drop editor powered by GrapesJS
- **Professional Templates** - Pre-designed templates for various business types
- **Integrated Payments** - PayFast integration for South African businesses
- **Service Management** - Create and manage services with automatic payment links
- **Tier-Based System** - Progressive tier unlocking based on business growth
- **Publishing** - One-click website publishing with public URLs
- **Firebase Backend** - Scalable cloud infrastructure

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 3.4
- **Editor:** GrapesJS 0.22
- **Backend:** Firebase (Firestore, Auth, Storage, Hosting)
- **Payments:** PayFast (South African payment gateway)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase account
- PayFast merchant account (for payments)

## 🏗️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd project-2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # PayFast Configuration
   NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_merchant_id
   NEXT_PUBLIC_PAYFAST_ENVIRONMENT=sandbox
   PAYFAST_MERCHANT_KEY=your_merchant_key
   PAYFAST_PASSPHRASE=your_passphrase

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment

### Vercel (Recommended for now)

1. **Push code to GitHub** (already done)
   - Your repo: `https://github.com/Tjay-cmd/MonoPage`

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New..." → "Project"
   - Import `Tjay-cmd/MonoPage`
   - Add all environment variables (see [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md))
   - Click "Deploy"

3. **Your app will be live at:** `https://your-app-name.vercel.app`

📖 **Full Vercel deployment guide:** [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

### Firebase Hosting (For later)

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Export static files** (if needed)
   ```bash
   npm run export
   ```

3. **Deploy to Firebase**
   ```bash
   firebase deploy --only hosting
   ```

## 📁 Project Structure

```
project-2/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and configurations
│   ├── hooks/            # React hooks
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
├── public/               # Static assets
├── firebase.json         # Firebase configuration
├── firestore.rules       # Firestore security rules
└── package.json          # Dependencies
```

## 🔐 Security

- **Firestore Rules** - Enforce data access permissions
- **Firebase Auth** - Secure user authentication
- **API Route Protection** - Server-side token verification
- **Environment Variables** - Sensitive data not committed

## 📚 Documentation

- [COMPREHENSIVE_PROJECT_ANALYSIS.md](./COMPREHENSIVE_PROJECT_ANALYSIS.md) - Complete project overview
- [PROJECT_ARCHITECTURE_ANALYSIS.md](./PROJECT_ARCHITECTURE_ANALYSIS.md) - Architecture and flow documentation
- [COMPLETE_FIX_SUMMARY.md](./COMPLETE_FIX_SUMMARY.md) - Recent bug fixes and improvements
- [GRAPESJS_WORKFLOW.md](./GRAPESJS_WORKFLOW.md) - Template editor workflow guide

## 🎯 Key Features Explained

### Template System
- **Two Formats:** ZIP-based (legacy) and GrapesJS JSON (preferred)
- **Template Upload:** Admin-only interface for managing templates
- **Template Loading:** Seamless integration with GrapesJS editor

### Payment Integration
- **PayFast Simple Integration:** No signature required
- **Service Payment Links:** Automatic generation for each service
- **Webhook Processing:** Real-time transaction updates

### Subscription Tiers
- **Free** → Basic features
- **Starter** → After signup
- **Professional** → 10+ payments
- **Business** → 50+ payments  
- **Premium** → 100+ payments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential.

## 👥 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for small businesses in South Africa**

