import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { verifyRequestUser, UnauthorizedError } from '@/lib/server/requestAuth';
import { getUserSubscriptionServer } from '@/lib/server/subscription';

type TemplateDocument = {
  name?: string;
  category?: string;
  description?: string;
  previewImage?: string;
  previewImageUrl?: string;
  status?: string;
  createdAt?: FirebaseFirestore.Timestamp | Date | number;
  updatedAt?: FirebaseFirestore.Timestamp | Date | number;
  editableElements?: unknown[];
  grapesJsData?: string;
  zipUrl?: string;
  downloadURL?: string;
  fileUrl?: string;
  url?: string;
};

function serializeDate(value: TemplateDocument['createdAt']) {
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

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;
    let subscriptionTier: string | null = null;

    try {
      const authUser = await verifyRequestUser(request);
      userId = authUser.uid;
      const subscription = await getUserSubscriptionServer(authUser.uid);
      subscriptionTier = subscription.tier;
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        throw error;
      }
      // Template browsing is allowed without authentication;
      // keep tier null so clients can treat unauthenticated as free.
    }

    const snapshot = await adminDb
      .collection('templates')
      .where('status', '==', 'active')
      .get();

    const templates = snapshot.docs.map((doc) => {
      const data = doc.data() as TemplateDocument;
      const primaryPreview = data.previewImageUrl || data.previewImage;
      const fileUrl =
        data.zipUrl || data.downloadURL || data.url || data.fileUrl || null;

      return {
        id: doc.id,
        name: data.name ?? 'Untitled template',
        category: data.category ?? 'general',
        description: data.description ?? '',
        previewImageUrl: primaryPreview ?? null,
        previewImage: primaryPreview ?? null,
        fileUrl,
        grapesJsData: data.grapesJsData ?? null,
        editableElements: data.editableElements ?? [],
        createdAt: serializeDate(data.createdAt),
        updatedAt: serializeDate(data.updatedAt),
        status: data.status ?? 'inactive',
      };
    });

    return NextResponse.json({
      success: true,
      templates,
      subscriptionTier,
      userId,
    });
  } catch (error) {
    console.error('[api/templates/list] Failed to load templates', error);
    return NextResponse.json(
      {
        error: 'Failed to load templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

