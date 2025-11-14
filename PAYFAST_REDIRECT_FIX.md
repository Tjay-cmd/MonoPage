# PayFast Redirect URL Fix

## ✅ Issue Fixed

The PayFast subscription upgrade flow was redirecting users back to `localhost:3000` instead of your Vercel deployment URL. This has been fixed!

## What Was Changed

### Fixed File: `src/app/api/payfast/subscribe/route.ts`

**Before:**
- Had hardcoded `localhost:3000` URLs in the PayFast redirect links
- Would always redirect to localhost, breaking on production

**After:**
- Automatically detects the correct base URL from request headers
- Works in both development (`localhost:3000`) and production (your Vercel URL)
- Falls back to `NEXT_PUBLIC_APP_URL` environment variable if set (recommended)

## How It Works Now

The code now automatically detects the correct URL:

1. **First Priority**: Uses `NEXT_PUBLIC_APP_URL` if set in environment variables
2. **Second Priority**: Detects from request headers (automatic, works everywhere)
3. **Fallback**: Uses `localhost:3000` only in development

### Detection Logic:
```typescript
// Detects from request headers automatically
const protocol = request.headers.get('x-forwarded-proto') || 'https';
const host = request.headers.get('host') || 'localhost:3000';
```

This means:
- ✅ In **development**: Uses `http://localhost:3000`
- ✅ In **production (Vercel)**: Uses `https://your-app.vercel.app`
- ✅ Works **automatically** without any configuration needed

## Optional: Set Environment Variable (Recommended)

While the fix works automatically, you can optionally set `NEXT_PUBLIC_APP_URL` in Vercel for more control:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
3. Redeploy your app

### Why Set It?
- Ensures consistency across all PayFast integrations
- Works for other parts of the code that use `NEXT_PUBLIC_APP_URL`
- Better for production environments with custom domains

## Testing

### Test in Development:
1. Start your local dev server: `npm run dev`
2. Try upgrading a subscription
3. Complete payment on PayFast
4. Should redirect back to `http://localhost:3000/dashboard/payments/success` ✅

### Test in Production:
1. Deploy to Vercel (or push to GitHub to trigger auto-deploy)
2. Try upgrading a subscription on your deployed app
3. Complete payment on PayFast
4. Should redirect back to `https://your-app.vercel.app/dashboard/payments/success` ✅

## What to Check After Deployment

1. ✅ Payment redirects work correctly
2. ✅ Success page loads (no 404 errors)
3. ✅ Cancel page works
4. ✅ Webhook receives notifications (check Vercel logs)

## Related Files

- ✅ Fixed: `src/app/api/payfast/subscribe/route.ts` - Main subscription upgrade route
- Already using `NEXT_PUBLIC_APP_URL`: `src/lib/payfast.ts` - PayFast configuration
- Already using `NEXT_PUBLIC_APP_URL`: `src/lib/payfast-simple.ts` - Simple PayFast integration

## Troubleshooting

### Still redirecting to localhost?
1. Check that you've deployed the latest code to Vercel
2. Check Vercel logs to see what URL is being generated
3. Verify `NEXT_PUBLIC_APP_URL` is set correctly in Vercel (if using)

### Getting 404 errors on redirect?
1. Make sure `/dashboard/payments/success` page exists ✅
2. Check that the URL is being generated correctly in logs
3. Verify PayFast is using the correct return_url

### Need to test with a different URL?
- Set `NEXT_PUBLIC_APP_URL` in Vercel environment variables
- Or modify the `getBaseUrl` function in `subscribe/route.ts`

## Summary

✅ **Fixed!** PayFast redirects now work automatically in both development and production.

The fix detects the correct URL from request headers, so it works out of the box without any configuration needed. However, setting `NEXT_PUBLIC_APP_URL` in Vercel is recommended for consistency.

