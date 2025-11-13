import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { websiteId } = await request.json();

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    console.log('Unpublishing website:', websiteId);

    // Get the website document
    const websiteRef = adminDb.collection('user_websites').doc(websiteId);
    const websiteDoc = await websiteRef.get();

    if (!websiteDoc.exists) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Update the website document to set status back to draft and remove published fields
    await websiteRef.update({
      status: 'draft',
      publishedUrl: null,
      publishedAt: null,
    });

    console.log('Website unpublished successfully:', websiteId);

    return NextResponse.json({
      success: true,
      message: 'Website unpublished successfully',
    });

  } catch (error) {
    console.error('Error unpublishing website:', error);
    return NextResponse.json({
      error: 'Failed to unpublish website',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
