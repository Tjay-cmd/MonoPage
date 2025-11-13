import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscriptionServer } from '@/lib/server/subscription';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    const subscription =
      (await getUserSubscriptionServer(userId)) ?? { tier: 'free', status: 'active' };

    return NextResponse.json({
      success: true,
      userId,
      subscription,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
