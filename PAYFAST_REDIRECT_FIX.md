# ✅ PayFast Redirect URL Fix

## Problem Fixed
PayFast was redirecting users back to `localhost:3000` instead of your Vercel deployment URL, causing the payment verification flow to break in production.

## Solution Applied
Updated `src/app/api/payfast/subscribe/route.ts` to use environment variables for redirect URLs instead of hardcoded localhost URLs.

## What Changed

### Before:
```typescript
// Hardcoded localhost URLs
const payfastUrl = `...return_url=http%3A%2F%2Flocalhost%3A3000%2Fdashboard%2Fpayments%2Fsuccess...`;
```

### After:
```typescript
// Dynamic URLs from environment variables
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const returnUrl = `${baseUrl}/dashboard/payments/success`;
const cancelUrl = `${baseUrl}/dashboard/payments/cancel`;
const notifyUrl = `${baseUrl}/api/payfast/notify`;
```

## Payment Flow (Corrected)

1. **User clicks to buy subscription** → `/dashboard/subscription`
2. **User redirected to PayFast** → PayFast payment page
3. **User completes payment** → PayFast processes payment
4. **PayFast redirects back** → `/dashboard/payments/success` (on your Vercel deployment, not localhost!)
5. **Shows "Verifying payment..."** → Page loads and verifies payment
6. **Payment verified** → Shows success message with options:
   - "Go to Dashboard"
   - "Start Creating" (templates)

## Required Action: Set Environment Variable in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com)
2. Sign in
3. Go to your project: `MonoPage` (or your project name)

### Step 2: Add Environment Variable
1. Click **Settings** → **Environment Variables**
2. Click **Add New**
3. Add this variable:
   - **Key:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://your-vercel-app.vercel.app` (replace with your actual Vercel URL)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

### Step 3: Find Your Vercel URL
Your Vercel URL is shown:
- In the project overview (top of the page)
- In the deployment details
- Format: `https://mono-page-xyz123.vercel.app` or your custom domain

### Step 4: Redeploy
After setting the environment variable:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. OR push a new commit to trigger automatic deployment

## Testing the Fix

### 1. Check Function Logs
After deployment, check Vercel logs:
1. Go to **Deployments** → Latest deployment → **Functions** tab
2. Look for logs with: `🔗 PayFast Redirect URLs:`
3. Verify the URLs show your Vercel domain, not localhost

Expected log output:
```
🔗 PayFast Redirect URLs:
  Base URL: https://your-app.vercel.app
  Return URL: https://your-app.vercel.app/dashboard/payments/success
  Cancel URL: https://your-app.vercel.app/dashboard/payments/cancel
  Notify URL: https://your-app.vercel.app/api/payfast/notify
```

### 2. Test Payment Flow
1. Go to your deployed app: `https://your-app.vercel.app`
2. Navigate to subscription page
3. Click "Upgrade" for any tier
4. Complete payment on PayFast
5. After payment, you should be redirected back to:
   - `https://your-app.vercel.app/dashboard/payments/success` ✅
   - NOT `http://localhost:3000/...` ❌

### 3. Verify Success Page
After redirect, you should see:
1. "Verifying payment..." message (briefly)
2. Payment success page with:
   - ✅ Success message
   - "Go to Dashboard" button
   - "Start Creating" button

## How It Works Now

### Development (localhost):
- Uses `http://localhost:3000` (fallback)
- Works for local testing

### Production (Vercel):
- Uses `NEXT_PUBLIC_APP_URL` environment variable
- Falls back to `https://${process.env.VERCEL_URL}` if not set
- Automatically uses your Vercel deployment URL

## Files Changed

- ✅ `src/app/api/payfast/subscribe/route.ts` - Fixed hardcoded URLs

## Files Already Correct

These files already use environment variables correctly:
- ✅ `src/lib/payfast.ts` - Uses `PAYFAST_CONFIG` with env vars
- ✅ `src/lib/payfast-simple.ts` - Uses env vars for redirect URLs

## Troubleshooting

### Issue: Still redirecting to localhost
**Solution:**
1. Verify `NEXT_PUBLIC_APP_URL` is set in Vercel
2. Check the value is correct (no trailing slash)
3. Redeploy after setting the variable
4. Check function logs to verify the URLs being used

### Issue: Environment variable not working
**Solution:**
1. Variables starting with `NEXT_PUBLIC_` must be set before build
2. Redeploy after adding/modifying environment variables
3. Clear browser cache and try again

### Issue: Payment succeeds but doesn't verify
**Solution:**
1. Check webhook is receiving notifications (check `/api/payfast/notify` logs)
2. Verify Firebase Admin credentials are set correctly
3. Check Firestore security rules allow webhook updates

## Next Steps

1. ✅ Fix applied (code updated)
2. ⏳ **Set `NEXT_PUBLIC_APP_URL` in Vercel** (you need to do this)
3. ⏳ Redeploy your application
4. ⏳ Test the payment flow end-to-end

Once you set the environment variable and redeploy, the payment flow should work correctly! 🎉

