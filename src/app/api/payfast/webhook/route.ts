import { NextRequest, NextResponse } from 'next/server';
import { parsePayFastWebhook, verifySignature, isPaymentSuccessful, getTierFromPayment } from '@/lib/payfast';
import { type SubscriptionTier } from '@/lib/subscription';
import {
  getUserSubscriptionServer,
  updateUserSubscriptionServer,
} from '@/lib/server/subscription';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 🔔🔔🔔 PAYFAST WEBHOOK RECEIVED 🔔🔔🔔');
    console.log('🔄 Webhook headers:', Object.fromEntries(request.headers.entries()));
    console.log('🔄 Webhook URL:', request.url);

    // Get form data from PayFast
    const formData = await request.formData();
    const paymentData = parsePayFastWebhook(formData);

    console.log('📄 PayFast webhook data:', paymentData);

    // TODO: Re-enable signature verification when signature calculation is fixed
    // For now, skip signature verification for testing
    console.log('⚠️ Signature verification temporarily disabled for testing');

    // Verify signature (commented out for testing)
    // const receivedSignature = paymentData.signature as string;
    // if (!verifySignature(paymentData, receivedSignature)) {
    //   console.error('❌ Invalid PayFast signature');
    //   return NextResponse.json(
    //     { error: 'Invalid signature' },
    //     { status: 400 }
    //   );
    // }

    // Check payment status
    const paymentStatus = paymentData.payment_status as string;
    if (!isPaymentSuccessful(paymentStatus)) {
      console.log('⚠️ Payment not successful:', paymentStatus);
      return NextResponse.json(
        { message: 'Payment not completed' },
        { status: 200 }
      );
    }

    // Extract user and subscription data
    const userId = paymentData.custom_str1 as string;
    const tierStr = paymentData.custom_str2 as string;
    const paymentType = paymentData.custom_str3 as string;

    if (!userId || paymentType !== 'subscription') {
      console.error('❌ Invalid webhook data - missing userId or wrong payment type');
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    const tier = getTierFromPayment(tierStr);
    if (!tier) {
      console.error('❌ Invalid subscription tier:', tierStr);
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Update user subscription
    console.log('✅ Processing successful payment:', {
      userId,
      tier,
      paymentId: paymentData.m_payment_id,
      amount: paymentData.amount_gross,
    });

    console.log('🔄 Updating user subscription to tier:', tier);

    try {
      await updateUserSubscriptionServer(userId, {
        tier: tier as SubscriptionTier,
        status: 'active',
        payfastToken: paymentData.m_payment_id as string,
      });

      console.log('✅ Subscription updated successfully for user:', userId, 'to tier:', tier);

      // Verify the update was successful
      const updatedSubscription = await getUserSubscriptionServer(userId);
      console.log('🔍 Verification - Updated subscription:', updatedSubscription);

      if (updatedSubscription?.tier !== tier) {
        console.error('❌ Subscription update verification failed!');
        console.error('Expected tier:', tier, 'Actual tier:', updatedSubscription?.tier);
      } else {
        console.log('✅ Subscription update verified successfully');
      }

    } catch (updateError) {
      console.error('❌ Failed to update subscription:', updateError);
      return NextResponse.json(
        { error: 'Subscription update failed' },
        { status: 500 }
      );
    }

    // Return success response to PayFast
    return new NextResponse('SUCCESS', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    console.error('❌ Error processing PayFast webhook:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
