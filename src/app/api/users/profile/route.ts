import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { verifyRequestUser, UnauthorizedError } from '@/lib/server/requestAuth';
import { getUserSubscriptionServer } from '@/lib/server/subscription';

type UserProfileDocument = {
  email?: string;
  businessName?: string;
  businessType?: string;
  tier?: string;
  status?: string;
  createdAt?: FirebaseFirestore.Timestamp | Date | number;
  updatedAt?: FirebaseFirestore.Timestamp | Date | number;
};

function serializeDate(value: UserProfileDocument['createdAt']) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.valueOf();
  }

  const maybeTimestamp = value as FirebaseFirestore.Timestamp;
  if (typeof maybeTimestamp.toDate === 'function') {
    return maybeTimestamp.toDate().valueOf();
  }

  if (typeof value === 'number') {
    return value;
  }

  return null;
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

async function ensureUserProfile(
  userId: string,
  defaults: Pick<UserProfileDocument, 'email' | 'businessName' | 'businessType' | 'tier'>,
) {
  const now = new Date();
  try {
    const docRef = adminDb.collection('users').doc(userId);
    await docRef.set(
      {
        ...defaults,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
  } catch (error) {
    if (permissionDenied(error)) {
      console.warn(
        '[api/users/profile] Unable to persist profile via admin SDK, returning ephemeral profile.',
        { userId, error },
      );
    } else {
      throw error;
    }
  }

  return {
    id: userId,
    ...defaults,
    status: 'active',
    createdAt: now.valueOf(),
    updatedAt: now.valueOf(),
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fallbackUidHeader =
    request.headers.get('x-user-id') ?? url.searchParams.get('uid');
  const fallbackEmailHeader =
    request.headers.get('x-user-email') ?? url.searchParams.get('email');

  try {
    let resolvedUid: string | null = null;
    let resolvedEmail: string | null = null;

    try {
      const authUser = await verifyRequestUser(request);
      resolvedUid = authUser.uid;
      resolvedEmail = authUser.email ?? null;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        const fallbackUid =
          request.headers.get('x-user-id') ?? url.searchParams.get('uid');

        if (!fallbackUid) {
          throw error;
        }

        resolvedUid = fallbackUid;
        resolvedEmail =
          request.headers.get('x-user-email') ?? url.searchParams.get('email');

        console.warn(
          '[api/users/profile] Falling back to unverified UID from headers/query.',
          { uid: resolvedUid },
        );
      } else {
        throw error;
      }
    }

    if (!resolvedUid) {
      throw new UnauthorizedError('Missing user identifier.');
    }

    const subscription = await getUserSubscriptionServer(resolvedUid);

    try {
      const docRef = adminDb.collection('users').doc(resolvedUid);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return NextResponse.json({
          success: true,
          profile: await ensureUserProfile(resolvedUid, {
            email: resolvedEmail ?? '',
            businessName: resolvedEmail?.split('@')[0] ?? 'My Business',
            businessType: 'other',
            tier: subscription.tier,
          }),
          subscriptionTier: subscription.tier,
        });
      }

      const data = snapshot.data() as UserProfileDocument;
      return NextResponse.json({
        success: true,
        profile: {
          id: resolvedUid,
          email: data.email ?? resolvedEmail ?? '',
          businessName:
            data.businessName ??
            resolvedEmail?.split('@')[0] ??
            'My Business',
          businessType: data.businessType ?? 'other',
          tier: data.tier ?? subscription.tier,
          status: data.status ?? 'active',
          createdAt: serializeDate(data.createdAt),
          updatedAt: serializeDate(data.updatedAt),
        },
        subscriptionTier: subscription.tier,
      });
    } catch (firestoreError) {
      if (permissionDenied(firestoreError)) {
        console.warn(
          '[api/users/profile] Permission denied accessing user profile, serving fallback profile.',
          { uid: resolvedUid },
        );

        return NextResponse.json({
          success: true,
          profile: await ensureUserProfile(resolvedUid, {
            email: resolvedEmail ?? '',
            businessName: resolvedEmail?.split('@')[0] ?? 'My Business',
            businessType: 'other',
            tier: subscription.tier,
          }),
          subscriptionTier: subscription.tier,
          warnings: ['admin_permissions_missing'],
        });
      }

      throw firestoreError;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : 'Failed to load profile';
    console.error('[api/users/profile] Falling back to default profile.', {
      error: message,
    });

    if (fallbackUidHeader) {
      return NextResponse.json({
        success: true,
        profile: {
          id: fallbackUidHeader,
          email: fallbackEmailHeader ?? '',
          businessName: fallbackEmailHeader?.split('@')[0] ?? 'My Business',
          businessType: 'other',
          tier: 'free',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        subscriptionTier: 'free',
        warnings: ['fallback_profile'],
        error: message,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to load profile',
        details: message,
      },
      { status: 500 },
    );
  }
}

