'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Calendar,
  Palette,
  ArrowLeft,
  Save,
  RefreshCw,
  Moon,
  Sun,
} from 'lucide-react';
import Link from 'next/link';

export default function CalendarDesignPage() {
  const router = useRouter();
  const {
    subscription: subscriptionData,
    loading: subscriptionLoading,
    hasTierAccess,
  } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Calendar design settings
  const [primaryColor, setPrimaryColor] = useState('#f59e0b');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#111827');
  const [borderColor, setBorderColor] = useState('#e5e7eb');
  const [selectedDayColor, setSelectedDayColor] = useState('#fef3c7');
  const [closedDayColor, setClosedDayColor] = useState('#f3f4f6');
  const [buttonColor, setButtonColor] = useState('#f59e0b');
  const [buttonTextColor, setButtonTextColor] = useState('#ffffff');
  const [darkMode, setDarkMode] = useState(false);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedSettings, setLastSavedSettings] = useState<string | null>(null);

  // Function to detect if a color is dark
  const isColorDark = (color: string): boolean => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return true if dark (luminance < 0.5)
    return luminance < 0.5;
  };

  // Auto-detect dark mode when background color changes (only on initial load)
  useEffect(() => {
    if (backgroundColor && !lastSavedSettings) {
      const isDark = isColorDark(backgroundColor);
      setDarkMode(isDark);
    }
  }, [backgroundColor, lastSavedSettings]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      
      setLoading(false);
      
      // Load calendar design settings
      await loadDesignSettings(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadDesignSettings = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const response = await fetch('/api/calendar/settings', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.settings?.design) {
          const design = data.settings.design;
          setPrimaryColor(design.primaryColor || '#f59e0b');
          setBackgroundColor(design.backgroundColor || '#ffffff');
          setTextColor(design.textColor || '#111827');
          setBorderColor(design.borderColor || '#e5e7eb');
          setSelectedDayColor(design.selectedDayColor || '#fef3c7');
          setClosedDayColor(design.closedDayColor || '#f3f4f6');
          setButtonColor(design.buttonColor || '#f59e0b');
          setButtonTextColor(design.buttonTextColor || '#ffffff');
          setDarkMode(design.darkMode || false);
          
          // Store saved state
          setLastSavedSettings(JSON.stringify(design));
        }
      }
    } catch (error) {
      console.error('Error loading design settings:', error);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    const currentSettings = JSON.stringify({
      primaryColor,
      backgroundColor,
      textColor,
      borderColor,
      selectedDayColor,
      closedDayColor,
      buttonColor,
      buttonTextColor,
      darkMode,
    });
    
    setHasUnsavedChanges(currentSettings !== lastSavedSettings);
  }, [
    primaryColor,
    backgroundColor,
    textColor,
    borderColor,
    selectedDayColor,
    closedDayColor,
    buttonColor,
    buttonTextColor,
    lastSavedSettings,
  ]);

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const designSettings = {
        primaryColor,
        backgroundColor,
        textColor,
        borderColor,
        selectedDayColor,
        closedDayColor,
        buttonColor,
        buttonTextColor,
        darkMode,
      };
      
      // Get current calendar settings first
      const settingsResponse = await fetch('/api/calendar/settings', {
        headers: {
          'X-User-Id': currentUser.uid,
          'Authorization': `Bearer ${token}`,
        },
      });
      
      let currentSettings = {};
      if (settingsResponse.ok) {
        const data = await settingsResponse.json();
        currentSettings = data.settings || {};
      }
      
      // Save with design settings
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.uid,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...currentSettings,
          design: designSettings,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save design settings');
      }
      
      const result = await response.json();
      console.log('Design settings saved successfully:', result);
      
      setLastSavedSettings(JSON.stringify(designSettings));
      setHasUnsavedChanges(false);
      
      // Reload settings to get updated timestamp
      await loadDesignSettings(currentUser.uid);
      
      alert('Calendar design saved successfully! The calendar preview will update automatically.');
    } catch (error) {
      console.error('Error saving design settings:', error);
      alert('Failed to save design settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default colors? This will discard your changes.')) {
      setPrimaryColor('#f59e0b');
      setBackgroundColor('#ffffff');
      setTextColor('#111827');
      setBorderColor('#e5e7eb');
      setSelectedDayColor('#fef3c7');
      setClosedDayColor('#f3f4f6');
      setButtonColor('#f59e0b');
      setButtonTextColor('#ffffff');
    }
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Mono Page</span>
          </Link>
        </div>

        <div className="flex-1 p-6">
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Business</h2>
            <div className="space-y-1">
              <Link
                href="/dashboard/business/barber"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Calendar & Bookings</span>
              </Link>
              <Link
                href="/dashboard/business/bookings"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Manage Bookings</span>
              </Link>
              <Link
                href="/dashboard/business/calendar-design"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg bg-orange-100 text-orange-700 cursor-pointer transition-colors w-full text-left"
              >
                <Palette className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Calendar Design</span>
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Calendar Design</h1>
              <p className="text-lg text-gray-600">
                Customize your calendar colors to match your website's design
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saving}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 shadow-sm ${
                  hasUnsavedChanges
                    ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } ${saving ? 'opacity-70' : ''}`}
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
          {hasUnsavedChanges && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-orange-700 font-medium">
                You have unsaved changes. Click "Save Changes" to update your calendar.
              </span>
            </div>
          )}
        </div>

        {/* Color Customization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Colors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Colors</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color (Buttons, Highlights)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#f59e0b"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#f59e0b"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Text Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={buttonTextColor}
                    onChange={(e) => setButtonTextColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={buttonTextColor}
                    onChange={(e) => setButtonTextColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Colors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar Colors</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#111827"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#e5e7eb"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Day Colors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Day Colors</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Day Background
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={selectedDayColor}
                    onChange={(e) => setSelectedDayColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedDayColor}
                    onChange={(e) => setSelectedDayColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#fef3c7"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Closed Day Background
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={closedDayColor}
                    onChange={(e) => setClosedDayColor(e.target.value)}
                    className="w-16 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={closedDayColor}
                    onChange={(e) => setClosedDayColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="#f3f4f6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Mode</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-3">
                  {darkMode ? (
                    <Moon className="h-5 w-5 text-gray-700" />
                  ) : (
                    <Sun className="h-5 w-5 text-gray-700" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Dark Mode</p>
                    <p className="text-xs text-gray-500">
                      {isColorDark(backgroundColor) 
                        ? 'Auto-detected: Your background is dark' 
                        : 'Enable for dark-themed websites'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => {
                      setDarkMode(e.target.checked);
                      // Auto-adjust colors when toggling
                      if (e.target.checked) {
                        // Enable dark mode - adjust colors
                        if (textColor === '#111827' || textColor === '#000000') {
                          setTextColor('#ffffff');
                        }
                        if (borderColor === '#e5e7eb' || borderColor === '#d1d5db') {
                          setBorderColor('#374151');
                        }
                        if (selectedDayColor === '#fef3c7') {
                          setSelectedDayColor('#1f2937');
                        }
                        if (closedDayColor === '#f3f4f6') {
                          setClosedDayColor('#111827');
                        }
                      } else {
                        // Disable dark mode - reset to light colors
                        if (textColor === '#ffffff') {
                          setTextColor('#111827');
                        }
                        if (borderColor === '#374151') {
                          setBorderColor('#e5e7eb');
                        }
                        if (selectedDayColor === '#1f2937') {
                          setSelectedDayColor('#fef3c7');
                        }
                        if (closedDayColor === '#111827') {
                          setClosedDayColor('#f3f4f6');
                        }
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div 
            className="rounded-2xl shadow-sm border p-6"
            style={{
              backgroundColor: darkMode ? '#1f2937' : '#ffffff',
              borderColor: darkMode ? '#374151' : '#e5e7eb',
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: darkMode ? '#ffffff' : '#111827' }}
            >
              Preview
            </h3>
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: backgroundColor,
                  borderColor: borderColor,
                  color: textColor,
                }}
              >
                <div className="text-sm font-medium mb-2" style={{ color: textColor }}>Calendar Day</div>
                <div className="text-xs" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>Normal day preview</div>
              </div>
              <div 
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: selectedDayColor,
                  borderColor: primaryColor,
                  color: textColor,
                }}
              >
                <div className="text-sm font-medium mb-2" style={{ color: textColor }}>Selected Day</div>
                <div className="text-xs" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>Selected day preview</div>
              </div>
              <div 
                className="p-4 rounded-lg border-2"
                style={{
                  backgroundColor: closedDayColor,
                  borderColor: borderColor,
                  color: textColor,
                  opacity: 0.6,
                }}
              >
                <div className="text-sm font-medium mb-2" style={{ color: textColor }}>Closed Day</div>
                <div className="text-xs" style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>Closed day preview</div>
              </div>
              <button
                className="w-full px-4 py-2 rounded-lg font-semibold transition-colors"
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                }}
              >
                Button Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

