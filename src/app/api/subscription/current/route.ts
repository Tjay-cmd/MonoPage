import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscriptionServer } from '@/lib/server/subscription';
import { verifyRequestUser, UnauthorizedError } from '@/lib/server/requestAuth';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fallbackUid =
    request.headers.get('x-user-id') ?? url.searchParams.get('uid');

  try {
    const authUser = await verifyRequestUser(request);
    const subscription = await getUserSubscriptionServer(authUser.uid);

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        createdAt: subscription.createdAt.valueOf(),
        updatedAt: subscription.updatedAt.valueOf(),
        trialEndsAt: subscription.trialEndsAt?.valueOf() ?? null,
        nextBillingDate: subscription.nextBillingDate?.valueOf() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      if (fallbackUid) {
        console.warn('[subscription/api] Falling back to free tier via client headers.');
        return NextResponse.json({
          success: true,
          subscription: {
            tier: 'free',
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            trialEndsAt: null,
            nextBillingDate: null,
          },
          warnings: ['subscription_fallback'],
        });
      }

      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed to verify subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to load subscription data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
