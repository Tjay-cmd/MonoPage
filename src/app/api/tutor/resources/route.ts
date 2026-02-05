import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/server/firebaseAdmin';
import { randomBytes } from 'crypto';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 500MB.` },
        { status: 400 }
      );
    }

    // Generate resource ID
    const resourceId = randomBytes(16).toString('hex');
    const fileName = file.name;
    const storagePath = `tutor-resources/${userId}/${resourceId}/${fileName}`;

    // Upload file to Firebase Storage
    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(storagePath);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await storageFile.save(buffer, {
      contentType: file.type || 'application/octet-stream',
      metadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    // Get download URL
    const [url] = await storageFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Far future date
    });

    // Create Firestore document
    const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
    await resourceRef.set({
      tutorId: userId,
      name: name || fileName,
      description: description || '',
      fileUrl: url,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      classIds: [], // Will be linked when creating classes
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      resourceId,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Error uploading resource:', error);
    return NextResponse.json(
      { error: 'Failed to upload resource' },
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

    // Get all resources for this tutor
    const resourcesRef = adminDb.collection('tutor-resources')
      .where('tutorId', '==', userId)
      .orderBy('createdAt', 'desc');
    
    const resourcesSnapshot = await resourcesRef.get();
    const resources = resourcesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      resources,
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    // If index doesn't exist, try without orderBy
    try {
      const userId = request.headers.get('X-User-Id');
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 401 });
      }

      const resourcesRef = adminDb.collection('tutor-resources')
        .where('tutorId', '==', userId);
      
      const resourcesSnapshot = await resourcesRef.get();
      const resources = resourcesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || '',
          fileUrl: data.fileUrl,
          fileType: data.fileType,
          fileSize: data.fileSize,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({
        resources,
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: 500 }
      );
    }
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID required' }, { status: 400 });
    }

    // Get resource document
    const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
    const resourceDoc = await resourceRef.get();

    if (!resourceDoc.exists) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const resourceData = resourceDoc.data();
    
    // Verify ownership
    if (resourceData?.tutorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete file from Storage
    // Extract path from fileUrl or construct it
    const fileUrl = resourceData.fileUrl;
    if (fileUrl) {
      try {
        // Extract path from URL or construct it
        const storagePath = `tutor-resources/${userId}/${resourceId}/${resourceData.name || 'file'}`;
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);
        await file.delete().catch(() => {
          // Ignore if file doesn't exist
        });
      } catch (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue with Firestore deletion even if storage deletion fails
      }
    }

    // Delete Firestore document
    await resourceRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}



