import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
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

    return NextResponse.json({
      booking: {
        id: bookingDoc.id,
        clientName: bookingData.clientName,
        date: bookingData.date,
        time: bookingData.time,
        serviceType: bookingData.serviceType,
      },
    });
  } catch (error) {
    console.error('Error verifying booking token:', error);
    return NextResponse.json(
      { error: 'Failed to verify booking' },
      { status: 500 }
    );
  }
}

