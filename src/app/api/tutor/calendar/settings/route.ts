import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get('X-User-Id') || searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');
    const checkOnly = searchParams.get('checkOnly') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Get calendar settings from Firestore (tutor-calendar-settings collection)
    const calendarRef = adminDb.collection('tutor-calendar-settings').doc(userId);
    const calendarDoc = await calendarRef.get();

    if (!calendarDoc.exists) {
      // Return default settings if no calendar exists
      return NextResponse.json({
        settings: {
          timeIncrement: 60,
          startTime: '08:00',
          endTime: '18:00',
          lunchBreakStart: '12:00',
          lunchBreakEnd: '13:00',
          hasLunchBreak: true,
          closedOnWeekends: false,
          closedDates: [],
          design: {
            primaryColor: '#f59e0b',
            backgroundColor: '#ffffff',
            textColor: '#111827',
            borderColor: '#e5e7eb',
            selectedDayColor: '#fef3c7',
            closedDayColor: '#f3f4f6',
            buttonColor: '#f59e0b',
            buttonTextColor: '#ffffff',
          },
        },
        lessons: [],
        lastUpdatedTimestamp: Date.now(),
      });
    }

    const data = calendarDoc.data();
    
    // If only checking for updates, return just the timestamp
    if (checkOnly) {
      return NextResponse.json({
        lastUpdatedTimestamp: data?.lastUpdatedTimestamp || data?.updatedAt?.toMillis?.() || Date.now(),
      });
    }
    
    // Convert Firestore timestamps to ISO strings
    const settings = {
      timeIncrement: data?.timeIncrement || 60,
      startTime: data?.startTime || '08:00',
      endTime: data?.endTime || '18:00',
      lunchBreakStart: data?.lunchBreakStart || '12:00',
      lunchBreakEnd: data?.lunchBreakEnd || '13:00',
      hasLunchBreak: data?.hasLunchBreak !== undefined ? data.hasLunchBreak : true,
      closedOnWeekends: data?.closedOnWeekends || false,
      closedDates: data?.closedDates || [],
      design: data?.design || {
        primaryColor: '#f59e0b',
        backgroundColor: '#ffffff',
        textColor: '#111827',
        borderColor: '#e5e7eb',
        selectedDayColor: '#fef3c7',
        closedDayColor: '#f3f4f6',
        buttonColor: '#f59e0b',
        buttonTextColor: '#ffffff',
      },
    };
    
    const lastUpdatedTimestamp = data?.lastUpdatedTimestamp || data?.updatedAt?.toMillis?.() || Date.now();

    return NextResponse.json({
      settings,
      lastUpdatedTimestamp,
    });
  } catch (error) {
    console.error('Error fetching tutor calendar settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Verify auth token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      timeIncrement,
      startTime,
      endTime,
      lunchBreakStart,
      lunchBreakEnd,
      hasLunchBreak,
      closedOnWeekends,
      closedDates,
      design,
    } = body;

    // Get existing settings to preserve design if not provided
    const calendarRef = adminDb.collection('tutor-calendar-settings').doc(userId);
    const existingDoc = await calendarRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};

    // Save calendar settings to Firestore
    const now = new Date();
    const updateData: any = {
      userId,
      updatedAt: now,
      lastUpdatedTimestamp: now.getTime(), // Add timestamp for cache busting
    };

    // Only update fields that are provided
    if (timeIncrement !== undefined) updateData.timeIncrement = timeIncrement;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (lunchBreakStart !== undefined) updateData.lunchBreakStart = lunchBreakStart;
    if (lunchBreakEnd !== undefined) updateData.lunchBreakEnd = lunchBreakEnd;
    if (hasLunchBreak !== undefined) updateData.hasLunchBreak = hasLunchBreak;
    if (closedOnWeekends !== undefined) updateData.closedOnWeekends = closedOnWeekends;
    if (closedDates !== undefined) updateData.closedDates = closedDates;
    if (design !== undefined) updateData.design = design;

    await calendarRef.set(updateData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving tutor calendar settings:', error);
    return NextResponse.json(
      { error: 'Failed to save calendar settings' },
      { status: 500 }
    );
  }
}



