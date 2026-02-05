'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { getBusinessDashboardRoute } from '@/lib/routeGuards';
import { BusinessType } from '@/types';

export default function BusinessDashboardRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [loading, setLoading] = useState(true);
  const hasRedirectedRef = useRef(false);

  // If we're already on a profession-specific dashboard, don't render anything
  if (pathname && pathname !== '/dashboard/business') {
    return null;
  }

  useEffect(() => {
    // Wait for subscription to finish loading from database
    if (subscriptionLoading) {
      return;
    }

    // Don't redirect if we're already on a profession-specific dashboard
    if (pathname && pathname !== '/dashboard/business') {
      return;
    }

    const checkAndRedirect = async () => {
      // Prevent multiple redirects
      if (hasRedirectedRef.current) {
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      // Double-check pathname before redirecting
      if (pathname && pathname !== '/dashboard/business') {
        return;
      }

      try {
        // Load user profile to get businessType from database
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/users/profile', {
          headers: {
            'X-User-Id': currentUser.uid,
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to load profile');
          router.push('/dashboard/subscription');
          return;
        }

        const payload = await response.json();
        const profile = payload.profile as {
          businessType?: BusinessType;
          tier?: string;
        };

        // Get subscription tier from subscription hook (from database) or fallback to profile tier
        const subscriptionTier = subscription?.tier || profile.tier || 'free';
        
        // Check if user has business tier or higher
        const tierHierarchy: Record<string, number> = {
          free: 0,
          starter: 1,
          pro: 2,
          business: 3,
          premium: 4,
          admin: 5,
        };

        const userTierLevel = tierHierarchy[subscriptionTier] || 0;
        const requiredTierLevel = tierHierarchy['business'] || 0;

        console.log('Checking access:', { 
          subscriptionTier, 
          userTierLevel, 
          requiredTierLevel,
          businessType: profile.businessType 
        });

        // If user doesn't have business tier, redirect to subscription page
        if (userTierLevel < requiredTierLevel) {
          console.log('Insufficient tier, redirecting to subscription');
          router.push('/dashboard/subscription');
          return;
        }

        // Get businessType from database (default to barber if not set)
        const businessType = profile.businessType || 'barber';
        console.log('User businessType:', businessType);

        // Get the correct dashboard route and redirect
        const dashboardRoute = getBusinessDashboardRoute(businessType);
        console.log('Redirecting to:', dashboardRoute);
        
        // Only redirect if we're not already on the correct route
        if (pathname !== dashboardRoute) {
          hasRedirectedRef.current = true;
          router.push(dashboardRoute);
        }
      } catch (error) {
        console.error('Error loading profile or checking access:', error);
        // On error, redirect to subscription page
        router.push('/dashboard/subscription');
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      // Check and redirect when auth state changes
      checkAndRedirect();
    });

    // Also check immediately
    checkAndRedirect();

    return () => {
      unsubscribe();
    };
  }, [router, subscription, subscriptionLoading, pathname]);

  // Show loading state while subscription is loading or while redirecting
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here, but just in case)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
