import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🔐 Test auth - Token length:', token.length);

    // For development: Simple token validation
    // In production: Use Firebase Admin SDK for proper verification
    if (!token || token.length < 100) {
      console.error('❌ Test auth - Invalid token format');
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }

    console.log('✅ Test auth - Token format valid');

    // Parse request body
    const { testData } = await request.json();
    const userId = 'test-user-id'; // For testing, we'll use a placeholder

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      userId,
      testData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Test auth error:', error);
    return NextResponse.json(
      {
        error: 'Test auth failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
