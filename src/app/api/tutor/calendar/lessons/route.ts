import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Get lessons (similar to bookings but for tutors)
    // Using the same bookings collection but filtering by userId
    let lessons: any[] = [];
    try {
      const lessonsRef = adminDb.collection('bookings')
        .where('userId', '==', userId)
        .where('status', 'in', ['confirmed', 'pending'])
        .orderBy('date', 'asc')
        .orderBy('time', 'asc');
      
      const lessonsSnapshot = await lessonsRef.get();
      lessons = lessonsSnapshot.docs.map(doc => {
        const lessonData = doc.data();
        return {
          id: doc.id,
          date: lessonData.date,
          time: lessonData.time,
          endTime: lessonData.endTime,
          studentName: lessonData.clientName, // Using clientName as studentName
          studentPhone: lessonData.clientPhone,
          studentEmail: lessonData.clientEmail,
          lessonType: lessonData.serviceType, // Using serviceType as lessonType
          status: lessonData.status,
        };
      });
    } catch (lessonError: any) {
      // If index doesn't exist yet, just return empty lessons array
      console.warn('Could not fetch lessons (index may not exist yet):', lessonError.message);
      lessons = [];
    }

    return NextResponse.json({
      lessons,
    });
  } catch (error) {
    console.error('Error fetching tutor lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}



