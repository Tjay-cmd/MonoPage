'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

export default function TestSubscriptionPage() {
  const {
    user,
    subscription,
    loading,
    isTier,
    hasTierAccess,
    canAccessFeature,
    refreshSubscription,
  } = useSubscription();

  const [selectedTier, setSelectedTier] = useState<string>('free');
  const [updating, setUpdating] = useState(false);

  const updateTestSubscription = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/test-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          tier: selectedTier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      const data = await response.json();
      console.log('✅ Test subscription updated:', data);

      // Refresh the subscription data
      refreshSubscription();

      alert(`Subscription updated to ${selectedTier}!`);
    } catch (error) {
      console.error('❌ Error updating subscription:', error);
      alert('Failed to update subscription. Check console for details.');
    } finally {
      setUpdating(false);
    }
  };

  const setAsAdmin = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/test-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          action: 'setAdmin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set admin');
      }

      const data = await response.json();
      console.log('✅ Admin status set:', data);

      // Refresh the subscription data
      refreshSubscription();

      alert('You are now an admin! You have access to template management.');
    } catch (error) {
      console.error('❌ Error setting admin:', error);
      alert('Failed to set admin status. Check console for details.');
    } finally {
      setUpdating(false);
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to test subscriptions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Subscription Test Page</h1>
            <p className="mt-1 text-gray-600">Test subscription tier checking and feature access</p>
          </div>

          <div className="p-6">
            {/* User Info */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">User ID:</span>
                    <p className="text-sm text-gray-600 font-mono">{user.uid}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h2>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="font-medium text-blue-700">Current Tier:</span>
                    <p className="text-lg font-bold text-blue-900 capitalize">{subscription?.tier || 'free'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Status:</span>
                    <p className="text-lg font-bold text-blue-900 capitalize">{subscription?.status || 'active'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Created:</span>
                    <p className="text-sm text-blue-900">
                      {subscription?.createdAt?.toLocaleDateString() || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Updated:</span>
                    <p className="text-sm text-blue-900">
                      {subscription?.updatedAt?.toLocaleDateString() || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Checks */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tier Checks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(['free', 'pro', 'business', 'premium', 'admin'] as const).map((tier) => (
                  <div key={tier} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 capitalize">{tier}:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isTier(tier)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isTier(tier) ? 'Current' : 'Not Current'}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Has Access:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        hasTierAccess(tier)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {hasTierAccess(tier) ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Access */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'adminPanel',
                  'templateManagement',
                  'userManagement',
                  'systemSettings',
                  'templates',
                  'customDomain',
                  'payfast',
                  'advancedPayfast',
                  'bookings',
                  'customerManagement',
                  'multiPageWebsites',
                  'teamCollaboration',
                  'apiAccess',
                  'whiteLabel',
                  'eCommerce',
                ].map((feature) => (
                  <div key={feature} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        canAccessFeature(feature)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {canAccessFeature(feature) ? 'Accessible' : 'Locked'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Subscription Updates */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Subscription Changes</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                      Change Subscription Tier:
                    </label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro (R100)</option>
                      <option value="business">Business (R250)</option>
                      <option value="premium">Premium (R500)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-end space-x-2">
                    <button
                      onClick={updateTestSubscription}
                      disabled={updating}
                      className="btn-primary"
                    >
                      {updating ? 'Updating...' : 'Update Tier'}
                    </button>
                    <button
                      onClick={setAsAdmin}
                      disabled={updating}
                      className="btn-danger"
                      title="Set yourself as admin (full access)"
                    >
                      {updating ? 'Setting...' : 'Set as Admin'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-yellow-700">
                  ⚠️ This is for testing only. Use this to test different subscription levels.
                </p>
                <p className="mt-1 text-sm text-yellow-600">
                  📝 <strong>Admin Note:</strong> Only admin tier can access template management, admin panel, user management, and system settings.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={refreshSubscription}
                className="btn-secondary"
              >
                Refresh Subscription Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
