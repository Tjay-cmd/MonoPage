'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  X,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function ManageBookingsPage() {
  const router = useRouter();
  const {
    subscription: subscriptionData,
    loading: subscriptionLoading,
    hasTierAccess,
  } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      
      setLoading(false);
      
      // Load bookings - no tier check needed since parent route (/dashboard/business) already protects access
      await loadBookings(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadBookings = async (uid: string) => {
    try {
      setRefreshing(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const response = await fetch('/api/calendar/bookings', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      } else {
        console.error('Failed to load bookings');
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      // Update booking status to cancelled
      const response = await fetch(`/api/calendar/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'X-User-Id': auth.currentUser?.uid || '',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      
      if (response.ok) {
        // Reload bookings
        await loadBookings(auth.currentUser?.uid || '');
      } else {
        alert('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filterStatus === 'all') return true;
    return booking.status === filterStatus;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Mono Page</span>
          </Link>
        </div>

        <div className="flex-1 p-6">
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Business</h2>
            <div className="space-y-1">
              <Link
                href="/dashboard/business"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Calendar & Bookings</span>
              </Link>
              <Link
                href="/dashboard/business/bookings"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg bg-orange-100 text-orange-700 cursor-pointer transition-colors w-full text-left"
              >
                <User className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Manage Bookings</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Bookings</h1>
              <p className="text-lg text-gray-600">
                View and manage all client bookings from your calendar
              </p>
            </div>
            <button
              onClick={() => loadBookings(auth.currentUser?.uid || '')}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">Filter by status:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filterStatus === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filterStatus === 'confirmed'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({bookings.filter(b => b.status === 'pending').length})
            </button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {sortedBookings.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">
                {filterStatus === 'all' 
                  ? "You don't have any bookings yet. Bookings will appear here when clients book appointments on your website."
                  : `No ${filterStatus} bookings found.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Date & Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Service</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{formatDate(booking.date)}</div>
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{booking.time}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{booking.clientName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {booking.clientPhone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{booking.clientPhone}</span>
                            </div>
                          )}
                          {booking.clientEmail && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span>{booking.clientEmail}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {booking.serviceType || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status || 'confirmed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(booking.status === 'confirmed' || booking.status === 'pending') && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

