'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

function CancelBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  useEffect(() => {
    if (token) {
      // Fetch booking details to show confirmation
      fetchBookingDetails(token);
    }
  }, [token]);

  const fetchBookingDetails = async (bookingToken: string) => {
    try {
      const response = await fetch(`/api/calendar/bookings/verify?token=${bookingToken}`);
      if (response.ok) {
        const data = await response.json();
        setBookingDetails(data.booking);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
  };

  const handleCancel = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid cancellation link. Please contact the business directly.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/calendar/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Your booking has been successfully cancelled.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to cancel booking. Please contact the business directly.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again or contact the business directly.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This cancellation link is invalid or has expired. Please contact the business directly to cancel your booking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {status === 'success' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Cancelled</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              You can close this page. A confirmation email has been sent to you.
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              Please contact the business directly if you need to cancel your booking.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Cancel Booking</h1>
              <p className="text-gray-600">
                Are you sure you want to cancel this booking?
              </p>
            </div>

            {bookingDetails && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Name:</span>
                    <span className="text-gray-900">{bookingDetails.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Date:</span>
                    <span className="text-gray-900">
                      {new Date(bookingDetails.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Time:</span>
                    <span className="text-gray-900">{bookingDetails.time}</span>
                  </div>
                  {bookingDetails.serviceType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Service:</span>
                      <span className="text-gray-900">{bookingDetails.serviceType}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => window.close()}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5" />
                    <span>Cancel Booking</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CancelBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>}>
      <CancelBookingContent />
    </Suspense>
  );
}