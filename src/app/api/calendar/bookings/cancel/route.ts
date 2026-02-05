import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { sendBookingCancellation } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Cancellation token is required' },
        { status: 400 }
      );
    }

    // Find booking by cancellation token
    const bookingsSnapshot = await adminDb.collection('bookings')
      .where('cancellationToken', '==', token)
      .where('status', 'in', ['confirmed', 'pending'])
      .limit(1)
      .get();

    if (bookingsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Booking not found or already cancelled' },
        { status: 404 }
      );
    }

    const bookingDoc = bookingsSnapshot.docs[0];
    const bookingData = bookingDoc.data();
    const bookingId = bookingDoc.id;

    // Update booking status to cancelled
    await bookingDoc.ref.update({
      status: 'cancelled',
      updatedAt: new Date(),
    });

    // Send cancellation confirmation email if email is provided
    if (bookingData.clientEmail) {
      try {
        // Get business name from user profile
        const userDoc = await adminDb.collection('users').doc(bookingData.userId).get();
        const userData = userDoc.data();
        const businessName = userData?.businessName || userData?.displayName || 'Your Business';

        await sendBookingCancellation({
          to: bookingData.clientEmail,
          clientName: bookingData.clientName,
          date: bookingData.date,
          time: bookingData.time,
          businessName,
        });
        console.log(`✅ Cancellation confirmation email sent to ${bookingData.clientEmail}`);
      } catch (emailError) {
        // Don't fail cancellation if email fails
        console.error('Failed to send cancellation email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}

