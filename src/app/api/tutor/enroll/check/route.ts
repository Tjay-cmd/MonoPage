import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutorId');
    const email = searchParams.get('email');

    if (!tutorId || !email) {
      return NextResponse.json(
        { error: 'Missing tutorId or email' },
        { status: 400 }
      );
    }

    // Check enrollment
    const enrollmentRef = adminDb.collection('tutor-enrollments')
      .where('tutorId', '==', tutorId)
      .where('studentEmail', '==', email.toLowerCase())
      .limit(1);

    const enrollmentSnapshot = await enrollmentRef.get();

    if (enrollmentSnapshot.empty) {
      return NextResponse.json({
        enrolled: false,
      });
    }

    const enrollment = enrollmentSnapshot.docs[0].data();

    return NextResponse.json({
      enrolled: enrollment.paymentStatus === 'completed',
      classId: enrollment.classId || null,
      enrollmentId: enrollmentSnapshot.docs[0].id,
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to check enrollment' },
      { status: 500 }
    );
  }
}

