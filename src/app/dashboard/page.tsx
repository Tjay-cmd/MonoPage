'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User, Service } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Settings,
  LogOut,
  DollarSign,
  Users,
  Globe,
  Star,
  ArrowRight,
  FileText,
  Crown,
  Bell,
  Search,
  User as UserIcon,
  TrendingUp,
  Zap,
  Target,
  Sparkles,
  Eye
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const {
    subscription: subscriptionData,
    loading: subscriptionLoading,
    refreshSubscription,
  } = useSubscription();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
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
      console.warn('[dashboard] Unable to retrieve ID token, relying on fallback headers.', error);
    }

    return headers;
  }, []);

  const loadUserProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/users/profile', { headers });

      if (!response.ok) {
        throw new Error(`Profile request failed with status ${response.status}`);
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
        tier: (profile.tier ?? subscriptionData?.tier ?? 'free') as User['tier'],
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
      });
    } catch (error) {
      console.error('Failed to load user profile', error);
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
  }, [getAuthHeaders, subscriptionData?.tier]);

  const fetchServices = useCallback(async () => {
    if (!auth.currentUser) {
      setServices([]);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/services', { headers });

      if (!response.ok) {
        throw new Error(`Services request failed with status ${response.status}`);
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
    } catch (error) {
      console.error('Failed to load services', error);
      setServices([]);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setServices([]);
        setLoading(false);
        router.push('/auth/login');
        return;
      }

      setLoading(true);
      (async () => {
        try {
          await Promise.all([loadUserProfile(), fetchServices(), refreshSubscription()]);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [router, loadUserProfile, fetchServices, refreshSubscription]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleStarterWebsite = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/templates/list', { headers });

      if (!response.ok) {
        throw new Error(`Template lookup failed (${response.status})`);
      }

      const payload = await response.json();
      const templates = (payload.templates ?? []) as Array<{ id: string; name: string }>;
      const starterTemplate = templates.find(
        (template) => template.name?.toLowerCase() === 'starter website',
      );

      if (starterTemplate?.id) {
        router.push(`/dashboard/templates/${starterTemplate.id}/editor`);
        return;
      }

      router.push('/dashboard/templates');
    } catch (error) {
      console.error('❌ Error finding starter template:', error);
      router.push('/dashboard/templates');
    }
  };

  const combinedLoading = loading || subscriptionLoading;

  if (combinedLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getTierInfo = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'free':
        return {
          name: 'Free',
          badgeClass: 'tier-badge-free',
          description: 'Get started with basic features',
          nextTier: 'Starter',
          requirements: 'Upgrade to unlock more',
          icon: Zap,
          color: 'gray'
        };
      case 'starter':
        return {
          name: 'Starter',
          badgeClass: 'tier-badge-starter',
          description: 'Perfect for getting started',
          nextTier: 'Professional',
          requirements: '10+ successful payments',
          icon: Zap,
          color: 'emerald'
        };
      case 'pro':
        return {
          name: 'Professional',
          badgeClass: 'tier-badge-pro',
          description: 'Enhanced branding features',
          nextTier: 'Business',
          requirements: '50+ successful payments',
          icon: Star,
          color: 'blue'
        };
      case 'business':
        return {
          name: 'Business',
          badgeClass: 'tier-badge-business',
          description: 'Full website with booking system',
          nextTier: 'Premium',
          requirements: '100+ successful payments',
          icon: Crown,
          color: 'purple'
        };
      case 'premium':
        return {
          name: 'Premium',
          badgeClass: 'tier-badge-premium',
          description: 'Complete business platform',
          nextTier: null,
          requirements: null,
          icon: Sparkles,
          color: 'amber'
        };
      case 'admin':
        return {
          name: 'Admin',
          badgeClass: 'tier-badge-admin',
          description: 'Administrator access',
          nextTier: null,
          requirements: null,
          icon: Crown,
          color: 'red'
        };
      default:
        // If tier is provided but doesn't match, use it as-is, otherwise default to Free
        return {
          name: tier ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : 'Free',
          badgeClass: 'tier-badge-free',
          description: 'Get started with basic features',
          nextTier: 'Starter',
          requirements: 'Upgrade to unlock more',
          icon: Zap,
          color: 'gray'
        };
    }
  };

  const currentTier = (subscriptionData?.tier || user.tier || 'free') as string;
  const tierInfo = getTierInfo(currentTier);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Sidebar - Wix Style */}
        <div className="w-64 bg-gray-100 h-screen sticky top-0 border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 flex-1 flex flex-col overflow-y-auto">
            {/* Logo at Top */}
            <div className="mb-8 pb-6 border-b border-gray-200">
              <Link href="/dashboard" className="flex items-center justify-center" aria-label="MonoPage home">
                <Image
                  src="/images/Logo.png"
                  alt="MonoPage logo"
                  width={150}
                  height={50}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1">
              {/* Templates Section */}
              <div className="mb-8">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Templates</h2>
                <div className="space-y-1">
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center space-x-3 py-2 px-3 rounded-lg bg-orange-100 text-orange-700 cursor-pointer transition-colors w-full text-left"
                  >
                    <Globe className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">All Templates</span>
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/websites')}
                    className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors w-full text-left"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">My Websites</span>
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/websites')}
                    className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors w-full text-left"
                  >
                    <Globe className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">All Websites</span>
                  </button>
                </div>
              </div>

              {/* Business Section */}
              <div className="mb-8">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Business</div>
                <div className="space-y-1">
                  <button 
                    onClick={() => router.push('/dashboard/services')}
                    className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors group w-full text-left"
                  >
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Services</span>
                    <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 ml-auto" />
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/subscription')}
                    className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors group w-full text-left"
                  >
                    <Crown className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Subscription</span>
                    <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 ml-auto" />
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/settings')}
                    className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors group w-full text-left"
                  >
                    <Settings className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Settings</span>
                    <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 ml-auto" />
                  </button>
                </div>
              </div>

              {/* Admin Section - Only visible to admin users */}
              {currentTier === 'admin' && (
                <div className="mb-8">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Admin Tools</div>
                  <div className="space-y-1">
                    <button 
                      onClick={() => router.push('/admin/templates')}
                      className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors group w-full text-left"
                    >
                      <Settings className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">Manage Templates</span>
                      <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-orange-500 ml-auto" />
                    </button>
                    <button 
                      onClick={() => router.push('/admin/users')}
                      className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors group w-full text-left"
                    >
                      <Users className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">Manage Users</span>
                      <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-orange-500 ml-auto" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Section at Bottom */}
            <div className="pt-6 border-t border-gray-200 mt-auto">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 truncate">{user.businessName}</span>
              </div>
              <button className="w-full bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors mb-3">
                {tierInfo.name}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-red-600 transition-colors py-2 px-3 rounded-lg hover:bg-gray-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Wix Style */}
        <div className="flex-1 p-8">
          {/* Template Section with Interactive Line */}
          <div className="group">
            {/* Header Section - Centered and Prominent */}
            <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Choose Your Template</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">Use the Starter Website or pick a professional template to get started</p>
            
            {/* Centered Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                onClick={handleStarterWebsite}
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 text-lg shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Starter Website</span>
              </button>
              <div className="text-gray-500 text-base">or choose a template below</div>
            </div>
            
            {/* Search Bar - Centered */}
            <div className="flex justify-center mb-8">
              <div className="relative max-w-md w-full">
                <Search className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search templates..." 
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                />
              </div>
            </div>
          </div>

          {/* Category Blocks - Clean Minimal Product Card Design */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {[
              {
                id: 'barber',
                title: 'Barber',
                tagline: 'Clean cuts and booking‑friendly layouts',
                emoji: '💈',
                iconBg: 'bg-blue-500',
                description: 'Professional templates designed for barbershops with integrated booking systems and service showcases. Perfect for showcasing your cuts and building client trust.',
              },
              {
                id: 'tutor',
                title: 'Tutor',
                tagline: 'Lesson‑focused pages with clear CTAs',
                emoji: '📘',
                iconBg: 'bg-emerald-500',
                description: 'Educational templates that highlight your teaching expertise with clear lesson plans, student testimonials, and easy enrollment processes.',
              },
              {
                id: 'photographer',
                title: 'Photographer',
                tagline: 'Portfolio‑first designs with bold imagery',
                emoji: '📷',
                iconBg: 'bg-purple-500',
                description: 'Stunning portfolio templates that put your photography front and center with gallery showcases, client booking, and seamless image presentations.',
              },
            ].map((cat) => (
              <div
                key={cat.id}
                className={`group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg ${
                  cat.id === 'barber' || cat.id === 'tutor' || cat.id === 'photographer' ? 'md:w-[85%] md:mx-auto' : ''
                }`}
              >
                {/* Icon/Image Area */}
                <div className={`w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden ${
                  cat.id === 'barber' || cat.id === 'tutor' || cat.id === 'photographer' ? 'h-96' : 'h-48'
                }`}>
                  {cat.id === 'barber' ? (
                    // Barber card uses the professional image
                    <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <img 
                        src="/images/Barber_block.jpg" 
                        alt="Barber tools and products"
                        className="h-full w-full object-cover object-center"
                      />
                      {/* Subtle overlay for better text contrast if needed */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                    </div>
                  ) : cat.id === 'tutor' ? (
                    // Tutor card uses the professional image
                    <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <img 
                        src="/images/Tutor_block.jpg" 
                        alt="Tutor tools and resources"
                        className="h-full w-full object-cover object-center"
                      />
                      {/* Subtle overlay for better text contrast if needed */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                    </div>
                  ) : cat.id === 'photographer' ? (
                    // Photographer card uses the professional image
                    <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <img 
                        src="/images/photographer_block.jpg" 
                        alt="Photographer camera and equipment"
                        className="h-full w-full object-cover object-center"
                      />
                      {/* Subtle overlay for better text contrast if needed */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                    </div>
                  ) : (
                    // Other cards use emoji icons
                    <>
                      <div className={`${cat.iconBg} w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-md relative z-10`}>
                        <span>{cat.emoji}</span>
                      </div>
                      {/* Subtle pattern overlay */}
                      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_1px_1px,_black_1px,_transparent_0)] bg-[length:20px_20px]"></div>
                    </>
                  )}
                </div>

                {/* Content Section */}
                <div className={`flex flex-col ${cat.id === 'barber' || cat.id === 'tutor' || cat.id === 'photographer' ? 'p-5' : 'p-6'}`}>
                  {/* Title and Badge Row */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{cat.title}</h3>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Templates</span>
                  </div>

                  {/* Tagline */}
                  <p className="text-sm font-medium text-gray-900 mb-4">{cat.tagline}</p>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1">
                    {cat.description}
                  </p>

                  {/* Action Button */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/dashboard/templates?only=${cat.id}`)}
                      className="w-full bg-gray-900 text-white font-medium py-3 px-5 rounded-xl hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      View templates
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/templates?open=${cat.id}`)}
                      className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-2.5 px-5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Interactive Line Below Templates */}
          <div className="h-0.5 bg-gray-200 transition-all duration-300 group-hover:h-1 group-hover:bg-gray-300 mt-12"></div>
          </div>

          {/* Services Section - Prominent and Descriptive */}
          <div className="mt-16 group">
            {/* Header Section - Centered and Prominent */}
            <div className="mb-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Your Services</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Create and manage your service offerings. Each service gets its own payment link, making it easy for customers to book and pay online.
              </p>
              <button 
                onClick={() => router.push('/dashboard/services')}
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 text-lg shadow-lg hover:shadow-xl mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Add Service</span>
              </button>
            </div>

            {services.length === 0 ? (
              <div className="bg-white rounded-xl p-16 text-center border-2 border-gray-100">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No services yet</h3>
                <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                  Create your first service to start accepting payments online and grow your business. Each service gets its own unique payment link.
                </p>
                <button 
                  onClick={() => router.push('/dashboard/services')}
                  className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-lg shadow-lg hover:shadow-xl"
                >
                  Create Your First Service
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl w-full">
                  {services.map((service) => (
                    <div 
                      key={service.id} 
                      onClick={() => router.push('/dashboard/services')}
                      className="bg-gray-900 rounded-xl p-8 border border-gray-800 hover:shadow-xl hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 flex flex-col min-h-[280px]"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <h3 className="font-bold text-xl text-white pr-2">{service.name}</h3>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          service.isActive 
                            ? 'bg-gray-700 text-gray-200' 
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-base mb-8 flex-1 leading-relaxed">{service.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <span className="text-3xl font-bold text-white">R{service.price}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push('/dashboard/services');
                          }}
                          className="text-white hover:text-gray-300 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Interactive Line Below Services */}
            <div className="h-0.5 bg-gray-200 transition-all duration-300 group-hover:h-1 group-hover:bg-gray-300 mt-12"></div>
          </div>
        </div>
      </div>
    </div>
  );
}