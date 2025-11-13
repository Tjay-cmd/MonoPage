import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  normalizeTier,
  hasTierAccess as hasTierAccessUtil,
  canAccessFeature as canAccessFeatureUtil,
  isAdminTier,
  type SubscriptionTier,
} from './rbac';

export type { SubscriptionTier } from './rbac';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'active' | 'trial' | 'cancelled' | 'past_due';
  payfastToken?: string;
  createdAt: Date;
  updatedAt: Date;
  trialEndsAt?: Date;
  nextBillingDate?: Date;
}

// Get user's subscription from Firestore
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    console.log('🔍 Getting subscription for user:', userId);

    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      console.log('❌ User document not found, returning free tier');
      return {
        tier: 'free',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const userData = userDoc.data();
    console.log('📄 User subscription data:', userData);

    return {
      tier: normalizeTier(
        (userData?.tier || userData?.subscriptionTier || 'free') as string,
      ),
      status: userData?.status || userData?.subscriptionStatus || 'active',
      payfastToken: userData?.payfastToken,
      createdAt: userData?.createdAt?.toDate?.() || new Date(userData?.createdAt || Date.now()),
      updatedAt: userData?.updatedAt?.toDate?.() || new Date(userData?.updatedAt || Date.now()),
      trialEndsAt: userData?.trialEndsAt?.toDate?.(),
      nextBillingDate: userData?.nextBillingDate?.toDate?.(),
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    if ((error as any)?.code === 'permission-denied') {
      throw error;
    }
    // Return free tier as fallback for non-permission errors
    return {
      tier: 'free',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// Update user's subscription tier
export async function updateUserSubscription(
  userId: string,
  updates: Partial<UserSubscription>
): Promise<void> {
  try {
    console.log('📝 Updating subscription for user:', userId, 'with data:', updates);

    const userRef = doc(db, 'users', userId);

    // Filter out undefined values to prevent Firestore errors
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    const updateData = {
      ...filteredUpdates,
      updatedAt: new Date(),
    };

    console.log('📝 Final update data:', updateData);

    // Use setDoc with merge to handle both new and existing documents
    await setDoc(userRef, updateData, { merge: true });

    console.log('✅ Subscription updated successfully for user:', userId);
  } catch (error) {
    console.error('❌ Error updating user subscription:', error);
    throw error;
  }
}

// Check if user has access to a specific tier or feature
export const hasTierAccess = hasTierAccessUtil;

// Get tier-specific limits
export function getTierLimits(tier: SubscriptionTier) {
  const limits = {
    free: {
      websites: 1,
      storage: 50 * 1024 * 1024, // 50MB
      pages: 1,
      templates: 0, // no templates
    },
    starter: {
      websites: 3,
      storage: 500 * 1024 * 1024, // 500MB
      pages: 1,
      templates: 5, // basic templates
    },
    pro: {
      websites: 3,
      storage: 1 * 1024 * 1024 * 1024, // 1GB
      pages: 1,
      templates: -1, // unlimited one-page templates
    },
    business: {
      websites: 10,
      storage: 5 * 1024 * 1024 * 1024, // 5GB
      pages: 1, // still one-page but with advanced features
      templates: -1,
    },
    premium: {
      websites: -1, // unlimited
      storage: 20 * 1024 * 1024 * 1024, // 20GB
      pages: -1, // unlimited pages
      templates: -1,
    },
    admin: {
      websites: -1,
      storage: -1, // unlimited
      pages: -1,
      templates: -1,
    },
  };

  return limits[tier];
}

// Check if user can access a specific feature
export const canAccessFeature = canAccessFeatureUtil;

// Check if user is admin (helper function)
export const isAdmin = isAdminTier;

// Check if user can manage templates (admin only)
export function canManageTemplates(tier: SubscriptionTier): boolean {
  return isAdminTier(tier);
}
