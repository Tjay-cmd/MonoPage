import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { parsePayFastWebhook, isPaymentSuccessful } from '@/lib/payfast';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Tutor Enrollment PayFast Webhook Received');

    // Get form data from PayFast
    const formData = await request.formData();
    const paymentData = parsePayFastWebhook(formData);

    console.log('📄 PayFast webhook data:', paymentData);

    // Check payment status
    const paymentStatus = paymentData.payment_status as string;
    if (!isPaymentSuccessful(paymentStatus)) {
      console.log('⚠️ Payment not successful:', paymentStatus);
      return NextResponse.json(
        { message: 'Payment not completed' },
        { status: 200 }
      );
    }

    // Extract enrollment data
    const tutorId = paymentData.custom_str1 as string;
    const enrollmentId = paymentData.custom_str2 as string;
    const paymentType = paymentData.custom_str3 as string;

    if (!tutorId || !enrollmentId || paymentType !== 'tutor-enrollment') {
      console.error('❌ Invalid webhook data');
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    // Update enrollment status
    const enrollmentRef = adminDb.collection('tutor-enrollments').doc(enrollmentId);
    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      console.error('❌ Enrollment not found:', enrollmentId);
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    await enrollmentRef.update({
      paymentStatus: 'completed',
      paymentTransactionId: paymentData.pf_payment_id as string,
      paymentCompletedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Enrollment payment completed:', enrollmentId);

    // Return success - PayFast expects 200 OK
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing tutor enrollment webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}



