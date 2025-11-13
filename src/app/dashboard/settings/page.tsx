'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updateEmail, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { User } from '@/types';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  CreditCard,
  Settings,
  User as UserIcon,
  Mail,
  Image as ImageIcon,
  Building2,
  CheckCircle,
  AlertCircle,
  Upload
} from 'lucide-react';

interface MerchantSettings {
  merchantId: string;
  merchantKey: string;
  passPhrase: string;
  environment: 'sandbox' | 'production';
}

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassPhrase, setShowPassPhrase] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile Settings
  const [profileData, setProfileData] = useState({
    email: '',
    businessName: '',
    businessType: '',
    profileImageUrl: ''
  });

  // Merchant Settings
  const [settings, setSettings] = useState<MerchantSettings>({
    merchantId: '',
    merchantKey: '',
    passPhrase: '',
    environment: 'sandbox'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            const rawUserData = userDoc.data(); // Access raw data for optional fields
            setUser(userData);
            
            // Load profile data
            setProfileData({
              email: firebaseUser.email || '',
              businessName: userData.businessName || '',
              businessType: userData.businessType || '',
              profileImageUrl: (rawUserData?.profileImageUrl as string) || ''
            });
            
            // Load merchant settings
            const settingsDoc = await getDoc(doc(db, 'merchantSettings', firebaseUser.uid));
            if (settingsDoc.exists()) {
              setSettings(settingsDoc.data() as MerchantSettings);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setSaving(true);
      setMessage(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please upload an image file.' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 5MB.' });
        return;
      }

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-images/${user.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update user document
      await updateDoc(doc(db, 'users', user.id), {
        profileImageUrl: downloadURL,
        updatedAt: new Date()
      });

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser!, {
        photoURL: downloadURL
      });

      setProfileData(prev => ({ ...prev, profileImageUrl: downloadURL }));
      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      setMessage({ type: 'error', text: 'Failed to upload profile image. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const updates: any = {
        businessName: profileData.businessName,
        businessType: profileData.businessType,
        updatedAt: new Date()
      };

      // Update email if changed
      if (profileData.email !== auth.currentUser?.email) {
        await updateEmail(auth.currentUser!, profileData.email);
      }

      // Update user document
      await updateDoc(doc(db, 'users', user.id), updates);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMerchantSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      await setDoc(doc(db, 'merchantSettings', user.id), {
        ...settings,
        updatedAt: new Date()
      });

      setMessage({ type: 'success', text: 'Merchant settings saved successfully!' });
    } catch (error) {
      console.error('Error saving merchant settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof MerchantSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Settings</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage your profile, account details, and payment credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <UserIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Profile Information</h3>
              <p className="text-sm text-gray-600">Update your profile details and photo</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Profile Image */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {profileData.profileImageUrl ? (
                  <img
                    src={profileData.profileImageUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                    <UserIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Photo
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-gray-700 border-2 border-gray-200 px-4 py-2 rounded-xl font-semibold hover:border-gray-300 transition-colors inline-flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Photo</span>
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-2" />
                Business Name
              </label>
              <input
                type="text"
                value={profileData.businessName}
                onChange={(e) => handleProfileChange('businessName', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                placeholder="Your Business Name"
                required
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={profileData.businessType}
                onChange={(e) => handleProfileChange('businessType', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                required
              >
                <option value="">Select business type</option>
                <option value="barber">Barber</option>
                <option value="photographer">Photographer</option>
                <option value="tutor">Tutor</option>
                <option value="beauty-salon">Beauty Salon</option>
                <option value="fitness-trainer">Fitness Trainer</option>
                <option value="consultant">Consultant</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center space-x-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* PayFast Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">PayFast Configuration</h3>
              <p className="text-sm text-gray-600">Enter your PayFast merchant credentials</p>
            </div>
          </div>

          <form onSubmit={handleMerchantSettingsSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merchant ID
                </label>
                <input
                  type="text"
                  value={settings.merchantId}
                  onChange={(e) => handleInputChange('merchantId', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                  placeholder="Enter your PayFast Merchant ID"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in your PayFast merchant dashboard
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merchant Key
                </label>
                <input
                  type="text"
                  value={settings.merchantKey}
                  onChange={(e) => handleInputChange('merchantKey', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
                  placeholder="Enter your PayFast Merchant Key"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Found in your PayFast merchant dashboard
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPassPhrase ? 'text' : 'password'}
                  value={settings.passPhrase}
                  onChange={(e) => handleInputChange('passPhrase', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base pr-12"
                  placeholder="Enter your PayFast Passphrase"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassPhrase(!showPassPhrase)}
                >
                  {showPassPhrase ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Set in your PayFast merchant dashboard under Settings → Integration
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <select
                value={settings.environment}
                onChange={(e) => handleInputChange('environment', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-base"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Use Sandbox for testing, Production for live payments
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors inline-flex items-center space-x-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save PayFast Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Where to find your PayFast credentials:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Log into your PayFast merchant dashboard</li>
              <li>Go to Settings → Integration</li>
              <li>Copy your Merchant ID, Merchant Key, and set a Passphrase</li>
              <li>Use Sandbox for testing, Production for live payments</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Your credentials are encrypted and stored securely. 
              Only you can access and modify them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
