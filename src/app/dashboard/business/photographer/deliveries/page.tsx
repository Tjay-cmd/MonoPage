'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { checkBusinessDashboardAccess } from '@/lib/routeGuards';
import { BusinessType } from '@/types';
import JSZip from 'jszip';
import {
  Upload,
  Mail,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Wrench,
  ChevronDown,
  ChevronUp,
  Palette,
  User,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Delivery {
  id: string;
  clientEmail: string;
  clientName: string;
  sessionId?: string;
  zipSize: number;
  originalFileCount: number;
  status: 'pending' | 'zipping' | 'uploading' | 'sending' | 'sent' | 'failed';
  deliveryMethod?: 'attachment' | 'download-link';
  sentAt?: string;
  createdAt: string;
  errorMessage?: string;
}

export default function PhotographerDeliveriesPage() {
  const router = useRouter();
  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const hasCheckedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [toolsOpen, setToolsOpen] = useState(true);

  useEffect(() => {
    if (subscriptionLoading) return;
    if (hasCheckedRef.current) return;

    const checkAccess = async () => {
      if (hasCheckedRef.current) return;
      hasCheckedRef.current = true;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      if (!subscription) {
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
        if (!hasTierAccess('business')) {
          router.push('/dashboard/subscription');
          return;
        }
      }

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

          const userBusinessType = profile.businessType || 'photographer';
          const userTier = subscription?.tier || 'free';

          const guardResult = checkBusinessDashboardAccess(
            userBusinessType,
            'photographer',
            userTier as any,
            'business'
          );

          if (!guardResult.allowed) {
            router.push(guardResult.redirectTo || '/dashboard/business');
            return;
          }

          setUserId(currentUser.uid);
          await loadBookings(currentUser.uid);
          await loadDeliveries(currentUser.uid);
        }
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }
      checkAccess();
    });

    checkAccess();
    return () => unsubscribe();
  }, [router, hasTierAccess, subscription, subscriptionLoading]);

  useEffect(() => {
    if (!subscriptionLoading && subscription) {
      hasCheckedRef.current = false;
    }
  }, [subscription, subscriptionLoading]);

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
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadDeliveries = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/photographer/deliveries', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createZip = async (files: File[]): Promise<Blob> => {
    const zip = new JSZip();
    let processed = 0;

    for (const file of files) {
      const fileData = await file.arrayBuffer();
      zip.file(file.name, fileData);
      processed++;
      setZipProgress(Math.round((processed / files.length) * 100));
    }

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  };

  const handleUpload = async () => {
    if (!userId || selectedFiles.length === 0 || !clientEmail || !clientName) {
      alert('Please select files, enter client email, and client name');
      return;
    }

    setUploading(true);
    setZipProgress(0);
    setUploadProgress(0);

    try {
      // Create ZIP client-side
      const zipBlob = await createZip(selectedFiles);
      const zipFile = new File([zipBlob], 'photos.zip', { type: 'application/zip' });

      // Validate ZIP size (500MB limit)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (zipFile.size > maxSize) {
        alert(`ZIP file is too large (${(zipFile.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 500MB.`);
        setUploading(false);
        return;
      }

      // Upload ZIP to server
      const formData = new FormData();
      formData.append('zipFile', zipFile);
      formData.append('clientEmail', clientEmail);
      formData.append('clientName', clientName);
      formData.append('originalFileCount', selectedFiles.length.toString());
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert('Authentication error. Please try again.');
        setUploading(false);
        return;
      }

      // Track upload progress
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await fetch('/api/photographer/deliveries', {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload delivery');
      }

      const result = await response.json();
      
      // Reset form
      setSelectedFiles([]);
      setClientEmail('');
      setClientName('');
      setSessionId('');
      setZipProgress(0);
      setUploadProgress(0);

      // Reload deliveries
      await loadDeliveries(userId);

      alert('Photos uploaded successfully! Click "Send to Client" to deliver them.');
    } catch (error: any) {
      console.error('Error uploading:', error);
      alert(error.message || 'Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (deliveryId: string) => {
    if (!userId) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/photographer/deliveries/${deliveryId}/send`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to send delivery';
        
        // Handle specific error cases
        if (errorMessage.includes('already sent')) {
          // Reload deliveries to get updated status
          await loadDeliveries(userId);
          alert('This delivery has already been sent to the client.');
          return;
        }
        
        throw new Error(errorMessage);
      }

      await loadDeliveries(userId);
      alert('Photos sent to client successfully!');
    } catch (error: any) {
      console.error('Error sending delivery:', error);
      alert(error.message || 'Failed to send photos. Please try again.');
    }
  };

  const handleResend = async (deliveryId: string) => {
    if (!userId) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/photographer/deliveries/${deliveryId}/resend`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to resend delivery';
        
        // Handle specific error cases
        if (errorMessage.includes('already sent')) {
          await loadDeliveries(userId);
          alert('This delivery has already been sent. If you need to send again, please upload a new delivery.');
          return;
        }
        
        if (errorMessage.includes('no longer exists')) {
          await loadDeliveries(userId);
          alert('The ZIP file no longer exists. Please upload the photos again.');
          return;
        }
        
        throw new Error(errorMessage);
      }

      await loadDeliveries(userId);
      alert('Photos resent to client successfully!');
    } catch (error: any) {
      console.error('Error resending delivery:', error);
      alert(error.message || 'Failed to resend photos. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStatusIcon = (status: Delivery['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'sending':
      case 'uploading':
      case 'zipping':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
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
                href="/dashboard/business/photographer"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <Camera className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Calendar & Sessions</span>
              </Link>
              <Link
                href="/dashboard/business/bookings"
                className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
              >
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Manage Sessions</span>
              </Link>
            </div>
          </div>

          {/* Tools Dropdown */}
          <div className="mb-8">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Wrench className="h-4 w-4 text-gray-600" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tools</h2>
              </div>
              {toolsOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
            {toolsOpen && (
              <div className="mt-1 space-y-1 ml-7">
                <Link
                  href="/dashboard/business/calendar-design"
                  className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-left"
                >
                  <Palette className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Calendar Design</span>
                </Link>
                <Link
                  href="/dashboard/business/photographer/deliveries"
                  className="flex items-center space-x-3 py-2 px-3 rounded-lg bg-orange-100 text-orange-700 transition-colors w-full text-left"
                >
                  <Package className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Client Deliveries</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <Link
            href="/dashboard/business/photographer"
            className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Deliveries</h1>
          <p className="text-lg text-gray-600">
            Upload edited photos, zip them automatically, and send to your clients
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">New Delivery</h2>

          {/* Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Email *
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="client@example.com"
              />
            </div>
          </div>

          {/* Session Selection (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Session (Optional)
            </label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select a session...</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.clientName} - {booking.date} {booking.time}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos ({selectedFiles.length} selected)
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop photos here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Only image files are supported. Maximum 500MB compressed.
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress Indicators */}
          {uploading && (
            <div className="mb-6 space-y-2">
              {zipProgress < 100 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Creating ZIP archive...</span>
                    <span>{zipProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${zipProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {zipProgress === 100 && uploadProgress < 100 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Uploading ZIP file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0 || !clientEmail || !clientName}
            className="w-full px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            <span>{uploading ? 'Uploading...' : 'Upload Photos'}</span>
          </button>
        </div>

        {/* Deliveries List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Deliveries</h2>
          
          {deliveries.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No deliveries yet</p>
              <p className="text-sm text-gray-500 mt-2">Upload photos above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {getStatusIcon(delivery.status)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{delivery.clientName}</h3>
                        <p className="text-sm text-gray-600">{delivery.clientEmail}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {delivery.originalFileCount} photos • {formatFileSize(delivery.zipSize)} •{' '}
                          {new Date(delivery.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {delivery.status === 'pending' || delivery.status === 'uploading' ? (
                        <button
                          onClick={() => handleSend(delivery.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                        >
                          <Mail className="h-4 w-4" />
                          <span>Send to Client</span>
                        </button>
                      ) : delivery.status === 'sending' ? (
                        <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Sending...</span>
                        </span>
                      ) : delivery.status === 'failed' ? (
                        <button
                          onClick={() => handleResend(delivery.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Resend</span>
                        </button>
                      ) : delivery.status === 'sent' ? (
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                          Sent {delivery.sentAt ? new Date(delivery.sentAt).toLocaleDateString() : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {delivery.errorMessage && (
                    <div className="mt-2 text-sm text-red-600">
                      Error: {delivery.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
