import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { randomBytes, createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enrollmentId, password } = body;

    if (!enrollmentId || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: enrollmentId, password' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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

    // Hash password (simple hash for now - in production use bcrypt)
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256').update(password + salt).digest('hex');
    const passwordHash = `${salt}:${hash}`;

    // Update enrollment with password hash
    await enrollmentRef.update({
      passwordHash,
      passwordSetAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting password:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}



