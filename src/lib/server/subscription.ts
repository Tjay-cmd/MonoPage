import type { SubscriptionTier, UserSubscription } from '../subscription';
import { adminDb } from './firebaseAdmin';

const USERS_COLLECTION = 'users';

function nowDate() {
  return new Date();
}

function normalizeUpdates(updates: Partial<UserSubscription>) {
  const filteredEntries = Object.entries(updates).filter(
    ([, value]) => value !== undefined,
  );
  return Object.fromEntries(filteredEntries);
}

function buildSubscriptionFromData(
  data: (Partial<UserSubscription> & { tier?: SubscriptionTier | string }) | undefined,
): UserSubscription {
  const tierValue = data?.tier || (data as any)?.subscriptionTier || 'free';
  const tier = (typeof tierValue === 'string'
    ? tierValue.toLowerCase().trim()
    : 'free') as SubscriptionTier;

  return {
    tier,
    status:
      (typeof data?.status === 'string'
        ? data.status
        : (data as any)?.subscriptionStatus) || 'active',
    payfastToken: data?.payfastToken,
    createdAt:
      (data?.createdAt instanceof Date
        ? data.createdAt
        : data?.createdAt
        ? new Date((data.createdAt as any).toDate?.() ?? data.createdAt)
        : nowDate()) ?? nowDate(),
    updatedAt:
      (data?.updatedAt instanceof Date
        ? data.updatedAt
        : data?.updatedAt
        ? new Date((data.updatedAt as any).toDate?.() ?? data.updatedAt)
        : nowDate()) ?? nowDate(),
    trialEndsAt:
      data?.trialEndsAt instanceof Date
        ? data.trialEndsAt
        : (data?.trialEndsAt as any)?.toDate?.(),
    nextBillingDate:
      data?.nextBillingDate instanceof Date
        ? data.nextBillingDate
        : (data?.nextBillingDate as any)?.toDate?.(),
  };
}

function permissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  if (code === 'permission-denied' || code === 7) {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message.toLowerCase().includes('insufficient permissions');
}

export async function getUserSubscriptionServer(
  userId: string,
): Promise<UserSubscription> {
  try {
    const userDoc = await adminDb.collection(USERS_COLLECTION).doc(userId).get();

    if (!userDoc.exists) {
      return buildSubscriptionFromData({
        tier: 'free',
        status: 'active',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      });
    }

    const data = userDoc.data() as Partial<UserSubscription> & {
      tier?: SubscriptionTier;
    };

    return buildSubscriptionFromData(data);
  } catch (error) {
    if (permissionDenied(error)) {
      console.warn(
        '[subscription] Falling back to free tier due to permission error.',
        { userId, error },
      );
      return buildSubscriptionFromData({
        tier: 'free',
        status: 'active',
        createdAt: nowDate(),
        updatedAt: nowDate(),
      });
    }

    console.error('[subscription] Failed to read subscription via admin SDK.', {
      userId,
      error,
    });
    throw error;
  }
}

export async function updateUserSubscriptionServer(
  userId: string,
  updates: Partial<UserSubscription>,
) {
  try {
    const normalized = normalizeUpdates(updates);
    const updatePayload = {
      ...normalized,
      updatedAt: nowDate(),
    };

    await adminDb.collection(USERS_COLLECTION).doc(userId).set(updatePayload, {
      merge: true,
    });
  } catch (error) {
    if (permissionDenied(error)) {
      console.warn(
        '[subscription] Skipping admin subscription update due to permission error.',
        { userId, updates, error },
      );
      return;
    }

    console.error('[subscription] Failed to update subscription.', {
      userId,
      updates,
      error,
    });
    throw error;
  }
}

export async function isAdminUserServer(userId: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection(USERS_COLLECTION).doc(userId).get();
    const data = userDoc.data() as Partial<UserSubscription> & {
      tier?: SubscriptionTier;
    };
    const tier = data?.tier || data?.subscriptionTier;
    return typeof tier === 'string' && tier.toLowerCase().trim() === 'admin';
  } catch (error) {
    if (permissionDenied(error)) {
      console.warn(
        '[subscription] Unable to verify admin tier due to permission error, assuming non-admin.',
        { userId },
      );
      return false;
    }

    console.error('[subscription] Failed to determine admin tier.', {
      userId,
      error,
    });
    throw error;
  }
}

