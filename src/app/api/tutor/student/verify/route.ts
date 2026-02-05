import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tutorId, email, classId } = body;

    if (!tutorId || !email || !classId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify enrollment
    const enrollmentRef = adminDb.collection('tutor-enrollments')
      .where('tutorId', '==', tutorId)
      .where('studentEmail', '==', email.toLowerCase())
      .where('classId', '==', classId)
      .limit(1);

    const enrollmentSnapshot = await enrollmentRef.get();

    if (enrollmentSnapshot.empty) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const enrollment = enrollmentSnapshot.docs[0].data();

    if (enrollment.paymentStatus !== 'completed') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 403 }
      );
    }

    // Get class name
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    const classDoc = await classRef.get();
    const className = classDoc.exists ? classDoc.data()?.name : '';

    return NextResponse.json({
      success: true,
      className,
    });
  } catch (error) {
    console.error('Error verifying student:', error);
    return NextResponse.json(
      { error: 'Failed to verify access' },
      { status: 500 }
    );
  }
}

