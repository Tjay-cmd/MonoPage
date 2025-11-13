import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { verifyRequestUser, UnauthorizedError } from '@/lib/server/requestAuth';
import { getUserSubscriptionServer } from '@/lib/server/subscription';
import { canAccessFeature } from '@/lib/rbac';

type MerchantSettings = {
  merchantId: string;
  merchantKey: string;
  passPhrase?: string;
  environment?: 'sandbox' | 'production';
  updatedAt?: FirebaseFirestore.Timestamp | Date | number;
};

type ServiceDocument = FirebaseFirestore.DocumentData & {
  userId: string;
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  category?: string;
  isActive?: boolean;
  payfastLink?: string;
  createdAt?: FirebaseFirestore.Timestamp | Date | number;
  updatedAt?: FirebaseFirestore.Timestamp | Date | number;
};

function serializeFirestoreDate(value?: FirebaseFirestore.Timestamp | Date | number | null) {
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

async function loadMerchantSettings(userId: string) {
  try {
    const doc = await adminDb.collection('merchantSettings').doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data() as MerchantSettings;
    return {
      ...data,
      updatedAt: serializeFirestoreDate(data.updatedAt ?? null),
    };
  } catch (error) {
    if (permissionDenied(error)) {
      console.warn('[api/services] Permission denied reading merchant settings.', {
        userId,
      });
      return null;
    }

    throw error;
  }
}

async function loadServices(userId: string) {
  try {
    const querySnapshot = await adminDb
      .collection('services')
      .where('userId', '==', userId)
      .get();

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as ServiceDocument;
      return {
        id: doc.id,
        ...data,
        createdAt: serializeFirestoreDate(data.createdAt),
        updatedAt: serializeFirestoreDate(data.updatedAt),
      };
    });
  } catch (error) {
    if (permissionDenied(error)) {
      console.warn('[api/services] Permission denied reading services.', { userId });
      return [];
    }

    throw error;
  }
}

function assertPayfastAccess(tier: string) {
  if (!canAccessFeature(tier as any, 'payfast')) {
    throw Object.assign(new UnauthorizedError('Upgrade to Pro to manage services.', 403), {
      code: 'insufficient-tier',
    });
  }
}

async function resolveUserContext(request: NextRequest) {
  const url = new URL(request.url);
  try {
    const authUser = await verifyRequestUser(request);
    return {
      uid: authUser.uid,
      email: authUser.email ?? null,
      verified: true,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const fallbackUid =
        request.headers.get('x-user-id') ?? url.searchParams.get('uid');

      if (!fallbackUid) {
        throw error;
      }

      console.warn(
        '[api/services] Falling back to unverified UID from headers/query.',
        { uid: fallbackUid },
      );

      return {
        uid: fallbackUid,
        email: request.headers.get('x-user-email') ?? url.searchParams.get('email'),
        verified: false,
      };
    }

    throw error;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fallbackUidHeader =
    request.headers.get('x-user-id') ?? url.searchParams.get('uid');
  let context:
    | { uid: string; email: string | null; verified: boolean }
    | null = null;

  try {
    context = await resolveUserContext(request);
    const subscription = await getUserSubscriptionServer(context.uid);

    if (!canAccessFeature(subscription.tier, 'payfast')) {
      return NextResponse.json({
        success: true,
        services: [],
        merchantSettings: null,
        subscriptionTier: subscription.tier,
      });
    }

    try {
      const [services, merchantSettings] = await Promise.all([
        loadServices(context.uid),
        loadMerchantSettings(context.uid),
      ]);

      return NextResponse.json({
        success: true,
        services,
        merchantSettings,
        subscriptionTier: subscription.tier,
      });
    } catch (firestoreError) {
      if (permissionDenied(firestoreError)) {
        console.warn('[api/services] Falling back to empty service list.', {
          uid: context.uid,
        });
        return NextResponse.json({
          success: true,
          services: [],
          merchantSettings: null,
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
      error instanceof Error ? error.message : 'Failed to load services';
    console.error('[api/services] Falling back to empty service list.', {
      error: message,
    });

    const fallbackUid = context?.uid ?? fallbackUidHeader;
    if (fallbackUid) {
      return NextResponse.json({
        success: true,
        services: [],
        merchantSettings: null,
        subscriptionTier: 'free',
        warnings: ['fallback_services'],
        error: message,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to load services',
        details: message,
      },
      { status: 500 },
    );
  }
}

type ServiceActionPayload =
  | {
      action: 'create-service';
      service: {
        name: string;
        description: string;
        price: number;
        duration?: number;
        category?: string;
        isActive?: boolean;
        payfastLink?: string;
      };
    }
  | {
      action: 'update-service';
      serviceId: string;
      updates: Partial<{
        name: string;
        description: string;
        price: number;
        duration: number;
        category: string;
        isActive: boolean;
        payfastLink?: string;
      }>;
    }
  | {
    action: 'delete-service';
    serviceId: string;
  }
  | {
    action: 'set-merchant-settings';
    settings: {
      merchantId: string;
      merchantKey: string;
      passPhrase?: string;
      environment?: 'sandbox' | 'production';
    };
  }
  | {
    action: 'clear-merchant-settings';
  };

export async function POST(request: NextRequest) {
  try {
    const context = await resolveUserContext(request);
    const subscription = await getUserSubscriptionServer(context.uid);
    assertPayfastAccess(subscription.tier);

    const body = (await request.json()) as ServiceActionPayload;

    switch (body.action) {
      case 'create-service': {
        const now = new Date();
        const payload = {
          ...body.service,
          userId: context.uid,
          isActive: body.service.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };

        try {
          const docRef = await adminDb.collection('services').add(payload);

          return NextResponse.json({
            success: true,
            serviceId: docRef.id,
          });
        } catch (error) {
          if (permissionDenied(error)) {
            return NextResponse.json(
              {
                error: 'Admin credentials missing for service creation.',
                code: 'admin_permissions_missing',
              },
              { status: 403 },
            );
          }

          throw error;
        }
      }
      case 'update-service': {
        const updates = {
          ...body.updates,
          updatedAt: new Date(),
        };

        try {
          await adminDb.collection('services').doc(body.serviceId).set(updates, { merge: true });
        } catch (error) {
          if (permissionDenied(error)) {
            return NextResponse.json(
              {
                error: 'Admin credentials missing for service updates.',
                code: 'admin_permissions_missing',
              },
              { status: 403 },
            );
          }

          throw error;
        }
        return NextResponse.json({ success: true });
      }
      case 'delete-service': {
        try {
          await adminDb.collection('services').doc(body.serviceId).delete();
        } catch (error) {
          if (permissionDenied(error)) {
            return NextResponse.json(
              {
                error: 'Admin credentials missing for service deletion.',
                code: 'admin_permissions_missing',
              },
              { status: 403 },
            );
          }

          throw error;
        }
        return NextResponse.json({ success: true });
      }
      case 'set-merchant-settings': {
        try {
          await adminDb
            .collection('merchantSettings')
            .doc(context.uid)
            .set(
              {
                ...body.settings,
                updatedAt: new Date(),
              },
              { merge: true },
            );
        } catch (error) {
          if (permissionDenied(error)) {
            return NextResponse.json(
              {
                error: 'Admin credentials missing for merchant settings update.',
                code: 'admin_permissions_missing',
              },
              { status: 403 },
            );
          }

          throw error;
        }
        return NextResponse.json({ success: true });
      }
      case 'clear-merchant-settings': {
        try {
          await adminDb.collection('merchantSettings').doc(context.uid).delete();
        } catch (error) {
          if (permissionDenied(error)) {
            return NextResponse.json(
              {
                error: 'Admin credentials missing for merchant settings removal.',
                code: 'admin_permissions_missing',
              },
              { status: 403 },
            );
          }

          throw error;
        }
        return NextResponse.json({ success: true });
      }
      default: {
        return NextResponse.json(
          { error: 'Unsupported action', details: (body as { action: string }).action },
          { status: 400 },
        );
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[api/services] Action failed', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}


