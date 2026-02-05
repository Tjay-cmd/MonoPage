import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/server/firebaseAdmin';
import { randomBytes } from 'crypto';

const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const zipFile = formData.get('zipFile') as File;
    const clientEmail = formData.get('clientEmail') as string;
    const clientName = formData.get('clientName') as string;
    const sessionId = formData.get('sessionId') as string | null;
    const originalFileCount = parseInt(formData.get('originalFileCount') as string || '0');

    // Validate required fields
    if (!zipFile || !clientEmail || !clientName) {
      return NextResponse.json(
        { error: 'Missing required fields: zipFile, clientEmail, clientName' },
        { status: 400 }
      );
    }

    // Validate ZIP file size
    if (zipFile.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        { error: `ZIP file is too large (${(zipFile.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 500MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    if (zipFile.type !== 'application/zip' && !zipFile.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'File must be a ZIP archive' },
        { status: 400 }
      );
    }

    // Generate delivery ID
    const deliveryId = randomBytes(16).toString('hex');
    const storagePath = `photographer-deliveries/${userId}/${deliveryId}/photos.zip`;

    // Upload ZIP to Firebase Storage
    const bucket = adminStorage.bucket();
    const file = bucket.file(storagePath);
    
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    await file.save(buffer, {
      contentType: 'application/zip',
      metadata: {
        contentType: 'application/zip',
      },
    });

    // Make file publicly readable (for download links)
    await file.makePublic();

    // Get download URL
    const zipUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Create Firestore document
    const deliveryRef = adminDb.collection('photographerDeliveries').doc(deliveryId);
    await deliveryRef.set({
      userId,
      clientEmail,
      clientName,
      sessionId: sessionId || null,
      zipPath: storagePath,
      zipUrl,
      zipSize: zipFile.size,
      originalFileCount,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      deliveryId,
      zipSize: zipFile.size,
    });
  } catch (error) {
    console.error('Error creating delivery:', error);
    return NextResponse.json(
      { error: 'Failed to create delivery' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch deliveries for user
    // Try with orderBy first, fallback to without if index doesn't exist
    let deliveriesSnapshot;
    try {
      deliveriesSnapshot = await adminDb.collection('photographerDeliveries')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    } catch (indexError: any) {
      // If index doesn't exist, fetch without orderBy and sort in memory
      console.warn('Index not found, fetching without orderBy:', indexError.message);
      const allDocs = await adminDb.collection('photographerDeliveries')
        .where('userId', '==', userId)
        .limit(50)
        .get();
      
      // Sort in memory
      const sortedDocs = allDocs.docs.sort((a, b) => {
        const aTime = a.data().createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.data().createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime; // Descending order
      });
      
      deliveriesSnapshot = {
        docs: sortedDocs,
      } as any;
    }

    const deliveries = deliveriesSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        clientEmail: data.clientEmail,
        clientName: data.clientName,
        sessionId: data.sessionId,
        zipSize: data.zipSize,
        originalFileCount: data.originalFileCount,
        status: data.status,
        deliveryMethod: data.deliveryMethod,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        errorMessage: data.errorMessage,
      };
    });

    return NextResponse.json({ deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}

