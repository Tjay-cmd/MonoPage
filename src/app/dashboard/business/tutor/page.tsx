'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { checkBusinessDashboardAccess } from '@/lib/routeGuards';
import { BusinessType } from '@/types';
import { Calendar, Settings, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function TutorDashboardPage() {
  const router = useRouter();
  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Wait for subscription to finish loading from database
    if (subscriptionLoading) {
      return;
    }

    // Prevent multiple checks
    if (hasCheckedRef.current) {
      return;
    }

    const checkAccess = async () => {
      // Prevent multiple checks
      if (hasCheckedRef.current) {
        return;
      }
      hasCheckedRef.current = true;
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      // Wait for subscription to be loaded
      if (!subscription) {
        // If subscription is null after loading, check profile for tier
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch('/api/users/profile', {
            headers: {
              'X-User-Id': currentUser.uid,
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            const profile = payload.profile as { tier?: string };
            const profileTier = profile.tier || 'free';
            
            // Check if profile tier is business or higher
            const tierHierarchy: Record<string, number> = {
              free: 0,
              starter: 1,
              pro: 2,
              business: 3,
              premium: 4,
              admin: 5,
            };

            if ((tierHierarchy[profileTier] || 0) < 3) {
              router.push('/dashboard/subscription');
              return;
            }
          } else {
            router.push('/dashboard/subscription');
            return;
          }
        } catch (error) {
          console.error('Error checking access:', error);
          router.push('/dashboard/subscription');
          return;
        }
      } else {
        // Check tier access from subscription hook
        if (!hasTierAccess('business')) {
          router.push('/dashboard/subscription');
          return;
        }
      }

      // Load user profile to check businessType from database
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/users/profile', {
          headers: {
            'X-User-Id': currentUser.uid,
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const payload = await response.json();
          const profile = payload.profile as {
            businessType?: BusinessType;
          };

          const userBusinessType = profile.businessType || 'barber';
          const userTier = subscription?.tier || 'free';

          // Check if user should access this dashboard
          const guardResult = checkBusinessDashboardAccess(
            userBusinessType,
            'tutor',
            userTier as any,
            'business'
          );

          if (!guardResult.allowed) {
            // Redirect to correct dashboard
            router.push(guardResult.redirectTo || '/dashboard/business');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      // Check access when auth state changes
      checkAccess();
    });

    // Also check immediately
    checkAccess();

    return () => unsubscribe();
  }, [router, hasTierAccess, subscription, subscriptionLoading]);

  // Reset check flag when subscription changes
  useEffect(() => {
    if (!subscriptionLoading && subscription) {
      hasCheckedRef.current = false;
    }
  }, [subscription, subscriptionLoading]);

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center mb-4">
            <ArrowLeft className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm text-gray-600">Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Image
              src="/images/Logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded"
            />
            <h1 className="text-xl font-bold text-gray-900">Tutor Dashboard</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard/business/tutor/calendar"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-5 w-5" />
            <span>Calendar & Lessons</span>
          </Link>
          <Link
            href="/dashboard/business/tutor/resources"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-5 w-5" />
            <span>Resources</span>
          </Link>
          <Link
            href="/dashboard/business/tutor/classes"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <User className="h-5 w-5" />
            <span>Classes & Groups</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Tutor Dashboard</h1>
          <p className="text-gray-600 mb-8">
            Welcome to your tutor dashboard! Manage your lesson scheduling, resources, classes, and students.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/business/tutor/calendar"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <Calendar className="h-8 w-8 text-orange-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar & Lessons</h2>
              <p className="text-gray-600 text-sm">
                Schedule lessons and manage your availability
              </p>
            </Link>
            
            <Link
              href="/dashboard/business/tutor/resources"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <Settings className="h-8 w-8 text-orange-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Resources</h2>
              <p className="text-gray-600 text-sm">
                Upload and manage teaching resources
              </p>
            </Link>
            
            <Link
              href="/dashboard/business/tutor/classes"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <User className="h-8 w-8 text-orange-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Classes & Groups</h2>
              <p className="text-gray-600 text-sm">
                Create and manage classes and groups
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
