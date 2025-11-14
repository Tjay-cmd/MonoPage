# How to Check Your Vercel Deployment Health

## ✅ What to Check After Deployment

### 1. Check Function Logs
1. Go to Vercel Dashboard → Your Project
2. Click **"Logs"** in the top navigation
3. Look for:
   - ✅ `[firebase-admin] Initializing with explicit credentials.`
   - ✅ `[firebase-admin] Successfully initialized with explicit credentials.`
   - ❌ Any error messages (especially Firebase-related)

### 2. Check Recent Deployment Status
1. Go to **"Deployments"** tab
2. Find your latest deployment
3. Check if it says **"Ready"** (green) or **"Error"** (red)

### 3. Test Your API Routes
Test these endpoints in your browser or using Postman:

**Should Work:**
- `https://mono-page-bmiy.vercel.app/api/templates/list`
- `https://mono-page-bmiy.vercel.app/api/subscription/current` (requires auth)
- `https://mono-page-bmiy.vercel.app/api/services` (requires auth)

**Expected Response:**
- Templates API: Should return JSON with templates array
- Subscription API: Should return JSON with subscription data or 401 if not authenticated
- Services API: Should return JSON with services array or empty array

### 4. Check Browser Console
1. Open your deployed app in a browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Look for:
   - ✅ Success messages
   - ❌ Error messages (especially API-related)

## 🎯 What Your Metrics Mean

### Edge Requests: ~150 in 6 hours
- **What it is:** Total HTTP requests to your app
- **Is it good?** ✅ YES - Very low, normal for testing
- **For 2 users:** Perfectly normal (~25 requests/hour)

### Data Transfer: 92MB Out / 2MB In
- **What it is:** Data sent/received by your app
- **Is it good?** ✅ YES - Reasonable for web app
- **For 2 users:** Normal (images, API responses, assets)

### CPU: 23 seconds total
- **What it is:** Server compute time used
- **Is it good?** ✅ YES - Very low usage
- **For 2 users:** Excellent, very efficient

### Error Rate: 2.2%
- **What it is:** Percentage of requests that failed
- **Is it good?** ⚠️ Could be better (ideally <1%)
- **Likely cause:** Previous Firebase Admin initialization errors
- **Action:** Check if errors are still happening (they should be fixed now)

## 🔍 If You See Errors

### Check Function Logs for:
1. **Firebase Admin Errors:**
   - "Unable to detect a Project Id" → Environment variables not set
   - "Invalid credentials" → Check FIREBASE_ADMIN_CREDENTIALS
   - "Permission denied" → Check Firestore security rules

2. **API Route Errors:**
   - 500 errors → Check server logs
   - 401 errors → Authentication issue (normal if not logged in)
   - 404 errors → Route not found (check URL)

3. **Build Errors:**
   - Check deployment logs
   - Look for TypeScript/compilation errors

## ✅ Expected Behavior After Fix

After setting environment variables correctly, you should see:

1. **In Logs:**
   - ✅ Firebase Admin initializes successfully
   - ✅ No "Unable to detect Project Id" errors
   - ✅ API routes respond correctly

2. **In Metrics:**
   - Error rate should decrease (ideally to 0% or <1%)
   - Requests should succeed (2XX status codes)

3. **In Your App:**
   - Templates load correctly
   - Services work
   - Subscriptions work
   - No console errors related to Firebase/API

## 📊 What's "Normal" for Your Stage

### Current Stage: Testing (2 users)
- **Edge Requests:** 0-500/hour = ✅ Normal
- **Error Rate:** <5% = ⚠️ Acceptable, <1% = ✅ Ideal
- **CPU Usage:** <1 minute/hour = ✅ Excellent
- **Data Transfer:** <1GB/hour = ✅ Normal

### As You Scale:
- **10 users:** 500-2000 requests/hour = ✅ Normal
- **100 users:** 5000-20000 requests/hour = ✅ Normal
- **Error Rate:** Should stay <1% = ✅ Good
- **CPU:** Will scale proportionally = ✅ Expected

