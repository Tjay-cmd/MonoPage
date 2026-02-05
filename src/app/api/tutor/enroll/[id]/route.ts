import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const enrollmentId = resolvedParams.id;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment ID required' },
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

    return NextResponse.json({
      tutorId: enrollmentData?.tutorId,
      studentEmail: enrollmentData?.studentEmail,
      paymentStatus: enrollmentData?.paymentStatus,
    });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollment' },
      { status: 500 }
    );
  }
}



