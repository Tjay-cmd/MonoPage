'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';

function EnrollContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tutorId = searchParams.get('tutorId');
  
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tutorId) {
      setError('Invalid enrollment link');
    }
  }, [tutorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorId) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/tutor/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorId,
          ...formData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to payment
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          setError('Payment URL not received');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start enrollment');
      }
    } catch (error: any) {
      console.error('Enrollment error:', error);
      setError('Failed to process enrollment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tutorId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600">This enrollment link is invalid or expired.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-4">
            <Lock className="h-10 w-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Access</h1>
          <p className="text-gray-600">Enter your details to enroll in classes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">
              Surname *
            </label>
            <input
              type="text"
              id="surname"
              required
              value={formData.surname}
              onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Continue to Payment</span>
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EnrollPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div>}>
      <EnrollContent />
    </Suspense>
  );
}
