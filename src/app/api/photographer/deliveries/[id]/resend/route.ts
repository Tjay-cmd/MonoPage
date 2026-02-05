import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/server/firebaseAdmin';
import { sendPhotoDelivery } from '@/lib/email';

const ATTACHMENT_SIZE_LIMIT = 15 * 1024 * 1024; // 15MB (safer limit for email attachments)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch delivery document
    const deliveryRef = adminDb.collection('photographerDeliveries').doc(id);
    const deliveryDoc = await deliveryRef.get();

    if (!deliveryDoc.exists) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const delivery = deliveryDoc.data()!;

    // Verify ownership
    if (delivery.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if ZIP file still exists (might have been deleted)
    const bucket = adminStorage.bucket();
    const file = bucket.file(delivery.zipPath);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: 'ZIP file no longer exists. Please upload again.' },
        { status: 404 }
      );
    }

    // Update status to sending
    await deliveryRef.update({
      status: 'sending',
      updatedAt: new Date(),
    });

    try {
      const zipSize = delivery.zipSize;
      let deliveryMethod: 'attachment' | 'download-link' = delivery.deliveryMethod || 'download-link';
      let downloadToken = delivery.downloadToken;
      let expiresAt = delivery.expiresAt?.toDate?.() || null;

      if (zipSize < ATTACHMENT_SIZE_LIMIT && !delivery.deliveryMethod) {
        // Use attachment method for small files
        deliveryMethod = 'attachment';
        
        // Download ZIP to buffer for attachment
        console.log(`📥 Downloading ZIP file from storage: ${delivery.zipPath}`);
        const [zipBuffer] = await file.download();
        console.log(`✅ Downloaded ZIP file, size: ${zipBuffer.length} bytes`);
        
        // Ensure it's a Buffer
        const buffer = Buffer.isBuffer(zipBuffer) ? zipBuffer : Buffer.from(zipBuffer);
        console.log(`📎 Buffer type: ${buffer.constructor.name}, length: ${buffer.length}`);
        
        // Send email with attachment
        const success = await sendPhotoDelivery({
          to: delivery.clientEmail,
          clientName: delivery.clientName,
          sessionId: delivery.sessionId,
          zipBuffer: buffer,
          zipFileName: 'photos.zip',
          deliveryMethod: 'attachment',
        });

        if (!success) {
          throw new Error('Failed to send email');
        }

        // Delete ZIP file immediately after successful attachment send
        try {
          await file.delete();
          console.log(`✅ Deleted ZIP file from storage (attachment method): ${delivery.zipPath}`);
        } catch (deleteError) {
          console.error('⚠️ Failed to delete ZIP file (non-critical):', deleteError);
        }
      } else {
        // Use download link - keep file in storage for download
        deliveryMethod = 'download-link';
        
        // Generate new token if needed
        if (!downloadToken) {
          const { randomBytes } = await import('crypto');
          downloadToken = randomBytes(32).toString('hex');
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const downloadUrl = `${baseUrl}/api/photographer/deliveries/${id}/download?token=${downloadToken}`;

        const success = await sendPhotoDelivery({
          to: delivery.clientEmail,
          clientName: delivery.clientName,
          sessionId: delivery.sessionId,
          downloadUrl,
          deliveryMethod: 'download-link',
          expiresAt: expiresAt || undefined,
        });

        if (!success) {
          throw new Error('Failed to send email');
        }

        // For download-link method, keep the file in storage (don't delete it)
        console.log(`📎 ZIP file kept in storage for download link: ${delivery.zipPath}`);
      }

      // Update delivery status to sent
      await deliveryRef.update({
        status: 'sent',
        deliveryMethod,
        downloadToken: downloadToken || null,
        expiresAt: expiresAt || null,
        sentAt: new Date(),
        updatedAt: new Date(),
        errorMessage: null,
      });

      return NextResponse.json({
        success: true,
        deliveryMethod,
        message: 'Photos resent successfully',
      });
    } catch (error: any) {
      console.error('Error resending delivery:', error);
      
      // Update status to failed
      await deliveryRef.update({
        status: 'failed',
        errorMessage: error.message || 'Failed to resend delivery',
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { error: error.message || 'Failed to resend delivery' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in resend delivery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resend delivery' },
      { status: 500 }
    );
  }
}

