import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { sendBookingConfirmation } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Allow public bookings (no auth required for clients booking on website)
    // Auth is only required for viewing/managing bookings

    const body = await request.json();
    const {
      date,
      time,
      endTime,
      clientName,
      clientPhone,
      clientEmail,
      serviceType,
    } = body;

    // Validate required fields
    if (!date || !time || !clientName || !clientPhone) {
      const missingFields = [];
      if (!date) missingFields.push('date');
      if (!time) missingFields.push('time');
      if (!clientName) missingFields.push('name');
      if (!clientPhone) missingFields.push('phone');
      
      return NextResponse.json(
        { error: `Please fill in all required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if slot is already booked
    const existingBooking = await adminDb.collection('bookings')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .where('time', '==', time)
      .where('status', 'in', ['confirmed', 'pending'])
      .limit(1)
      .get();

    if (!existingBooking.empty) {
      return NextResponse.json(
        { error: `This time slot (${time}) is already booked. Please select another available time.` },
        { status: 400 }
      );
    }

    // Generate secure cancellation token
    const cancellationToken = randomBytes(32).toString('hex');

    // Create booking
    const bookingRef = adminDb.collection('bookings').doc();
    await bookingRef.set({
      userId,
      date,
      time,
      endTime: endTime || time,
      clientName,
      clientPhone,
      clientEmail: clientEmail || '',
      serviceType: serviceType || '',
      status: 'confirmed',
      cancellationToken, // Store token for cancellation
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send confirmation email if email is provided
    if (clientEmail) {
      try {
        // Get business name from user profile (optional)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const businessName = userData?.businessName || userData?.displayName || 'Your Business';

        await sendBookingConfirmation({
          to: clientEmail,
          clientName,
          date,
          time,
          serviceType: serviceType || undefined,
          cancellationToken,
          businessName,
        });
        console.log(`✅ Booking confirmation email sent to ${clientEmail}`);
      } catch (emailError) {
        // Don't fail the booking if email fails
        console.error('Failed to send booking email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: bookingRef.id,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    let bookings: any[] = [];
    
    try {
      // Try with orderBy first (requires index)
      let query = adminDb.collection('bookings')
        .where('userId', '==', userId)
        .where('status', 'in', ['confirmed', 'pending']);

      if (date) {
        query = query.where('date', '==', date);
      }

      const bookingsSnapshot = await query
        .orderBy('date', 'asc')
        .orderBy('time', 'asc')
        .get();

      bookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date,
          time: data.time,
          endTime: data.endTime,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          clientEmail: data.clientEmail,
          serviceType: data.serviceType,
          status: data.status,
        };
      });
    } catch (indexError: any) {
      // If index doesn't exist, fetch without orderBy and sort in memory
      console.warn('Index not found, fetching without orderBy:', indexError.message);
      try {
        let query = adminDb.collection('bookings')
          .where('userId', '==', userId);

        if (date) {
          query = query.where('date', '==', date);
        }

        const bookingsSnapshot = await query.get();
        bookings = bookingsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              date: data.date,
              time: data.time,
              endTime: data.endTime,
              clientName: data.clientName,
              clientPhone: data.clientPhone,
              clientEmail: data.clientEmail,
              serviceType: data.serviceType,
              status: data.status,
            };
          })
          .filter((b: any) => b.status === 'confirmed' || b.status === 'pending' || !b.status)
          .sort((a: any, b: any) => {
            // Sort by date first, then time
            if (a.date !== b.date) {
              return a.date.localeCompare(b.date);
            }
            return a.time.localeCompare(b.time);
          });
      } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
          { error: 'Failed to fetch bookings' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ bookings }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

