import { NextRequest, NextResponse } from 'next/server';
import { SUBSCRIPTION_PRICES, type SubscriptionTier } from '@/lib/payfast';

// Helper function to get the base URL from request headers or environment
function getBaseUrl(request: NextRequest): string {
  // First, try to use NEXT_PUBLIC_APP_URL if set (recommended for production)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Otherwise, detect from request headers (works automatically in dev and production)
  const protocol = request.headers.get('x-forwarded-proto') || 
                   (request.headers.get('host')?.includes('localhost') ? 'http' : 'https');
  const host = request.headers.get('host') || 
               request.headers.get('x-forwarded-host') || 
               'localhost:3000';
  
  return `${protocol}://${host}`;
}

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

    // Get the base URL (works in both dev and production)
    const baseUrl = getBaseUrl(request);
    console.log('🌐 Using base URL:', baseUrl);

    // Get subscription details
    const paidTier = tier as Exclude<SubscriptionTier, 'free'>;
    const subscription = SUBSCRIPTION_PRICES[paidTier];
    if (!subscription) {
      return NextResponse.json(
        { error: `Invalid subscription tier: ${tier}` },
        { status: 400 }
      );
    }

    // Generate unique payment reference
    const timestamp = Date.now();
    const paymentId = `${userId}-${tier}-${timestamp}`;

    // Build PayFast URL with correct redirect URLs
    const returnUrl = `${baseUrl}/dashboard/payments/success`;
    const cancelUrl = `${baseUrl}/dashboard/payments/cancel`;
    const notifyUrl = `${baseUrl}/api/payfast/webhook`;

    // PayFast merchant credentials
    const merchantId = process.env.PAYFAST_MERCHANT_ID || '10042577';
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || 'lwzxkeczltrf1';
    const isSandbox = process.env.NODE_ENV !== 'production';
    const payfastBaseUrl = isSandbox 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Build query parameters
    const params = new URLSearchParams({
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      name_first: name || 'Customer',
      name_last: 'Name',
      email_address: email || 'customer@example.com',
      m_payment_id: paymentId,
      amount: (subscription.amount / 100).toFixed(2),
      item_name: subscription.name,
      item_description: subscription.description,
      custom_str1: userId,
      custom_str2: tier,
      merchant_id: merchantId,
      merchant_key: merchantKey,
    });

    const payfastUrl = `${payfastBaseUrl}?${params.toString()}`;

    console.log('✅ Generated PayFast URL with base URL:', baseUrl);
    console.log('🔗 PayFast URL:', payfastUrl);

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
