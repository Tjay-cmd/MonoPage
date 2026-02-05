'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { checkBusinessDashboardAccess } from '@/lib/routeGuards';
import { BusinessType } from '@/types';

interface CalendarSettingsData {
  timeIncrement?: number;
  startTime?: string;
  endTime?: string;
  hasLunchBreak?: boolean;
  lunchBreakStart?: string;
  lunchBreakEnd?: string;
  closedOnWeekends?: boolean;
  closedDates?: string[];
  design?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    selectedDayColor?: string;
    closedDayColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  };
}
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Save,
  RefreshCw,
  Settings,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function BarberDashboardPage() {
  const router = useRouter();
  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const hasCheckedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<number | null>(null);
  
  // Calendar settings state
  const [settings, setSettings] = useState<CalendarSettingsData>({
    timeIncrement: 60,
    startTime: '09:00',
    endTime: '17:00',
    hasLunchBreak: false,
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    closedOnWeekends: false,
    closedDates: [],
  });

  // Bookings state
  const [bookings, setBookings] = useState<any[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Wait for subscription to finish loading from database
    if (subscriptionLoading) {
      return;
    }

    // Prevent multiple checks
    if (hasCheckedRef.current) {
      return;
    }

    const checkAccess = async () => {
      // Prevent multiple checks
      if (hasCheckedRef.current) {
        return;
      }
      hasCheckedRef.current = true;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      // Wait for subscription to be loaded
      if (!subscription) {
        // If subscription is null after loading, check profile for tier
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch('/api/users/profile', {
            headers: {
              'X-User-Id': currentUser.uid,
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            const profile = payload.profile as { tier?: string };
            const profileTier = profile.tier || 'free';
            
            // Check if profile tier is business or higher
            const tierHierarchy: Record<string, number> = {
              free: 0,
              starter: 1,
              pro: 2,
              business: 3,
              premium: 4,
              admin: 5,
            };

            if ((tierHierarchy[profileTier] || 0) < 3) {
              router.push('/dashboard/subscription');
              return;
            }
          } else {
            router.push('/dashboard/subscription');
            return;
          }
        } catch (error) {
          console.error('Error checking access:', error);
          router.push('/dashboard/subscription');
          return;
        }
      } else {
        // Check tier access from subscription hook
        const subscriptionTier = subscription?.tier || 'free';
        console.log('Checking subscription tier:', { 
          subscriptionTier, 
          subscription: subscription,
          hasTierAccess: hasTierAccess('business')
        });
        
        if (!hasTierAccess('business')) {
          console.log('Access denied - redirecting to subscription page');
          router.push('/dashboard/subscription');
          return;
        }
      }

      // Load user profile to check businessType from database
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/users/profile', {
          headers: {
            'X-User-Id': currentUser.uid,
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const payload = await response.json();
          const profile = payload.profile as {
            businessType?: BusinessType;
          };

          const userBusinessType = profile.businessType || 'barber';
          // Use subscription tier from hook, fallback to profile tier, then 'free'
          const userTier = subscription?.tier || (profile as any).tier || 'free';

          console.log('Checking business dashboard access:', {
            userBusinessType,
            userTier,
            subscriptionTier: subscription?.tier,
            profileTier: (profile as any).tier,
            subscription: subscription
          });

          // Check if user should access this dashboard
          const guardResult = checkBusinessDashboardAccess(
            userBusinessType,
            'barber',
            userTier as any,
            'business'
          );

          console.log('Guard result:', guardResult);

          if (!guardResult.allowed) {
            console.log('Access denied, redirecting to:', guardResult.redirectTo);
            // Redirect to correct dashboard
            router.push(guardResult.redirectTo || '/dashboard/business');
            return;
          }

          // Set user ID and load settings
          setUserId(currentUser.uid);
          await loadSettings(currentUser.uid);
          await loadBookings(currentUser.uid);
        }
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      // Check access when auth state changes
      checkAccess();
    });

    // Also check immediately
    checkAccess();

    return () => unsubscribe();
  }, [router, hasTierAccess, subscription, subscriptionLoading]);

  // Reset check flag when subscription changes
  useEffect(() => {
    if (!subscriptionLoading && subscription) {
      hasCheckedRef.current = false;
    }
  }, [subscription, subscriptionLoading]);

  // Handle iframe resizing from calendar embed
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'calendar-resize') {
        const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
        if (iframe) {
          iframe.style.height = `${event.data.height}px`;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Reload iframe when userId becomes available or timestamp changes
  useEffect(() => {
    if (userId && hasLoadedSettings) {
      // Use setTimeout to ensure DOM is ready
      const timer = setTimeout(() => {
        const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
        if (iframe) {
          const timestamp = lastUpdatedTimestamp || Date.now();
          const src = `/api/calendar/embed?userId=${userId}&_t=${timestamp}`;
          const fullSrc = window.location.origin + src;
          console.log('Setting calendar iframe src:', fullSrc);
          
          // Always set the src - this ensures it loads even after refresh
          iframe.src = src;
          
          // Add error handler
          iframe.onerror = () => {
            console.error('Iframe failed to load:', src);
          };
          
          // Add load handler
          iframe.onload = () => {
            console.log('Calendar iframe loaded successfully');
          };
        } else {
          console.warn('Calendar iframe element not found in DOM');
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [userId, hasLoadedSettings, lastUpdatedTimestamp]);

  // Periodically check for calendar updates and refresh bookings
  useEffect(() => {
    if (!userId || !hasLoadedSettings) return;

    const interval = setInterval(async () => {
      // Refresh bookings
      await loadBookings(userId);
      
      // Check if calendar settings were updated
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch(`/api/calendar/settings?userId=${userId}&checkOnly=true`, {
          headers: {
            'X-User-Id': userId,
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const newTimestamp = data.lastUpdatedTimestamp;
          
          // If timestamp changed, reload calendar preview
          if (newTimestamp && newTimestamp !== lastUpdatedTimestamp) {
            console.log('Calendar settings updated, refreshing preview. Old:', lastUpdatedTimestamp, 'New:', newTimestamp);
            setLastUpdatedTimestamp(newTimestamp);
            const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
            if (iframe) {
              // Force reload with new timestamp
              const newSrc = `/api/calendar/embed?userId=${userId}&_t=${newTimestamp}`;
              console.log('Reloading calendar iframe with new src:', newSrc);
              iframe.src = newSrc;
            }
          }
        }
      } catch (error) {
        // Ignore errors - this is just for auto-refresh
      }
    }, 5000); // Check every 5 seconds (reduced for faster updates after customization)

    return () => clearInterval(interval);
  }, [userId, hasLoadedSettings, lastUpdatedTimestamp]);

  const loadSettings = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/calendar/settings?userId=${uid}`, {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          const loadedSettings = {
            timeIncrement: data.settings.timeIncrement || 60,
            startTime: data.settings.startTime || '09:00',
            endTime: data.settings.endTime || '17:00',
            hasLunchBreak: data.settings.hasLunchBreak || false,
            lunchBreakStart: data.settings.lunchBreakStart || '12:00',
            lunchBreakEnd: data.settings.lunchBreakEnd || '13:00',
            closedOnWeekends: data.settings.closedOnWeekends || false,
            closedDates: data.settings.closedDates || [],
          };
          setSettings(loadedSettings);
          setHasLoadedSettings(true);
          // Use lastUpdatedTimestamp from the response, not from settings
          setLastUpdatedTimestamp(data.lastUpdatedTimestamp || data.settings?.lastUpdatedTimestamp || Date.now());
          
          // Load from localStorage if available (for unsaved changes)
          const localSettings = localStorage.getItem(`calendar_settings_${uid}`);
          if (localSettings) {
            try {
              const parsed = JSON.parse(localSettings);
              setSettings(prev => ({ ...prev, ...parsed }));
              setHasUnsavedChanges(true);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBookings = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/calendar/bookings', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
        
        // Convert bookings to dayTimeSlots format for calendar display
        const slots: Record<string, string[]> = {};
        (data.bookings || []).forEach((booking: any) => {
          if (booking.status === 'confirmed' || booking.status === 'pending') {
            if (!slots[booking.date]) {
              slots[booking.date] = [];
            }
            slots[booking.date].push(booking.time);
          }
        });
        setDayTimeSlots(slots);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        // Clear localStorage
        localStorage.removeItem(`calendar_settings_${userId}`);
        setHasUnsavedChanges(false);
        
        // Reload settings to get updated timestamp
        await loadSettings(userId);
        
        // Reload calendar preview
        const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
        if (iframe) {
          const newTimestamp = Date.now();
          iframe.src = `/api/calendar/embed?userId=${userId}&_t=${newTimestamp}`;
        }
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof CalendarSettingsData>(key: K, value: CalendarSettingsData[K]) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      // Save to localStorage for persistence
      if (userId) {
        localStorage.setItem(`calendar_settings_${userId}`, JSON.stringify(updated));
      }
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const handleDateToggle = (date: string) => {
    const currentDates = settings.closedDates || [];
    const updated = currentDates.includes(date)
      ? currentDates.filter(d => d !== date)
      : [...currentDates, date];
    updateSetting('closedDates', updated);
  };

  // Generate date picker for closed dates
  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      options.push(dateStr);
    }
    return options;
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center justify-center mb-6" aria-label="MonoPage home">
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

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Business</h2>
            <div className="space-y-1">
              <Link
                href="/dashboard/business/barber"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg bg-orange-100 text-orange-700 transition-colors w-full text-left"
              >
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Calendar & Bookings</span>
              </Link>
              <Link
                href="/dashboard/business/bookings"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Manage Bookings</span>
              </Link>
              <Link
                href="/dashboard/business/calendar-design"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Palette className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Calendar Design</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Calendar & Bookings</h1>
          <p className="text-lg text-gray-600">
            Configure your availability and manage client bookings
          </p>
        </div>

        {/* Settings Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Settings className="h-6 w-6" />
              <span>Calendar Settings</span>
            </h2>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="px-6 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          {hasUnsavedChanges && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                You have unsaved changes. Click "Save Changes" to apply them.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Time Settings</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.startTime}
                  onChange={(e) => updateSetting('startTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.endTime}
                  onChange={(e) => updateSetting('endTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Increment (minutes)
                </label>
                <select
                  value={settings.timeIncrement}
                  onChange={(e) => updateSetting('timeIncrement', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hasLunchBreak"
                  checked={settings.hasLunchBreak}
                  onChange={(e) => updateSetting('hasLunchBreak', e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="hasLunchBreak" className="text-sm font-medium text-gray-700">
                  Enable Lunch Break
                </label>
              </div>

              {settings.hasLunchBreak && (
                <div className="grid grid-cols-2 gap-4 ml-7">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lunch Start
                    </label>
                    <input
                      type="time"
                      value={settings.lunchBreakStart}
                      onChange={(e) => updateSetting('lunchBreakStart', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lunch End
                    </label>
                    <input
                      type="time"
                      value={settings.lunchBreakEnd}
                      onChange={(e) => updateSetting('lunchBreakEnd', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Availability Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Availability</span>
              </h3>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="closedOnWeekends"
                  checked={settings.closedOnWeekends}
                  onChange={(e) => updateSetting('closedOnWeekends', e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="closedOnWeekends" className="text-sm font-medium text-gray-700">
                  Closed on Weekends
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Closed Dates
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const weekends = generateDateOptions().filter(dateStr => {
                          const date = new Date(dateStr);
                          const day = date.getDay();
                          return day === 0 || day === 6; // Sunday or Saturday
                        });
                        const currentDates = settings.closedDates || [];
                        const allWeekendsSelected = weekends.every(d => currentDates.includes(d));
                        
                        if (allWeekendsSelected) {
                          // Remove all weekends
                          updateSetting('closedDates', currentDates.filter(d => !weekends.includes(d)));
                        } else {
                          // Add all weekends
                          const combined = Array.from(new Set([...currentDates, ...weekends]));
                          updateSetting('closedDates', combined);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Toggle Weekends
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSetting('closedDates', [])}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                {/* Visual Calendar Picker */}
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">
                      Click dates to mark them as closed. Selected dates are highlighted.
                    </p>
                    <div className="text-xs text-gray-500">
                      Showing next 60 days • {settings.closedDates?.length || 0} date(s) selected
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-7 gap-1">
                      {generateDateOptions().slice(0, 60).map((dateStr) => {
                        const date = new Date(dateStr);
                        const day = date.getDate();
                        const isClosed = settings.closedDates?.includes(dateStr) || false;
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const isPast = new Date(dateStr) < new Date();
                        const dayOfWeek = date.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => handleDateToggle(dateStr)}
                            disabled={isPast}
                            className={`
                              relative p-2 text-sm rounded-lg transition-all
                              ${isPast 
                                ? 'text-gray-300 cursor-not-allowed bg-gray-100' 
                                : isClosed
                                ? 'bg-orange-600 text-white hover:bg-orange-700 font-semibold'
                                : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200 hover:border-orange-300'
                              }
                              ${isToday && !isPast ? 'ring-2 ring-orange-400' : ''}
                              ${isWeekend && !isPast && !isClosed ? 'bg-blue-50 border-blue-200' : ''}
                            `}
                            title={date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          >
                            <div className="flex flex-col items-center">
                              <span>{day}</span>
                              {isClosed && (
                                <span className="text-xs mt-0.5">✕</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                      <span>Weekend</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-orange-600 rounded"></div>
                      <span>Closed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-100 rounded"></div>
                      <span>Past</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Calendar Preview</h2>
            <button
              onClick={async () => {
                console.log('Refresh button clicked, userId:', userId);
                const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
                if (!userId) {
                  console.error('Cannot refresh: userId is null');
                  alert('Please wait for the calendar to load.');
                  return;
                }
                if (!iframe) {
                  console.error('Cannot refresh: iframe not found');
                  return;
                }
                
                // Show loading state
                iframe.style.opacity = '0.5';
                
                try {
                  // Reload settings first to get latest timestamp
                  await loadSettings(userId);
                  
                // Force reload by updating timestamp state
                // This will trigger the useEffect and remount the iframe with new key
                const newTimestamp = Date.now();
                console.log('Refreshing calendar with new timestamp:', newTimestamp);
                setLastUpdatedTimestamp(newTimestamp);
                
                // Also directly update iframe src as backup
                setTimeout(() => {
                  const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
                  if (iframe) {
                    const newSrc = `/api/calendar/embed?userId=${userId}&_t=${newTimestamp}`;
                    console.log('Directly updating iframe src:', newSrc);
                    iframe.src = newSrc;
                  }
                }, 200);
                } catch (error) {
                  console.error('Error refreshing calendar:', error);
                  iframe.style.opacity = '1';
                  alert('Failed to refresh calendar. Please check the console for details.');
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            {userId && hasLoadedSettings ? (
              <iframe
                key={`calendar-${userId}-${lastUpdatedTimestamp || 'initial'}`}
                id="calendar-preview"
                src={`/api/calendar/embed?userId=${userId}&_t=${lastUpdatedTimestamp || Date.now()}`}
                className="w-full"
                style={{ height: '600px', border: 'none', backgroundColor: '#ffffff' }}
                scrolling="no"
                title="Calendar Preview"
                onLoad={(e) => {
                  // Ensure iframe is visible after load
                  const iframe = e.target as HTMLIFrameElement;
                  iframe.style.opacity = '1';
                  console.log('Calendar iframe onLoad event fired - calendar should be visible now');
                }}
                onError={(e) => {
                  console.error('Calendar iframe onError event fired:', e);
                  const iframe = e.target as HTMLIFrameElement;
                  iframe.style.opacity = '1';
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading calendar...</p>
                  {!userId && <p className="text-sm text-gray-500 mt-2">Waiting for authentication...</p>}
                  {userId && !hasLoadedSettings && <p className="text-sm text-gray-500 mt-2">Loading settings...</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
