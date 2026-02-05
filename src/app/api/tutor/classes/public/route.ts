import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

// Public endpoint to get tutor classes for published websites
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get all classes for this tutor (public read - no auth required)
    try {
      const classesRef = adminDb.collection('tutor-classes')
        .where('tutorId', '==', userId);
      
      const classesSnapshot = await classesRef.get();
      const classes = classesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || '',
          color: data.color || '#f59e0b',
          coverImageUrl: data.coverImageUrl || null,
          paymentLink: data.paymentLink || null,
        };
      });

      return NextResponse.json({
        classes,
      });
    } catch (error: any) {
      console.error('Error fetching tutor classes:', error);
      return NextResponse.json({ classes: [] });
    }
  } catch (error) {
    console.error('Error in public classes endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}



