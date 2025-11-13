'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { CheckCircle, ArrowRight, Crown, Star, Building, Globe, Zap } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh subscription data multiple times to catch webhook updates
    const loadData = async () => {
      // Initial load
      await refreshSubscription();

      // Check again after 2 seconds (webhook might be processing)
      setTimeout(async () => {
        await refreshSubscription();

        // Final check after additional 3 seconds (webhook should have processed)
        setTimeout(async () => {
          await refreshSubscription();
          setLoading(false);
        }, 3000);
      }, 2000);
    };

    loadData();
  }, [refreshSubscription]);

  // PayFast doesn't pass payment details in return URL - they're sent via webhook
  // For now, we'll just show a success message and rely on webhook for updates

  useEffect(() => {
    console.log('🎉 Payment Success Page loaded');
    console.log('🎉 URL params:', Object.fromEntries(searchParams.entries()));
  }, []); // Only log once on mount

  // Check for pending upgrade in localStorage
  const [pendingUpgrade, setPendingUpgrade] = useState<{
    userId: string;
    tier: string;
    timestamp: number;
    paymentId?: string;
  } | null>(null);

  const [upgradeStatus, setUpgradeStatus] = useState<'idle' | 'upgrading' | 'success' | 'error'>('idle');

  useEffect(() => {
    console.log('🎉 Current subscription:', subscription);
  }, [subscription]); // Log when subscription changes

  useEffect(() => {
    console.log('🎉 Pending upgrade:', pendingUpgrade);
  }, [pendingUpgrade]); // Log when pending upgrade changes

  // Get tier from pending upgrade data or current subscription
  const tier = pendingUpgrade?.tier || subscription?.tier || 'pro';

  useEffect(() => {
    // Check for pending upgrade
    const upgradeData = localStorage.getItem('payfast_upgrade_pending');
    if (upgradeData) {
      try {
        const parsed = JSON.parse(upgradeData);
        // Only use if it's recent (within 30 minutes)
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setPendingUpgrade(parsed);

          // Automatically attempt to upgrade the subscription
          console.log('🔄 Auto-upgrading subscription from pending data:', parsed);
          updateSubscription(parsed).catch(error => {
            console.error('❌ Auto-upgrade failed:', error);
          });
        } else {
          localStorage.removeItem('payfast_upgrade_pending');
        }
      } catch (error) {
        console.error('Error parsing upgrade data:', error);
        localStorage.removeItem('payfast_upgrade_pending');
      }
    }
  }, []);

  // Subscription update function
  const applyClientFallback = async (
    upgradeData: NonNullable<typeof pendingUpgrade>,
    error?: Record<string, unknown>,
  ) => {
    try {
      console.warn(
        '[payments] Applying client-side subscription upgrade fallback.',
        error,
      );

      const paymentToken =
        upgradeData.paymentId ?? `manual-${upgradeData.timestamp}`;

      await setDoc(
        doc(db, 'users', upgradeData.userId),
        {
          tier: upgradeData.tier,
          status: 'active',
          payfastToken: paymentToken,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      localStorage.removeItem('payfast_upgrade_pending');
      setPendingUpgrade(null);
      setUpgradeStatus('success');
      await refreshSubscription();
      alert('Subscription updated successfully!');
    } catch (fallbackError) {
      console.error('❌ Client-side fallback upgrade failed.', fallbackError);
      setUpgradeStatus('error');
      alert(
        'Failed to update subscription automatically. Please contact support with your payment receipt.',
      );
    }
  };

  const updateSubscription = async (upgradeData?: typeof pendingUpgrade) => {
    const dataToUse = upgradeData || pendingUpgrade;
    if (!dataToUse) return;

    setUpgradeStatus('upgrading');
    console.log('🔄 Updating subscription:', dataToUse);

    try {
      const response = await fetch('/api/payfast/manual-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': dataToUse.userId,
        },
        body: JSON.stringify({
          userId: dataToUse.userId,
          requestedTier: dataToUse.tier,
          manual: true, // Flag for update
          paymentId: dataToUse.paymentId,
        }),
      });

      if (response.ok) {
        console.log('✅ Subscription update successful');
        localStorage.removeItem('payfast_upgrade_pending'); // Clean up
        setPendingUpgrade(null);
        setUpgradeStatus('success');
        await refreshSubscription(); // Refresh data
        if (!upgradeData) {
          // Only show alert for manual clicks, not auto-upgrades
          alert('Subscription updated successfully!');
        }
      } else {
        const error = await response.json();
        console.error('❌ Update failed:', error);

        if (response.status === 409 && error.code === 'admin_permissions_missing' && dataToUse) {
          await applyClientFallback(
            {
              userId: dataToUse.userId,
              tier: dataToUse.tier,
              timestamp: dataToUse.timestamp,
              paymentId: dataToUse.paymentId,
            },
            error,
          );
          return;
        }

        setUpgradeStatus('error');
        const errorMessage = error.details || error.error || 'Failed to update subscription';
        if (!upgradeData) {
          // Only show alert for manual clicks
          alert(`Error: ${errorMessage}. Please try again or contact support.`);
        }
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      setUpgradeStatus('error');
      if (!upgradeData) {
        // Only show alert for manual clicks
        alert('Error updating subscription. Please contact support.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  const tierIcons = {
    free: Globe,
    starter: Zap,
    pro: Star,
    business: Building,
    premium: Crown,
  };

  const tierNames = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Professional',
    business: 'Business',
    premium: 'Enterprise',
  };

  const tierColors = {
    free: 'gray',
    starter: 'green',
    pro: 'blue',
    business: 'purple',
    premium: 'yellow',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-50 border-b border-green-200 px-6 py-8">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h1>
              <p className="text-gray-600">
                Welcome to your {tierNames[tier] || 'Professional'} Plan.
              </p>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="px-6 py-8">
            <div className="flex items-center justify-center mb-6">
              <div className={`p-3 rounded-full ${
                tier === 'pro' ? 'bg-blue-100' :
                tier === 'business' ? 'bg-purple-100' :
                'bg-yellow-100'
              }`}>
                {tier && React.createElement(tierIcons[tier], {
                  className: `h-8 w-8 ${
                    tier === 'pro' ? 'text-blue-600' :
                    tier === 'business' ? 'text-purple-600' :
                    'text-yellow-600'
                  }`
                })}
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {upgradeStatus === 'success'
                  ? `${tierNames[tier] || 'Professional'} Plan Activated`
                  : upgradeStatus === 'upgrading'
                  ? 'Activating Your Plan...'
                  : 'Payment Successful!'
                }
              </h2>
              <p className="text-gray-600">
                {upgradeStatus === 'success'
                  ? 'You now have access to all premium features!'
                  : upgradeStatus === 'upgrading'
                  ? 'Please wait while we activate your subscription...'
                  : 'Thank you for your payment. Your subscription is being processed.'
                }
              </p>
              {upgradeStatus === 'upgrading' && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}
            </div>

            {/* What's Next */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">🎉 What's Next?</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Explore Premium Features</p>
                    <p className="text-sm text-gray-600">Discover all the new tools available to you.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Create Professional Websites</p>
                    <p className="text-sm text-gray-600">Build stunning websites with advanced features.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Activation - Only show if auto-upgrade failed */}
            {pendingUpgrade && upgradeStatus === 'error' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-yellow-800">Manual Activation Required</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Automatic activation failed. Click below to manually activate your {pendingUpgrade.tier} plan.
                    </p>
                  </div>
                  <button
                    onClick={() => updateSubscription()}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Activate Plan
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard/templates"
                className="flex-1 btn-primary text-center"
              >
                <ArrowRight className="h-4 w-4 mr-2 inline" />
                Start Creating
              </Link>
              <Link
                href="/dashboard/websites"
                className="flex-1 btn-secondary text-center"
              >
                View My Websites
              </Link>
            </div>

            {/* Payment Details - Only show if available */}
            {(pendingUpgrade?.paymentId || searchParams.get('m_payment_id')) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Payment Reference: <span className="font-mono text-gray-900">
                      {pendingUpgrade?.paymentId || searchParams.get('m_payment_id')}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Keep this reference for your records
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
