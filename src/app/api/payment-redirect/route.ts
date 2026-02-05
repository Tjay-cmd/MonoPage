import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

/**
 * API Route: /api/payment-redirect
 * 
 * Handles PayFast payment redirects and redirects customers back to the page they came from.
 * 
 * PayFast sends these query parameters:
 * - custom_str1: userId
 * - custom_str2: serviceId
 * - custom_str3: websiteId (if added by editor)
 * - custom_str4: referrerUrl (the page URL where payment link was clicked)
 * - payment_status: COMPLETE, CANCELLED, etc.
 * - Other PayFast params...
 * 
 * Flow (in priority order):
 * 1. If custom_str4 (referrerUrl) exists → redirect back to that page (works for all phases!)
 * 2. If custom_str3 (websiteId) exists → redirect to /p/userId---websiteId
 * 3. Otherwise, look up user's most recent published website
 * 4. Fallback to home page if nothing found
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract PayFast custom fields
    const userId = searchParams.get('custom_str1');
    const serviceId = searchParams.get('custom_str2');
    const websiteId = searchParams.get('custom_str3');
    const referrerUrl = searchParams.get('custom_str4'); // The page where payment link was clicked
    const paymentStatus = searchParams.get('payment_status');
    
    // Also try to get referrer from HTTP header (if PayFast preserves it)
    const httpReferer = request.headers.get('referer');
    
    console.log('🔀 Payment redirect received:', {
      userId,
      serviceId,
      websiteId,
      referrerUrl,
      httpReferer,
      paymentStatus
    });
    
    // Priority 1: Use stored referrer URL (works for draft, editing, and published sites!)
    if (referrerUrl) {
      try {
        // Validate that the referrer URL is from our domain (security check)
        const referrerUrlObj = new URL(referrerUrl);
        const requestUrlObj = new URL(request.url);
        
        // Only redirect if it's from the same origin
        if (referrerUrlObj.origin === requestUrlObj.origin) {
          // Check if it's a published site URL (/p/) - these should always redirect back to published site
          if (referrerUrlObj.pathname.startsWith('/p/')) {
            console.log('✅ Redirecting back to published website:', referrerUrl);
            return NextResponse.redirect(referrerUrl);
          } else {
            // Editor/preview URL - redirect back to it
            console.log('✅ Redirecting back to referrer page:', referrerUrl);
            return NextResponse.redirect(referrerUrl);
          }
        } else {
          console.warn('⚠️ Referrer URL is from different origin, ignoring:', referrerUrl);
        }
      } catch (error) {
        console.error('❌ Invalid referrer URL format:', referrerUrl, error);
      }
    }
    
    // Priority 2: Try HTTP Referer header (if PayFast preserves it)
    // BUT: Don't redirect to payment-redirect pages (would cause infinite loop)
    if (httpReferer) {
      try {
        const refererUrlObj = new URL(httpReferer);
        const requestUrlObj = new URL(request.url);
        
        // Don't redirect to payment-redirect or api/payment-redirect (infinite loop prevention)
        if (refererUrlObj.pathname.includes('/payment-redirect') || 
            refererUrlObj.pathname.includes('/api/payment-redirect')) {
          console.log('⚠️ Ignoring payment-redirect referer to prevent loop:', httpReferer);
        } else if (refererUrlObj.origin === requestUrlObj.origin) {
          console.log('✅ Redirecting back to HTTP referer:', httpReferer);
          return NextResponse.redirect(httpReferer);
        }
      } catch (error) {
        console.warn('⚠️ Invalid HTTP referer:', httpReferer);
      }
    }
    
    // Priority 3: If we have websiteId directly from custom_str3, use it
    if (userId && websiteId) {
      const redirectUrl = `/p/${userId}---${websiteId}`;
      console.log('✅ Redirecting to website from custom_str3:', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    
    // Priority 4: Look up the user's most recent published website
    if (userId) {
      try {
        const websitesRef = adminDb.collection('user_websites');
        
        // Try to get published websites, ordered by publishedAt if available
        let querySnapshot;
        try {
          // First try with orderBy (requires composite index)
          querySnapshot = await websitesRef
            .where('userId', '==', userId)
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(1)
            .get();
        } catch (orderByError: any) {
          // If orderBy fails (no index), fall back to simple query
          console.log('⚠️ orderBy not available, using simple query');
          querySnapshot = await websitesRef
            .where('userId', '==', userId)
            .where('status', '==', 'published')
            .limit(1)
            .get();
        }
        
        if (!querySnapshot.empty) {
          // Get the first result (most recent if ordered, otherwise arbitrary)
          const websiteDoc = querySnapshot.docs[0];
          const websiteData = websiteDoc.data();
          
          // Use publishedUrl if available, otherwise construct it
          const redirectUrl = websiteData.publishedUrl || `/p/${userId}---${websiteDoc.id}`;
          console.log('✅ Redirecting to user\'s published website:', redirectUrl);
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
        
        console.log('⚠️ No published website found for user:', userId);
      } catch (error) {
        console.error('❌ Error looking up user website:', error);
      }
    }
    
    // Fallback: redirect to home page
    // BUT: Don't redirect to payment-redirect pages (would cause infinite loop)
    console.log('⚠️ Fallback: No referrer found, redirecting to home page');
    console.log('⚠️ This usually means PayFast did not send custom_str parameters');
    console.log('⚠️ User should check localStorage in browser console for preview data');
    return NextResponse.redirect(new URL('/', request.url));
    
  } catch (error) {
    console.error('❌ Error in payment redirect:', error);
    // Fallback to home on error
    return NextResponse.redirect(new URL('/', request.url));
  }
}

