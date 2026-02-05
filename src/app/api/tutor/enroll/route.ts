import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { generatePayFastData } from '@/lib/payfast';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tutorId, firstName, surname, email } = body;

    if (!tutorId || !firstName || !surname || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: tutorId, firstName, surname, email' },
        { status: 400 }
      );
    }

    // Check if enrollment already exists for this email and tutor
    const existingEnrollment = await adminDb.collection('tutor-enrollments')
      .where('tutorId', '==', tutorId)
      .where('studentEmail', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingEnrollment.empty) {
      const existing = existingEnrollment.docs[0].data();
      if (existing.paymentStatus === 'completed') {
        return NextResponse.json(
          { error: 'You are already enrolled. Please login to access your classes.' },
          { status: 400 }
        );
      }
      // If pending, allow them to proceed to payment again
    }

    // Get tutor's classes to determine price
    const classesRef = adminDb.collection('tutor-classes')
      .where('tutorId', '==', tutorId)
      .limit(1)
      .get();
    
    const classesSnapshot = await classesRef;
    let classPrice = 0; // Default to free if no classes
    
    if (!classesSnapshot.empty) {
      const firstClass = classesSnapshot.docs[0].data();
      // Assuming all classes have the same price (as per plan)
      classPrice = firstClass.price || 0;
    }

    // Generate enrollment ID
    const enrollmentId = randomBytes(16).toString('hex');

    // Create enrollment record
    const enrollmentRef = adminDb.collection('tutor-enrollments').doc(enrollmentId);
    await enrollmentRef.set({
      tutorId,
      studentEmail: email.toLowerCase(),
      studentName: firstName,
      studentSurname: surname,
      paymentStatus: 'pending',
      enrolledAt: new Date(),
      createdAt: new Date(),
    });

    // Generate PayFast payment link if price > 0
    if (classPrice > 0) {
      // Import PayFast config
      const { PAYFAST_CONFIG } = await import('@/lib/payfast');
      const { generateSignature } = await import('@/lib/payfast');
      
      // Calculate amount in cents
      const amountInCents = Math.round(classPrice * 100);
      const amount = (amountInCents / 100).toFixed(2);
      
      // Generate payment ID
      const paymentId = `enroll_${tutorId}_${enrollmentId}_${Date.now()}`;
      
      // Set return URL to password creation page
      const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/enroll/password?enrollmentId=${enrollmentId}`;
      const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/enroll?tutorId=${tutorId}`;
      const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payfast/webhook`;
      
      // Build PayFast data
      const payfastData: any = {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        name_first: firstName,
        name_last: surname,
        email_address: email,
        m_payment_id: paymentId,
        amount: amount,
        item_name: 'Class Enrollment',
        item_description: 'Enrollment for tutor classes',
        custom_str1: tutorId,
        custom_str2: enrollmentId,
        custom_str3: 'tutor-enrollment',
        merchant_id: PAYFAST_CONFIG.merchantId,
        merchant_key: PAYFAST_CONFIG.merchantKey,
      };
      
      // Generate signature
      const signature = generateSignature(payfastData);
      payfastData.signature = signature;
      
      // Build PayFast URL
      const payfastUrl = new URL(PAYFAST_CONFIG.sandbox ? PAYFAST_CONFIG.sandboxUrl : PAYFAST_CONFIG.liveUrl);
      Object.entries(payfastData).forEach(([key, value]) => {
        if (key !== 'url' && value) {
          payfastUrl.searchParams.append(key, String(value));
        }
      });

      return NextResponse.json({
        success: true,
        enrollmentId,
        paymentUrl: payfastUrl.toString(),
      });
    } else {
      // Free enrollment - skip payment
      await enrollmentRef.update({
        paymentStatus: 'completed',
      });

      return NextResponse.json({
        success: true,
        enrollmentId,
        paymentUrl: null,
        redirectTo: `/enroll/password?enrollmentId=${enrollmentId}`,
      });
    }
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}

