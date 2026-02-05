'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { checkBusinessDashboardAccess } from '@/lib/routeGuards';
import { BusinessType } from '@/types';
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

export default function TutorCalendarPage() {
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

  // Lessons/bookings state
  const [lessons, setLessons] = useState<any[]>([]);
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
        if (!hasTierAccess('business')) {
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
          const userTier = subscription?.tier || 'free';

          // Check if user should access this dashboard
          const guardResult = checkBusinessDashboardAccess(
            userBusinessType,
            'tutor',
            userTier as any,
            'business'
          );

          if (!guardResult.allowed) {
            // Redirect to correct dashboard
            router.push(guardResult.redirectTo || '/dashboard/business');
            return;
          }

          // Set user ID and load settings
          setUserId(currentUser.uid);
          await loadSettings(currentUser.uid);
          await loadLessons(currentUser.uid);
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
          const src = `/api/tutor/calendar/embed?userId=${userId}&_t=${timestamp}`;
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

  // Periodically check for calendar updates and refresh lessons
  useEffect(() => {
    if (!userId || !hasLoadedSettings) return;

    const interval = setInterval(async () => {
      // Refresh lessons
      await loadLessons(userId);
      
      // Check if calendar settings were updated
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch(`/api/tutor/calendar/settings?userId=${userId}&checkOnly=true`, {
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
              const newSrc = `/api/tutor/calendar/embed?userId=${userId}&_t=${newTimestamp}`;
              console.log('Reloading calendar iframe with new src:', newSrc);
              iframe.src = newSrc;
            }
          }
        }
      } catch (error) {
        // Ignore errors - this is just for auto-refresh
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [userId, hasLoadedSettings, lastUpdatedTimestamp]);

  const loadSettings = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/tutor/calendar/settings?userId=${uid}`, {
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
            design: data.settings.design,
          };
          setSettings(loadedSettings);
          setHasLoadedSettings(true);
          // Use lastUpdatedTimestamp from the response
          setLastUpdatedTimestamp(data.lastUpdatedTimestamp || data.settings?.lastUpdatedTimestamp || Date.now());
          
          // Load from localStorage if available (for unsaved changes)
          const localSettings = localStorage.getItem(`tutor_calendar_settings_${uid}`);
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

  const loadLessons = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/tutor/calendar/lessons', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
        
        // Convert lessons to dayTimeSlots format for calendar display
        const slots: Record<string, string[]> = {};
        (data.lessons || []).forEach((lesson: any) => {
          if (lesson.status === 'confirmed' || lesson.status === 'pending') {
            if (!slots[lesson.date]) {
              slots[lesson.date] = [];
            }
            slots[lesson.date].push(lesson.time);
          }
        });
        setDayTimeSlots(slots);
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/tutor/calendar/settings', {
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
        localStorage.removeItem(`tutor_calendar_settings_${userId}`);
        setHasUnsavedChanges(false);
        
        // Reload settings to get updated timestamp
        await loadSettings(userId);
        
        // Reload calendar preview
        const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
        if (iframe) {
          const newTimestamp = Date.now();
          iframe.src = `/api/tutor/calendar/embed?userId=${userId}&_t=${newTimestamp}`;
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
        localStorage.setItem(`tutor_calendar_settings_${userId}`, JSON.stringify(updated));
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
          <Link href="/dashboard/business/tutor" className="flex items-center mb-4">
            <ArrowLeft className="h-5 w-5 text-gray-600 mr-2" />
            <span className="text-sm text-gray-600">Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Image
              src="/images/Logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded"
            />
            <h1 className="text-xl font-bold text-gray-900">Tutor Dashboard</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard/business/tutor/calendar"
            className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 text-orange-700"
          >
            <Calendar className="h-5 w-5" />
            <span>Calendar & Lessons</span>
          </Link>
          <Link
            href="/dashboard/business/tutor/resources"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-5 w-5" />
            <span>Resources</span>
          </Link>
          <Link
            href="/dashboard/business/tutor/classes"
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <User className="h-5 w-5" />
            <span>Classes & Groups</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Calendar & Lesson Scheduling</h2>
            <p className="text-gray-600">Manage your lesson schedule and availability</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Settings
                  </h3>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Time Increment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Increment (minutes)
                    </label>
                    <select
                      value={settings.timeIncrement || 60}
                      onChange={(e) => updateSetting('timeIncrement', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={settings.startTime || '09:00'}
                      onChange={(e) => updateSetting('startTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={settings.endTime || '17:00'}
                      onChange={(e) => updateSetting('endTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  {/* Lunch Break */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasLunchBreak"
                      checked={settings.hasLunchBreak || false}
                      onChange={(e) => updateSetting('hasLunchBreak', e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hasLunchBreak" className="ml-2 text-sm text-gray-700">
                      Enable Lunch Break
                    </label>
                  </div>

                  {settings.hasLunchBreak && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lunch Break Start
                        </label>
                        <input
                          type="time"
                          value={settings.lunchBreakStart || '12:00'}
                          onChange={(e) => updateSetting('lunchBreakStart', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Lunch Break End
                        </label>
                        <input
                          type="time"
                          value={settings.lunchBreakEnd || '13:00'}
                          onChange={(e) => updateSetting('lunchBreakEnd', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </>
                  )}

                  {/* Closed on Weekends */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="closedOnWeekends"
                      checked={settings.closedOnWeekends || false}
                      onChange={(e) => updateSetting('closedOnWeekends', e.target.checked)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="closedOnWeekends" className="ml-2 text-sm text-gray-700">
                      Closed on Weekends
                    </label>
                  </div>

                  {/* Closed Dates */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Closed Dates
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {generateDateOptions().map((date) => {
                        const dateObj = new Date(date);
                        const isSelected = settings.closedDates?.includes(date) || false;
                        return (
                          <div
                            key={date}
                            onClick={() => handleDateToggle(date)}
                            className={`flex items-center p-2 rounded cursor-pointer ${
                              isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {dateObj.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Calendar Preview
                  </h3>
                  <button
                    onClick={() => {
                      const iframe = document.getElementById('calendar-preview') as HTMLIFrameElement;
                      if (iframe) {
                        const timestamp = Date.now();
                        iframe.src = `/api/tutor/calendar/embed?userId=${userId}&_t=${timestamp}`;
                      }
                    }}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    id="calendar-preview"
                    className="w-full border-0"
                    style={{ height: '600px', minHeight: '600px' }}
                    title="Calendar Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



