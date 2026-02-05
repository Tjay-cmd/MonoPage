import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/server/firebaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Download token required' }, { status: 400 });
    }

    // Fetch delivery document
    const deliveryDoc = await adminDb.collection('photographerDeliveries').doc(id).get();

    if (!deliveryDoc.exists) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const delivery = deliveryDoc.data()!;

    // Verify token
    if (delivery.downloadToken !== token) {
      return NextResponse.json({ error: 'Invalid download token' }, { status: 403 });
    }

    // Check expiration
    if (delivery.expiresAt) {
      const expiresAt = delivery.expiresAt.toDate ? delivery.expiresAt.toDate() : new Date(delivery.expiresAt);
      if (expiresAt < new Date()) {
        return NextResponse.json({ error: 'Download link has expired' }, { status: 410 });
      }
    }

    // Check if delivery is sent
    if (delivery.status !== 'sent') {
      return NextResponse.json({ error: 'Delivery not available' }, { status: 400 });
    }

    // Get ZIP file from Storage
    const bucket = adminStorage.bucket();
    const file = bucket.file(delivery.zipPath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: 'File no longer available. It may have been deleted.' },
        { status: 404 }
      );
    }

    // Download file
    const [zipBuffer] = await file.download();

    // Delete file after successful download (one-time download)
    try {
      await file.delete();
      console.log(`✅ Deleted ZIP file after successful download: ${delivery.zipPath}`);
    } catch (deleteError) {
      console.error('⚠️ Failed to delete ZIP file after download (non-critical):', deleteError);
      // Continue even if deletion fails
    }

    // Return file as download (convert Buffer to Uint8Array for Next.js compatibility)
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="photos.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading delivery:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

