'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { CheckCircle, ArrowRight, Crown, Star, Building } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh subscription data to get latest status
    const loadData = async () => {
      await refreshSubscription();
      setLoading(false);
    };

    loadData();
  }, [refreshSubscription]);

  // Get payment details from URL params
  const paymentId = searchParams.get('m_payment_id');
  
  // Type definition for valid tier values
  type ValidTier = 'pro' | 'business' | 'premium';
  
  // Get tier from URL params or subscription, with type narrowing
  const tierParam = searchParams.get('custom_str2');
  const tier: ValidTier = (tierParam === 'pro' || tierParam === 'business' || tierParam === 'premium') 
    ? (tierParam as ValidTier)
    : (subscription?.tier === 'pro' || subscription?.tier === 'business' || subscription?.tier === 'premium')
      ? (subscription.tier as ValidTier)
      : 'pro'; // Default fallback

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  const tierIcons: Record<ValidTier, React.ComponentType<{ className?: string }>> = {
    pro: Star,
    business: Building,
    premium: Crown,
  };

  const tierNames: Record<ValidTier, string> = {
    pro: 'Professional',
    business: 'Business',
    premium: 'Enterprise',
  };

  const tierColors: Record<ValidTier, string> = {
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
                Welcome to {tierNames[tier]} Plan!
              </h1>
              <p className="text-gray-600">
                Your subscription has been activated successfully.
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
                {tierNames[tier]} Plan
              </h2>
              <p className="text-gray-600">
                You now have access to all {tierNames[tier].toLowerCase()} features!
              </p>
            </div>

            {/* What's Next */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">🎉 What's Next?</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Explore Your New Features</p>
                    <p className="text-sm text-gray-600">Check out the enhanced tools now available to you.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Create Amazing Websites</p>
                    <p className="text-sm text-gray-600">Start building professional websites with your new tools.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Grow Your Business</p>
                    <p className="text-sm text-gray-600">Use your new capabilities to attract more customers.</p>
                  </div>
                </div>
              </div>
            </div>

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

            {/* Payment Details */}
            {paymentId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Payment Reference: <span className="font-mono text-gray-900">{paymentId}</span>
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
