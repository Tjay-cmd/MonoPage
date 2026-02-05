'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight } from 'lucide-react';

function StudentLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tutorId = searchParams.get('tutorId');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorId) {
      setError('Invalid login link');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/tutor/student/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorId,
          email,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store email for future reference
        localStorage.setItem(`student_email_${tutorId}`, email);
        
        // Redirect to student portal
        if (data.classId) {
          router.push(`/student/${tutorId}/classes/${data.classId}`);
        } else {
          router.push(`/student/${tutorId}`);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid email or password');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
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
            <p className="text-gray-600">This login link is invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Lock className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Login</h1>
          <p className="text-gray-600">Access your enrolled classes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {submitting ? (
              'Logging in...'
            ) : (
              <>
                Login
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div>}>
      <StudentLoginContent />
    </Suspense>
  );
}