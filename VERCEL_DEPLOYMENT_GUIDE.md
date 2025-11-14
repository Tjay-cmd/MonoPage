# 🚀 Vercel Deployment Guide for MonoPage

Complete guide to deploy your BusinessBuilder/MonoPage application to Vercel.

---

## 📋 Prerequisites

1. ✅ GitHub repository created and code pushed (`Tjay-cmd/MonoPage`)
2. ✅ Vercel account (create at [vercel.com](https://vercel.com))
3. ✅ Environment variables ready (see below)

---

## 🎯 Quick Deployment Steps

### **Option 1: Deploy via Vercel Dashboard (Recommended)**

1. **Go to Vercel**
   - Visit: [vercel.com](https://vercel.com)
   - Sign in with GitHub (use your `Tjay-cmd` account)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `Tjay-cmd/MonoPage`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Set Environment Variables** (IMPORTANT!)
   
   Click "Environment Variables" and add all of these:

   **Firebase Configuration:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

   **PayFast Configuration:**
   ```
   NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_merchant_id
   NEXT_PUBLIC_PAYFAST_MERCHANT_KEY=your_merchant_key
   NEXT_PUBLIC_PAYFAST_ENVIRONMENT=sandbox
   PAYFAST_MERCHANT_KEY=your_merchant_key
   PAYFAST_PASSPHRASE=your_passphrase
   ```

   **App Configuration:**
   ```
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   ```
   (Update this after first deployment with your actual Vercel URL)

   **Firebase Admin (for server-side API routes):**
   ```
   FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
   FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
   FIREBASE_ADMIN_PROJECT_ID=your_project_id
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Your app will be live at: `https://your-app-name.vercel.app`

6. **Update App URL**
   - After first deployment, go to Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
   - Redeploy (Vercel will auto-deploy on next push, or manually trigger)

---

### **Option 2: Deploy via Vercel CLI**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? → **No** (first time)
   - Project name? → `monopage` or leave default
   - Directory? → `./` (current directory)
   - Override settings? → **No**

4. **Set Environment Variables via CLI**
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   # Paste your value, press Enter
   ```
   
   Repeat for all environment variables, OR set them all in the dashboard (easier).

5. **Production Deployment**
   ```bash
   vercel --prod
   ```

---

## 🔧 Configuration Files

### **vercel.json** (Optional - Next.js works without it)

Vercel auto-detects Next.js projects, but if you need custom settings:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

Create this file if you need custom routing or headers.

---

## 📝 Environment Variables Reference

### **Required Environment Variables:**

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | Firebase API key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | Firebase auth domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | Firebase project ID | `pay-zip-sa` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Public | Firebase storage bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public | Firebase messaging sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | Firebase app ID | `1:123:web:abc` |
| `NEXT_PUBLIC_PAYFAST_MERCHANT_ID` | Public | PayFast merchant ID | `10042577` |
| `NEXT_PUBLIC_PAYFAST_ENVIRONMENT` | Public | PayFast environment | `sandbox` or `production` |
| `PAYFAST_MERCHANT_KEY` | Secret | PayFast merchant key | `lwzxkeczltrf1` |
| `PAYFAST_PASSPHRASE` | Secret | PayFast passphrase | `your_passphrase` |
| `NEXT_PUBLIC_APP_URL` | Public | Your app URL | `https://app.vercel.app` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Secret | Firebase admin private key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Secret | Firebase admin client email | `firebase-adminsdk@...` |
| `FIREBASE_ADMIN_PROJECT_ID` | Secret | Firebase admin project ID | `pay-zip-sa` |

---

## 🔄 Automatic Deployments

Vercel automatically deploys on:
- ✅ Push to `main` branch → **Production**
- ✅ Push to other branches → **Preview**
- ✅ Pull Requests → **Preview**

You can disable auto-deployments in Settings → Git.

---

## 🌐 Custom Domain Setup (Optional)

1. Go to your project on Vercel
2. Settings → Domains
3. Add your domain (e.g., `monopage.com`)
4. Follow DNS configuration instructions
5. Update `NEXT_PUBLIC_APP_URL` with your custom domain

---

## 🔍 Troubleshooting

### **Build Fails**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` scripts are correct

### **Environment Variables Not Working**
- Variables starting with `NEXT_PUBLIC_` are exposed to client
- Server-only variables (without `NEXT_PUBLIC_`) are only available in API routes
- Redeploy after adding new environment variables

### **API Routes Not Working**
- Check Firebase Admin SDK credentials are set
- Verify `NEXT_PUBLIC_APP_URL` matches your Vercel URL
- Check server logs in Vercel dashboard

### **Firebase Connection Issues**
- Verify all Firebase environment variables are correct
- Check Firebase project settings
- Ensure Firestore rules allow your app

---

## 🔄 Switching to Firebase Hosting Later

When you're ready to move to Firebase Hosting:

1. **Update `next.config.js` for static export:**
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export', // Enable static export
     images: {
       unoptimized: true
     }
   }
   module.exports = nextConfig
   ```

2. **Build static export:**
   ```bash
   npm run build
   ```

3. **Deploy to Firebase:**
   ```bash
   firebase deploy --only hosting
   ```

4. **Update environment variables:**
   - Update `NEXT_PUBLIC_APP_URL` to Firebase URL
   - Redeploy

**Note:** Static export means no API routes. If you need API routes, keep using Vercel or use Firebase Functions.

---

## 📊 Monitoring & Analytics

- **Vercel Analytics:** Enable in Settings → Analytics
- **Error Tracking:** Built-in error logs in Vercel dashboard
- **Performance:** Built-in Web Vitals monitoring

---

## ✅ Post-Deployment Checklist

- [ ] All environment variables set correctly
- [ ] App loads successfully
- [ ] Authentication works (Firebase Auth)
- [ ] API routes work (check `/api/test-auth`)
- [ ] Payment links generate correctly
- [ ] Firebase Storage works for image uploads
- [ ] Custom domain configured (if using)
- [ ] Updated `NEXT_PUBLIC_APP_URL` with actual URL

---

## 🎉 Success!

Your app should now be live at: `https://your-app-name.vercel.app`

**Next Steps:**
1. Test all features thoroughly
2. Set up custom domain (optional)
3. Enable Vercel Analytics
4. Configure monitoring and alerts

---

**Questions?** Check Vercel docs: [vercel.com/docs](https://vercel.com/docs)

