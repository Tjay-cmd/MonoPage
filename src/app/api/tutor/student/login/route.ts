import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tutorId, email, password } = body;

    if (!tutorId || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: tutorId, email, password' },
        { status: 400 }
      );
    }

    // Find enrollment
    const enrollmentRef = adminDb.collection('tutor-enrollments')
      .where('tutorId', '==', tutorId)
      .where('studentEmail', '==', email.toLowerCase())
      .limit(1);

    const enrollmentSnapshot = await enrollmentRef.get();

    if (enrollmentSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const enrollment = enrollmentSnapshot.docs[0].data();
    const enrollmentId = enrollmentSnapshot.docs[0].id;

    // Check if payment is completed
    if (enrollment.paymentStatus !== 'completed') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 403 }
      );
    }

    // Verify password
    if (!enrollment.passwordHash) {
      return NextResponse.json(
        { error: 'Password not set. Please complete enrollment.' },
        { status: 403 }
      );
    }

    const [salt, hash] = enrollment.passwordHash.split(':');
    const passwordHash = createHash('sha256').update(password + salt).digest('hex');

    if (passwordHash !== hash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Return success with class ID
    return NextResponse.json({
      success: true,
      enrollmentId,
      classId: enrollment.classId || null,
      studentEmail: enrollment.studentEmail,
    });
  } catch (error) {
    console.error('Error logging in student:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}

