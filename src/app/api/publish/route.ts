import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { websiteId } = await request.json();

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    console.log('Publishing website:', websiteId);

    // Get the website document
    const websiteRef = adminDb.collection('user_websites').doc(websiteId);
    const websiteDoc = await websiteRef.get();

    if (!websiteDoc.exists) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const websiteData = websiteDoc.data() || {};

    // Generate a unique public ID for the website
    // We'll use a combination of user ID and website ID with a unique separator
    const publicId = `${websiteData.userId}---${websiteId}`;

    // Create the public URL
    const publishedUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${publicId}`;

    console.log('📝 Publishing website:', {
      websiteId,
      userId: websiteData.userId,
      publicId,
      publishedUrl,
    });

    // Update the website document with published status and URL
    await websiteRef.update({
      status: 'published',
      publishedUrl: publishedUrl,
      publishedAt: new Date(),
    });

    console.log('✅ Website published successfully:', {
      websiteId,
      publicId,
      publishedUrl,
    });

    return NextResponse.json({
      success: true,
      publishedUrl: publishedUrl,
      publicId: publicId,
    });

  } catch (error) {
    console.error('Error publishing website:', error);
    return NextResponse.json({
      error: 'Failed to publish website',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
