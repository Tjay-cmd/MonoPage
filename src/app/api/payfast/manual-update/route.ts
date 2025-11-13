import { NextRequest, NextResponse } from 'next/server';
import { type SubscriptionTier } from '@/lib/subscription';
import { updateUserSubscriptionServer } from '@/lib/server/subscription';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual subscription update requested');

    const body = await request.json();
    const { userId: bodyUserId, requestedTier, manual, paymentId } = body;
    const headerUserId = request.headers.get('x-user-id');
    const userId = bodyUserId || headerUserId;

    console.log('📄 Manual update data:', {
      bodyUserId,
      headerUserId,
      resolvedUserId: userId,
      requestedTier,
      manual,
      paymentId,
    });

    if (!userId || !requestedTier) {
      return NextResponse.json(
        { error: 'User ID and requested tier are required' },
        { status: 400 },
      );
    }

    const validTiers: SubscriptionTier[] = [
      'free',
      'starter',
      'pro',
      'business',
      'premium',
    ];
    if (!validTiers.includes(requestedTier as SubscriptionTier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 },
      );
    }

    try {
      await updateUserSubscriptionServer(userId, {
        tier: requestedTier as SubscriptionTier,
        status: 'active',
        payfastToken: paymentId,
        updatedAt: new Date(),
      });
    } catch (updateError) {
      console.error(
        '⚠️ Admin SDK update failed, request will fall back to legacy client update path.',
        updateError,
      );

      return NextResponse.json(
        {
          error: 'Manual update failed (admin permissions missing).',
          details:
            'Legacy client mutation required (admin credentials not configured).',
          code: 'admin_permissions_missing',
        },
        { status: 409 },
      );
    }

    console.log('✅ Manual subscription update successful for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      userId,
      tier: requestedTier,
    });
  } catch (error) {
    console.error('❌ Error in manual subscription update:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Manual update failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
