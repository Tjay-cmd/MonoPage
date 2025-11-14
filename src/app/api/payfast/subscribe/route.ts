import { NextRequest, NextResponse } from 'next/server';

// Import Firebase Auth for server-side token verification
// Note: In production, you should use Firebase Admin SDK for proper server-side auth
// For now, we'll use a simpler approach

// SIMPLIFIED: Just return the working PayFast URL format
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, tier, email, name } = body;

    console.log('📝 Processing request for userId:', userId, 'tier:', tier);

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'User ID and tier are required' },
        { status: 400 }
      );
    }

    // Get base URL from environment variable (works for both dev and production)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Build redirect URLs
    const returnUrl = `${baseUrl}/dashboard/payments/success`;
    const cancelUrl = `${baseUrl}/dashboard/payments/cancel`;
    const notifyUrl = `${baseUrl}/api/payfast/notify`;

    console.log('🔗 PayFast Redirect URLs:');
    console.log('  Base URL:', baseUrl);
    console.log('  Return URL:', returnUrl);
    console.log('  Cancel URL:', cancelUrl);
    console.log('  Notify URL:', notifyUrl);

    // Generate a simple working PayFast URL using the known working format
    const timestamp = Date.now();
    const paymentId = `${userId}-${tier}-${timestamp}`;

    // Use the EXACT working format but with dynamic URLs from environment
    const payfastUrl = `https://sandbox.payfast.co.za/eng/process?return_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}&notify_url=${encodeURIComponent(notifyUrl)}&name_first=${encodeURIComponent(name || 'Customer')}&name_last=Name&email_address=${encodeURIComponent(email || 'customer@example.com')}&m_payment_id=${paymentId}&amount=100.00&item_name=Pro%20Plan&item_description=Pro%20plan%20for%20my%20SaaS&custom_str1=${userId}&custom_str2=${tier}&merchant_id=10042577&merchant_key=lwzxkeczltrf1`;

    console.log('✅ Generated working PayFast URL with dynamic redirect URLs');

    return NextResponse.json({
      success: true,
      paymentUrl: payfastUrl,
      paymentId: paymentId,
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
