import { NextRequest, NextResponse } from 'next/server';
import { type SubscriptionTier } from '@/lib/subscription';
import { updateUserSubscriptionServer } from '@/lib/server/subscription';

export async function POST(request: NextRequest) {
  try {
    const { userId, tier, action } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Special action to set admin (only for development/testing)
    if (action === 'setAdmin') {
      console.log('👑 Setting user as admin:', userId);

      await updateUserSubscriptionServer(userId, {
        tier: 'admin' as SubscriptionTier,
        status: 'active',
      });

      return NextResponse.json({
        success: true,
        message: `User ${userId} set as admin`,
        data: {
          userId,
          tier: 'admin',
          status: 'active',
        },
      });
    }

    if (!tier) {
      return NextResponse.json(
        { error: 'tier is required' },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers: SubscriptionTier[] = ['free', 'pro', 'business', 'premium', 'admin'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be: free, pro, business, premium, or admin' },
        { status: 400 }
      );
    }

    console.log('🧪 Setting test subscription:', { userId, tier });

    // Update the user's subscription
    await updateUserSubscriptionServer(userId, {
      tier: tier as SubscriptionTier,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: `User ${userId} subscription updated to ${tier}`,
      data: {
        userId,
        tier,
        status: 'active',
      },
    });

  } catch (error) {
    console.error('Error updating test subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to update subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
