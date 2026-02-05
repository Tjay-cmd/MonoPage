import { BusinessType } from '@/types';
import { SubscriptionTier } from './rbac';

export interface RouteGuardResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

/**
 * Checks if a user can access a profession-specific dashboard
 * @param userBusinessType - The user's business type from their profile
 * @param routeBusinessType - The business type required for this route
 * @param userTier - The user's subscription tier
 * @param requiredTier - The minimum tier required (default: 'business')
 * @returns RouteGuardResult with access decision and redirect path if needed
 */
export function checkBusinessDashboardAccess(
  userBusinessType: BusinessType | undefined | null,
  routeBusinessType: BusinessType,
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier = 'business'
): RouteGuardResult {
  // Check tier access first
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    business: 3,
    premium: 4,
    admin: 5,
  };

  const userTierLevel = tierHierarchy[userTier] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier] || 0;

  if (userTierLevel < requiredTierLevel) {
    return {
      allowed: false,
      redirectTo: '/dashboard/subscription',
      reason: `Upgrade to ${requiredTier} tier or higher to access business features`,
    };
  }

  // Check business type match
  if (!userBusinessType) {
    // If user doesn't have businessType set, default to barber (legacy support)
    return {
      allowed: routeBusinessType === 'barber',
      redirectTo: routeBusinessType !== 'barber' ? '/dashboard/business/barber' : undefined,
      reason: 'Business type not set, defaulting to barber',
    };
  }

  if (userBusinessType !== routeBusinessType) {
    // User is trying to access a different profession's dashboard
    return {
      allowed: false,
      redirectTo: `/dashboard/business/${userBusinessType}`,
      reason: `This dashboard is for ${routeBusinessType} businesses. Redirecting to your ${userBusinessType} dashboard.`,
    };
  }

  // All checks passed
  return {
    allowed: true,
  };
}

/**
 * Gets the correct dashboard route for a user based on their businessType
 * @param businessType - The user's business type
 * @returns The dashboard route path
 */
export function getBusinessDashboardRoute(businessType: BusinessType | undefined | null): string {
  if (!businessType) {
    return '/dashboard/business/barber'; // Default fallback
  }

  // Map business types to their dashboard routes
  const dashboardRoutes: Record<BusinessType, string> = {
    barber: '/dashboard/business/barber',
    photographer: '/dashboard/business/photographer',
    tutor: '/dashboard/business/tutor',
    'beauty-salon': '/dashboard/business/barber', // Share barber dashboard for now
    'fitness-trainer': '/dashboard/business/barber', // Share barber dashboard for now
    consultant: '/dashboard/business/barber', // Share barber dashboard for now
    other: '/dashboard/business/barber', // Default to barber
  };

  return dashboardRoutes[businessType] || '/dashboard/business/barber';
}

