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

    // Allow public access for calendar display (no auth required for viewing)
    // Auth is only required for editing

    // Get calendar settings from Firestore
    const calendarRef = adminDb.collection('businessCalendars').doc(userId);
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
        bookings: [],
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

    // Get bookings (optional - handle gracefully if index doesn't exist)
    let bookings: any[] = [];
    try {
      const bookingsRef = adminDb.collection('bookings')
        .where('userId', '==', userId)
        .where('status', 'in', ['confirmed', 'pending'])
        .orderBy('date', 'asc')
        .orderBy('time', 'asc');
      
      const bookingsSnapshot = await bookingsRef.get();
      bookings = bookingsSnapshot.docs.map(doc => {
        const bookingData = doc.data();
        return {
          id: doc.id,
          date: bookingData.date,
          time: bookingData.time,
          endTime: bookingData.endTime,
          clientName: bookingData.clientName,
          clientPhone: bookingData.clientPhone,
          clientEmail: bookingData.clientEmail,
          serviceType: bookingData.serviceType,
          status: bookingData.status,
        };
      });
    } catch (bookingError: any) {
      // If index doesn't exist yet, just return empty bookings array
      // The settings will still load successfully
      console.warn('Could not fetch bookings (index may not exist yet):', bookingError.message);
      bookings = [];
    }

    return NextResponse.json({
      settings,
      bookings,
      lastUpdatedTimestamp,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      }
    });
  } catch (error) {
    console.error('Error fetching calendar settings:', error);
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
    const calendarRef = adminDb.collection('businessCalendars').doc(userId);
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
    console.error('Error saving calendar settings:', error);
    return NextResponse.json(
      { error: 'Failed to save calendar settings' },
      { status: 500 }
    );
  }
}

