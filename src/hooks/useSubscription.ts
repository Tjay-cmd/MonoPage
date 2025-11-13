import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getUserSubscription, type UserSubscription, type SubscriptionTier } from '@/lib/subscription';
import { canAccessFeature as canAccessFeatureRbac } from '@/lib/rbac';

const DEFAULT_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'tjayburger2004@gmail.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

export function useSubscription() {
  const [user, loading] = useAuthState(auth);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!user) return;

    setSubscriptionLoading(true);

    const email = user.email?.toLowerCase() || '';
    const fallbackTier: SubscriptionTier = DEFAULT_ADMIN_EMAILS.includes(email) ? 'admin' : 'free';

    const applyFallback = (reason: string, error?: unknown) => {
      if (error) {
        console.error(reason, error);
      } else {
        console.warn(reason);
      }
      if (fallbackTier === 'admin') {
        console.warn('⚠️ Applying admin fallback subscription.', { email });
      }
      setSubscription({
        tier: fallbackTier,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    };

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/subscription/current', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Subscription API responded with status ${response.status}`);
      }

      const data = await response.json();
      const apiSubscription = data.subscription as {
        tier: SubscriptionTier;
        status: UserSubscription['status'];
        createdAt: number;
        updatedAt: number;
        trialEndsAt?: number | null;
        nextBillingDate?: number | null;
        payfastToken?: string;
      };

      if (!apiSubscription?.tier) {
        throw new Error('Subscription API returned an invalid payload');
      }

      const normalizedSubscription: UserSubscription = {
        tier: apiSubscription.tier,
        status: apiSubscription.status,
        payfastToken: apiSubscription.payfastToken,
        createdAt: new Date(apiSubscription.createdAt),
        updatedAt: new Date(apiSubscription.updatedAt),
        trialEndsAt: apiSubscription.trialEndsAt ? new Date(apiSubscription.trialEndsAt) : undefined,
        nextBillingDate: apiSubscription.nextBillingDate
          ? new Date(apiSubscription.nextBillingDate)
          : undefined,
      };

      setSubscription(normalizedSubscription);
      console.log('✅ Loaded subscription via API:', normalizedSubscription);
    } catch (apiError) {
      console.warn('⚠️ Subscription API failed, falling back to Firestore read.', apiError);
      try {
        const userSubscription = await getUserSubscription(user.uid);
        setSubscription(userSubscription);
        console.log('✅ Loaded subscription from Firestore:', userSubscription);
      } catch (firestoreError) {
        applyFallback('❌ Failed to load subscription from Firestore.', firestoreError);
      }
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      setSubscription(null);
      setSubscriptionLoading(false);
    }
  }, [user, loadSubscription]);

  const refreshSubscription = useCallback(() => {
    loadSubscription();
  }, [loadSubscription]);

  const isTier = (tier: SubscriptionTier): boolean => {
    return subscription?.tier === tier;
  };

  const hasTierAccess = (requiredTier: SubscriptionTier): boolean => {
    if (!subscription) return false;

    const tierHierarchy = {
      free: 0,
      starter: 1,
      pro: 2,
      business: 3,
      premium: 4,
      admin: 5,
    };

    return tierHierarchy[subscription.tier] >= tierHierarchy[requiredTier];
  };

  const canAccessFeature = (feature: string): boolean => {
    if (!subscription) return false;
    return checkFeatureAccess(subscription.tier, feature);
  };

  return {
    user,
    subscription,
    loading: loading || subscriptionLoading,
    isTier,
    hasTierAccess,
    canAccessFeature,
    refreshSubscription,
  };
}

// Helper function to check feature access (can be used outside of hook)
function checkFeatureAccess(tier: SubscriptionTier, feature: string): boolean {
  return canAccessFeatureRbac(tier, feature);
}
