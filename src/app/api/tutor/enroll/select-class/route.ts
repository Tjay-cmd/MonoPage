import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enrollmentId, classId } = body;

    if (!enrollmentId || !classId) {
      return NextResponse.json(
        { error: 'Missing required fields: enrollmentId, classId' },
        { status: 400 }
      );
    }

    // Get enrollment
    const enrollmentRef = adminDb.collection('tutor-enrollments').doc(enrollmentId);
    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    const enrollmentData = enrollmentDoc.data();
    
    // Check if payment is completed
    if (enrollmentData?.paymentStatus !== 'completed') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Verify class exists and belongs to tutor
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const classData = classDoc.data();
    if (classData?.tutorId !== enrollmentData?.tutorId) {
      return NextResponse.json(
        { error: 'Class does not belong to this tutor' },
        { status: 403 }
      );
    }

    // Update enrollment with selected class
    await enrollmentRef.update({
      classId,
      classSelectedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting class:', error);
    return NextResponse.json(
      { error: 'Failed to select class' },
      { status: 500 }
    );
  }
}



