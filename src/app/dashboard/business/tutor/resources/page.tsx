'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { checkBusinessDashboardAccess } from '@/lib/routeGuards';
import { BusinessType } from '@/types';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  ArrowLeft,
  Settings,
  Calendar,
  User,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Resource {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export default function TutorResourcesPage() {
  const router = useRouter();
  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const hasCheckedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [resourceName, setResourceName] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

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

          const userBusinessType = profile.businessType || 'tutor';
          const userTier = subscription?.tier || 'free';

          const guardResult = checkBusinessDashboardAccess(
            userBusinessType,
            'tutor',
            userTier as any,
            'business'
          );

          if (!guardResult.allowed) {
            router.push(guardResult.redirectTo || '/dashboard/business');
            return;
          }

          setUserId(currentUser.uid);
          await loadResources(currentUser.uid);
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

  const loadResources = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/tutor/resources', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!userId || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', resourceName || file.name);
        formData.append('description', resourceDescription);

        const response = await fetch('/api/tutor/resources', {
          method: 'POST',
          headers: {
            'X-User-Id': userId,
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to upload resource');
        }

        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      // Clear form
      setSelectedFiles([]);
      setResourceName('');
      setResourceDescription('');
      
      // Reload resources
      await loadResources(userId);
      
      alert('Resources uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading resources:', error);
      alert(error.message || 'Failed to upload resources');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this resource?')) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/tutor/resources?id=${resourceId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadResources(userId);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource');
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
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-5 w-5" />
            <span>Calendar & Lessons</span>
          </Link>
          <Link
            href="/dashboard/business/tutor/resources"
            className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 text-orange-700"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Resources</h2>
            <p className="text-gray-600">Upload and manage your teaching resources (PDFs, videos, images, documents)</p>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Resources</h3>
            
            {/* File Upload */}
            <div className="mb-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 hover:border-orange-400'
                }`}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDFs, videos, images, and documents
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resource Name and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Name (optional)
                </label>
                <input
                  type="text"
                  value={resourceName}
                  onChange={(e) => setResourceName(e.target.value)}
                  placeholder="Enter resource name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={resourceDescription}
                  onChange={(e) => setResourceDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading... {Math.round(uploadProgress)}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'Resource' : 'Resources'}
                </>
              )}
            </button>
          </div>

          {/* Resources List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Uploaded Resources</h3>
            </div>
            <div className="p-6">
              {resources.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No resources uploaded yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(resource.fileType)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {resource.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(resource.fileSize)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {resource.description && (
                        <p className="text-xs text-gray-600 mt-2">{resource.description}</p>
                      )}
                      <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:text-orange-700 mt-2 inline-block"
                      >
                        View/Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



