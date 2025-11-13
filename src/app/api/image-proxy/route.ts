import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      console.error('❌ Image proxy: No URL parameter provided');
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    console.log('📸 Image proxy: Fetching image from:', imageUrl);

    // Fetch the image from Firebase Storage
    const response = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/*',
      },
    });
    
    if (!response.ok) {
      console.error('❌ Image proxy: Failed to fetch image, status:', response.status, response.statusText);
      return NextResponse.json({ 
        error: 'Failed to fetch image',
        status: response.status,
        statusText: response.statusText 
      }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    console.log('✅ Image proxy: Successfully proxied image, size:', imageBuffer.byteLength, 'bytes');

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('❌ Image proxy error:', error);
    return NextResponse.json({ 
      error: 'Failed to proxy image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

