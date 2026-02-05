import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/server/firebaseAdmin';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for cover images

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
    }

    // Verify class ownership
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classData = classDoc.data();
    if (classData?.tutorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.` },
        { status: 400 }
      );
    }

    // Generate filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `cover.${fileExtension}`;
    const storagePath = `tutor-classes/${userId}/${classId}/${fileName}`;

    // Upload file to Firebase Storage
    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(storagePath);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await storageFile.save(buffer, {
      contentType: file.type,
      metadata: {
        contentType: file.type,
      },
    });

    // Make file publicly readable
    await storageFile.makePublic();

    // Get download URL
    const coverImageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Update class document with cover image URL
    await classRef.update({
      coverImageUrl,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      coverImageUrl,
    });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    return NextResponse.json(
      { error: 'Failed to upload cover image' },
      { status: 500 }
    );
  }
}

