'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_PRICES, type SubscriptionTier } from '@/lib/payfast';
import {
  Crown,
  Star,
  Building,
  Zap,
  CheckCircle,
  ArrowRight,
  CreditCard,
  Shield,
  Users,
  Globe,
  BarChart3,
  Home,
} from 'lucide-react';

export default function SubscriptionPage() {
  const { user, subscription, loading, hasTierAccess, canAccessFeature } = useSubscription();
  const router = useRouter();
  const [upgrading, setUpgrading] = useState<SubscriptionTier | null>(null);
  const [testingAuth, setTestingAuth] = useState(false);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!user) return;

    setUpgrading(tier);

    // Store upgrade details in localStorage for success page
    const upgradeData = {
      userId: user.uid,
      tier,
      timestamp: Date.now(),
    };
    localStorage.setItem('payfast_upgrade_pending', JSON.stringify(upgradeData));

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🔐 Getting Firebase auth token for user:', user.uid);

      // Get fresh Firebase auth token
      const token = await user.getIdToken(true); // Force refresh
      console.log('✅ Got auth token, length:', token.length);

      const response = await fetch('/api/payfast/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          tier,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Payment creation failed:', response.status, errorData);
        throw new Error(`Failed to create payment: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const paymentUrl = data.paymentUrl;
      const paymentId = data.paymentId;

      if (paymentId) {
        localStorage.setItem(
          'payfast_upgrade_pending',
          JSON.stringify({
            ...upgradeData,
            paymentId,
          }),
        );
      }

      // Debug: Log the working PayFast URL
      console.log('🔄 Redirecting to working PayFast URL...');
      console.log('🔄 PayFast URL:', paymentUrl);

      // Simply redirect to the working PayFast URL
      window.location.href = paymentUrl;

    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const testAuthentication = async () => {
    if (!user) return;

    setTestingAuth(true);
    try {
      console.log('🧪 Testing authentication...');

      const token = await user.getIdToken(true);
      console.log('✅ Got fresh token, length:', token.length);

      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          testData: 'Hello from client!',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Auth test failed:', response.status, errorData);
        throw new Error(`Auth test failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Auth test successful:', data);

      alert(`Authentication test passed! User: ${data.email}`);
    } catch (error) {
      console.error('❌ Auth test error:', error);
      alert(`Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingAuth(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const currentTier = (subscription?.tier || 'free') as SubscriptionTier | 'free';
  const tierIcons: Record<string, React.ComponentType<any>> = {
    free: Globe,
    starter: Zap,
    pro: Star,
    business: Building,
    premium: Crown,
  };

  const tierColors = {
    free: 'gray',
    starter: 'green',
    pro: 'blue',
    business: 'purple',
    premium: 'gold',
  };

  const plans = [
    {
      id: 'starter' as SubscriptionTier,
      name: 'Starter',
      price: 'R50',
      period: 'per month',
      icon: Zap,
      color: 'green',
      description: 'Enhanced features for growing businesses',
      features: [
        '3 websites',
        'Advanced editor',
        '500MB storage',
        'Custom domain',
        'Advanced forms',
        'Basic templates',
      ],
      limitations: [
        'Limited templates',
      ],
    },
    {
      id: 'pro' as SubscriptionTier,
      name: 'Professional',
      price: 'R100',
      period: 'per month',
      icon: Star,
      color: 'blue',
      description: 'Professional one-page websites',
      features: [
        '3 websites',
        'All one-page templates',
        'PayFast integration',
        'Advanced editor',
        'Custom domain',
        '1GB storage',
        'SEO tools',
        'Analytics',
      ],
      popular: true,
    },
    {
      id: 'business' as SubscriptionTier,
      name: 'Business',
      price: 'R250',
      period: 'per month',
      icon: Building,
      color: 'purple',
      description: 'Advanced one-page with business tools',
      features: [
        '10 websites',
        'All templates',
        'Advanced PayFast features',
        'Booking/appointment system',
        'Customer management',
        'Email marketing',
        '5GB storage',
        'Priority support',
      ],
    },
    {
      id: 'premium' as SubscriptionTier,
      name: 'Premium',
      price: 'R500',
      period: 'per month',
      icon: Crown,
      color: 'gold',
      description: 'Full multi-page business platform',
      features: [
        'Unlimited websites',
        'Multi-page websites',
        'Full e-commerce',
        'Team collaboration',
        'Advanced analytics',
        'API access',
        '20GB storage',
        'White-label options',
        'Dedicated support',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Home className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
              <p className="mt-2 text-gray-600">
                Choose the plan that grows with your business
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                currentTier === 'free' ? 'bg-gray-100 text-gray-800' :
                currentTier === 'starter' ? 'bg-green-100 text-green-800' :
                currentTier === 'pro' ? 'bg-blue-100 text-blue-800' :
                currentTier === 'business' ? 'bg-purple-100 text-purple-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                <div className="flex items-center">
                  {React.createElement(tierIcons[currentTier] || Globe, { className: 'h-4 w-4 mr-2' })}
                  Current: {(currentTier || 'free').charAt(0).toUpperCase() + (currentTier || 'free').slice(1)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === plan.id;
            const canUpgrade = hasTierAccess(plan.id) || plan.id === 'pro' || plan.id === 'business';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-sm border-2 ${
                  isCurrentPlan ? 'border-blue-500 ring-2 ring-blue-200' :
                  plan.popular ? 'border-purple-300' : 'border-gray-200'
                } overflow-hidden`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {plan.badge && (
                  <div className="absolute top-0 left-0 bg-yellow-500 text-white px-3 py-1 text-xs font-medium rounded-br-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <Icon className={`h-8 w-8 ${
                      plan.color === 'blue' ? 'text-blue-600' :
                      plan.color === 'purple' ? 'text-purple-600' :
                      plan.color === 'gold' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`} />
                    <h3 className="ml-3 text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600 ml-1">/{plan.period}</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations && (
                    <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium mb-1">Limitations:</p>
                      <ul className="space-y-1">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="text-xs text-gray-500">• {limitation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : canUpgrade ? (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgrading === plan.id}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                          plan.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                          plan.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                          plan.color === 'gold' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                          'bg-gray-600 hover:bg-gray-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {upgrading === plan.id ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Upgrade Now
                          </div>
                        )}
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
                          <Zap className="h-3 w-3 mr-1" />
                          Achievement Required
                        </div>
                        <p className="text-xs text-gray-600">
                          Reach business milestones to unlock
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Plan Details */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Current Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                currentTier === 'starter' ? 'bg-green-100' :
                currentTier === 'pro' ? 'bg-blue-100' :
                currentTier === 'business' ? 'bg-purple-100' :
                currentTier === 'premium' ? 'bg-yellow-100' :
                'bg-gray-100'
              }`}>
                {React.createElement(tierIcons[currentTier] || Globe, {
                  className: `h-6 w-6 ${
                    currentTier === 'starter' ? 'text-green-600' :
                    currentTier === 'pro' ? 'text-blue-600' :
                    currentTier === 'business' ? 'text-purple-600' :
                    currentTier === 'premium' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`
                })}
              </div>
              <div>
                <p className="font-medium text-gray-900 capitalize">{currentTier} Plan</p>
                <p className="text-sm text-gray-600">
                  {currentTier === 'starter' ? 'R50/month' :
                   currentTier === 'pro' ? 'R100/month' :
                   currentTier === 'business' ? 'R250/month' :
                   currentTier === 'premium' ? 'R500/month' :
                   'Free forever'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Status</p>
                <p className="text-sm text-gray-600 capitalize">{subscription?.status || 'Active'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Member Since</p>
                <p className="text-sm text-gray-600">
                  {subscription?.createdAt?.toLocaleDateString() || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Debug Tools</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={testAuthentication}
              disabled={testingAuth}
              className="btn-secondary"
            >
              {testingAuth ? 'Testing Auth...' : 'Test Authentication'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Refresh Page
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Use these tools to debug authentication and payment issues.
          </p>
        </div>
      </div>
    </div>
  );
}
