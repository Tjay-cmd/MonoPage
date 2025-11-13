'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Service, User } from '@/types';
import { generatePayFastPaymentLink, MerchantSettings } from '@/lib/payfast-simple';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  ArrowLeft,
  DollarSign,
  Clock,
  RefreshCw,
} from 'lucide-react';

export default function ServicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [merchantSettings, setMerchantSettings] = useState<MerchantSettings | null>(null);

  const { loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const canManageServices = hasTierAccess('pro');

  const getAuthHeaders = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const headers: Record<string, string> = {
      'X-User-Id': currentUser.uid,
    };

    if (currentUser.email) {
      headers['X-User-Email'] = currentUser.email;
    }

    try {
      const token = await currentUser.getIdToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[services] Unable to retrieve ID token, relying on fallback headers.', error);
    }

    return headers;
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users/profile', { headers });

      if (!response.ok) {
        throw new Error(`Profile request failed (${response.status})`);
      }

      const payload = await response.json();
      const profile = payload.profile as {
        id: string;
        email: string;
        businessName: string;
        businessType?: User['businessType'];
        tier?: User['tier'];
        createdAt?: number | null;
        updatedAt?: number | null;
      };

      setUser({
        id: profile.id,
        email: profile.email,
        businessName: profile.businessName ?? profile.email?.split('@')[0] ?? 'My Business',
        businessType: profile.businessType ?? 'other',
        tier: (profile.tier ?? 'free') as User['tier'],
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      const fallback = auth.currentUser;
      if (fallback) {
        setUser({
          id: fallback.uid,
          email: fallback.email || '',
          businessName: fallback.displayName || fallback.email?.split('@')[0] || 'My Business',
          businessType: 'other',
          tier: 'free',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }, [getAuthHeaders]);

  const loadServiceData = useCallback(async () => {
    if (!auth.currentUser) {
      setServices([]);
      setMerchantSettings(null);
      return;
    }

    const headers = await getAuthHeaders();
    try {
      const response = await fetch('/api/services', { headers });
      if (!response.ok) {
        throw new Error(`Services request failed (${response.status})`);
      }

      const payload = await response.json();
      const servicesData = (payload.services ?? []) as Array<
        Service & { createdAt?: number | null; updatedAt?: number | null }
      >;

      setServices(
        servicesData.map((service) => ({
          ...service,
          createdAt: service.createdAt ? new Date(service.createdAt) : new Date(),
          updatedAt: service.updatedAt ? new Date(service.updatedAt) : new Date(),
        })),
      );
      setMerchantSettings(payload.merchantSettings ?? null);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
      setMerchantSettings(null);
    }
  }, [getAuthHeaders]);

  const callServicesAction = useCallback(
    async (body: Record<string, unknown>) => {
      const headers = await getAuthHeaders();
      if (!headers) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const reason = errorPayload?.error || `status ${response.status}`;
        throw new Error(`Service action failed: ${reason}`);
      }

      return response.json().catch(() => ({}));
    },
    [getAuthHeaders],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setServices([]);
        setMerchantSettings(null);
        setLoading(false);
        router.push('/auth/login');
        return;
      }

      setLoading(true);
      (async () => {
        try {
          await loadUserProfile();
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [router, loadUserProfile]);

  useEffect(() => {
    if (subscriptionLoading) return;

    if (!canManageServices) {
      setServices([]);
      setMerchantSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        await loadServiceData();
      } finally {
        setLoading(false);
      }
    })();
  }, [canManageServices, subscriptionLoading, loadServiceData]);

  const regeneratePaymentLinks = async () => {
    if (!user || !merchantSettings) return;

    try {
      for (const service of services) {
        const newPaymentLink = generatePayFastPaymentLink(service, user.id, merchantSettings);
        await callServicesAction({
          action: 'update-service',
          serviceId: service.id,
          updates: {
            payfastLink: newPaymentLink,
          },
        });
      }
      await loadServiceData();
      alert('Payment links updated successfully! Check the browser console for debug information.');
    } catch (error) {
      console.error('Error regenerating payment links:', error);
      alert('Failed to update payment links. Please try again.');
    }
  };

  const clearMerchantSettings = async () => {
    try {
      await callServicesAction({ action: 'clear-merchant-settings' });
      setMerchantSettings(null);
      alert('Merchant settings cleared. Please add your PayFast credentials in Settings.');
    } catch (error) {
      console.error('Error clearing merchant settings:', error);
      alert('Failed to clear merchant settings. Please try again.');
    }
  };

  const updateToCorrectCredentials = async () => {
    try {
      await callServicesAction({
        action: 'set-merchant-settings',
        settings: {
          merchantId: '10042577',
          merchantKey: 'lwzxkeczltrf1',
          passPhrase: 'Tjayburger2004',
          environment: 'sandbox',
        },
      });
      await loadServiceData();
      alert('Updated to YOUR PayFast sandbox credentials! Now click "Update Payment Links".');
    } catch (error) {
      console.error('Error updating credentials:', error);
      alert('Failed to update credentials. Please try again.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      await callServicesAction({ action: 'delete-service', serviceId });
      await loadServiceData();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service. Please try again.');
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!canManageServices) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Upgrade Required</h1>
          <p className="text-gray-600 mb-6">
            The Services dashboard unlocks on the <strong>Pro</strong> plan. Upgrade to create PayFast payment
            links and manage your offerings.
          </p>
          <button
            onClick={() => router.push('/dashboard/subscription')}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Centered and Prominent */}
      <div className="bg-white border-b border-gray-200 relative">
        {/* Back to Dashboard Button - Top Left Corner */}
        <div className="absolute top-4 left-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Services</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Create and manage your service offerings. Each service gets its own payment link, making it easy for customers to book and pay online.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 text-lg shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Add Service</span>
              </button>
              {merchantSettings && services.length > 0 && (
                <button
                  onClick={regeneratePaymentLinks}
                  className="bg-white text-gray-700 border-2 border-gray-200 px-6 py-4 rounded-xl font-semibold hover:border-gray-300 transition-colors flex items-center space-x-2 text-lg"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Update Payment Links</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notice */}
        {merchantSettings && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">PayFast Integration Active</h3>
                  <p className="text-sm text-gray-700">
                    Your payment links now redirect to PayFast {merchantSettings.environment === 'sandbox' ? 'Sandbox' : 'Production'}. 
                    Click "Update Payment Links" to refresh existing services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No services yet
              </h3>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                Create your first service to start accepting payments online. Each service gets its own unique payment link.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-lg shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Service</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center items-start gap-8 w-full max-w-6xl mx-auto">
            {services.map((service) => (
              <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col w-full md:w-[calc(50%-1rem)] max-w-md">
                {/* Service Header */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() => setEditingService(service)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit service"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Price and Duration */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-gray-900 mr-1" />
                      <span className="text-3xl font-bold text-gray-900">R{service.price}</span>
                    </div>
                    {service.duration && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{service.duration}min</span>
                      </div>
                    )}
                  </div>

                  {/* Status and Category */}
                  <div className="flex items-center justify-between mb-6">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      service.isActive 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {service.category && (
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        {service.category}
                      </span>
                    )}
                  </div>

                  {/* Payment Link */}
                  {service.payfastLink && (
                    <div className="mt-auto pt-4 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Payment Link:
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={service.payfastLink}
                          readOnly
                          className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 truncate"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(service.payfastLink!);
                            alert('Payment link copied to clipboard!');
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copy link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <a
                          href={service.payfastLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Service Modal */}
        {(showCreateForm || editingService) && (
          <ServiceForm
            service={editingService}
            onClose={() => {
              setShowCreateForm(false);
              setEditingService(null);
            }}
            onSave={async (serviceData) => {
              try {
                if (!user) return;

                if (editingService) {
                  await callServicesAction({
                    action: 'update-service',
                    serviceId: editingService.id,
                    updates: {
                      ...serviceData,
                    },
                  });
                } else {
                  const createResponse = await callServicesAction({
                    action: 'create-service',
                    service: {
                      ...serviceData,
                      isActive: true,
                    },
                  });

                  const newServiceId = (createResponse?.serviceId as string) || '';

                  if (merchantSettings && newServiceId) {
                    const generatedService: Service = {
                      id: newServiceId,
                      userId: user.id,
                      name: serviceData.name ?? '',
                      description: serviceData.description ?? '',
                      price: serviceData.price ?? 0,
                      duration: serviceData.duration,
                      category: serviceData.category ?? '',
                      isActive: true,
                      payfastLink: '',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    };

                    const paymentLink = generatePayFastPaymentLink(
                      generatedService,
                      user.id,
                      merchantSettings,
                    );

                    await callServicesAction({
                      action: 'update-service',
                      serviceId: newServiceId,
                      updates: {
                        payfastLink: paymentLink,
                      },
                    });
                  }
                }
                await loadServiceData();
                setShowCreateForm(false);
                setEditingService(null);
              } catch (error) {
                console.error('Error saving service:', error);
                alert('Failed to save service. Please try again.');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// Service Form Component
function ServiceForm({ 
  service, 
  onClose, 
  onSave 
}: { 
  service: Service | null; 
  onClose: () => void; 
  onSave: (data: Partial<Service>) => Promise<void>; 
}) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || 0,
    category: service?.category || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {service ? 'Edit Service' : 'Create New Service'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                placeholder="e.g., Men's Haircut"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                rows={3}
                placeholder="Describe your service..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (R)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                  placeholder="200"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                  placeholder="30"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                placeholder="e.g., Hair Services"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-white text-gray-700 border-2 border-gray-200 px-6 py-3 rounded-xl font-semibold hover:border-gray-300 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                {loading ? 'Saving...' : (service ? 'Update Service' : 'Create Service')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
