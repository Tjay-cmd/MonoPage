'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { checkBusinessDashboardAccess } from '@/lib/routeGuards';
import { BusinessType } from '@/types';
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Settings,
  Calendar,
  User,
  X,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Resource {
  id: string;
  name: string;
  description?: string;
  fileType: string;
}

interface Class {
  id: string;
  name: string;
  description: string;
  color?: string;
  resourceIds: string[];
  coverImageUrl?: string | null;
  paymentLink?: string | null;
  createdAt: string;
}

export default function TutorClassesPage() {
  const router = useRouter();
  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const hasCheckedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Data
  const [classes, setClasses] = useState<Class[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [classColor, setClassColor] = useState('#f59e0b');
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

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
          await loadClasses(currentUser.uid);
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

  const loadClasses = async (uid: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/tutor/classes', {
        headers: {
          'X-User-Id': uid,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

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

  const handleCoverImageUpload = async () => {
    if (!userId || !coverImageFile || !editingClass) {
      alert('Please select a class and image first');
      return;
    }

    setUploadingCover(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const formData = new FormData();
      formData.append('file', coverImageFile);

      const response = await fetch(`/api/tutor/classes/upload-cover?classId=${editingClass.id}`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCoverImageUrl(data.coverImageUrl);
        setCoverImageFile(null);
        alert('Cover image uploaded successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload cover image');
      }
    } catch (error) {
      console.error('Error uploading cover image:', error);
      alert('Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !className.trim()) {
      alert('Please enter a class name');
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      // For new classes, create first, then upload cover image
      // For existing classes, upload cover image if needed, then update
      let finalCoverImageUrl = coverImageUrl;
      let createdClassId = editingClass?.id;

      // Create or update class first
      const classData: any = {
        name: className.trim(),
        description: classDescription.trim(),
        color: classColor,
        resourceIds: selectedResourceIds,
        coverImageUrl: finalCoverImageUrl,
        paymentLink: paymentLink.trim() || null,
      };

      const url = editingClass
        ? `/api/tutor/classes?id=${editingClass.id}`
        : '/api/tutor/classes';
      const method = editingClass ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save class');
        return;
      }

      // If new class, get the class ID from response
      if (!editingClass) {
        const responseData = await response.json();
        createdClassId = responseData.classId;
      }

      // Upload cover image if it's a new file (for both new and existing classes)
      if (coverImageFile && createdClassId) {
        const formData = new FormData();
        formData.append('file', coverImageFile);
        const uploadResponse = await fetch(`/api/tutor/classes/upload-cover?classId=${createdClassId}`, {
          method: 'POST',
          headers: {
            'X-User-Id': userId,
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          finalCoverImageUrl = uploadData.coverImageUrl;
          // Update class with the cover image URL
          await fetch(`/api/tutor/classes?id=${createdClassId}`, {
            method: 'PATCH',
            headers: {
              'X-User-Id': userId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ coverImageUrl: finalCoverImageUrl }),
          });
        }
      }

      // Reset form
      setClassName('');
      setClassDescription('');
      setClassColor('#f59e0b');
      setSelectedResourceIds([]);
      setCoverImageUrl(null);
      setPaymentLink('');
      setCoverImageFile(null);
      setShowForm(false);
      setEditingClass(null);
      
      // Reload classes
      await loadClasses(userId);
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Failed to save class');
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setClassName(classItem.name);
    setClassDescription(classItem.description);
    setClassColor(classItem.color || '#f59e0b');
    setSelectedResourceIds(classItem.resourceIds || []);
    setCoverImageUrl(classItem.coverImageUrl || null);
    setPaymentLink(classItem.paymentLink || '');
    setCoverImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (classId: string) => {
    if (!userId || !confirm('Are you sure you want to delete this class?')) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`/api/tutor/classes?id=${classId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadClasses(userId);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class');
    }
  };

  const toggleResource = (resourceId: string) => {
    setSelectedResourceIds(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
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
            className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-5 w-5" />
            <span>Resources</span>
          </Link>
          <Link
            href="/dashboard/business/tutor/classes"
            className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 text-orange-700"
          >
            <User className="h-5 w-5" />
            <span>Classes & Groups</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Classes & Groups</h2>
              <p className="text-gray-600">Create and manage your classes and groups</p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingClass(null);
                setClassName('');
                setClassDescription('');
                setClassColor('#f59e0b');
                setSelectedResourceIds([]);
                setCoverImageUrl(null);
                setPaymentLink('');
                setCoverImageFile(null);
              }}
              className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Class
            </button>
          </div>

          {/* Create/Edit Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingClass ? 'Edit Class' : 'Create New Class'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingClass(null);
                    setCoverImageFile(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g., Math 101, English Advanced"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                    placeholder="Enter class description"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Color (for orbit animation)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={classColor}
                      onChange={(e) => setClassColor(e.target.value)}
                      className="h-12 w-24 border-2 border-gray-200 rounded-xl cursor-pointer"
                    />
                    <div className="text-sm text-gray-600">
                      Used when no cover image is set
                    </div>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cover Image
                  </label>
                  {coverImageUrl && (
                    <div className="mb-4 relative group">
                      <img
                        src={coverImageUrl}
                        alt="Cover preview"
                        className="w-full h-64 object-cover rounded-xl border-2 border-gray-200 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageUrl(null);
                          setCoverImageFile(null);
                        }}
                        className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverImageFile(file);
                          // Preview
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCoverImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: 800x600px or larger. Max 10MB. JPG, PNG, or WebP.
                    </p>
                  </div>
                  {editingClass && coverImageFile && (
                    <button
                      type="button"
                      onClick={handleCoverImageUpload}
                      disabled={uploadingCover}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      {uploadingCover ? 'Uploading...' : 'Upload Cover Image'}
                    </button>
                  )}
                </div>

                {/* Payment Link */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    placeholder="https://payfast.co.za/..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Add a PayFast payment link. Students will see this when selecting this class.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Resources ({selectedResourceIds.length} selected)
                  </label>
                  {resources.length === 0 ? (
                    <p className="text-sm text-gray-500 mb-2">
                      No resources uploaded yet. <Link href="/dashboard/business/tutor/resources" className="text-orange-600 hover:text-orange-700">Upload resources first</Link>.
                    </p>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <div className="space-y-2">
                        {resources.map((resource) => (
                          <div
                            key={resource.id}
                            onClick={() => toggleResource(resource.id)}
                            className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                              selectedResourceIds.includes(resource.id)
                                ? 'bg-orange-50 border border-orange-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              {selectedResourceIds.includes(resource.id) ? (
                                <Check className="h-4 w-4 text-orange-600" />
                              ) : (
                                <div className="h-4 w-4 border border-gray-300 rounded" />
                              )}
                              <span className="text-sm text-gray-900">{resource.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingClass(null);
                      setCoverImageFile(null);
                    }}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {editingClass ? 'Update Class' : 'Create Class'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Classes List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Your Classes</h3>
              <p className="text-sm text-gray-600 mt-1">Manage your classes and enrollment settings</p>
            </div>
            <div className="p-6">
              {classes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium mb-2">No classes created yet</p>
                  <p className="text-gray-400 text-sm">Click "Create Class" above to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classes.map((classItem) => {
                    const linkedResources = resources.filter(r => 
                      classItem.resourceIds?.includes(r.id)
                    );
                    return (
                      <div
                        key={classItem.id}
                        className="border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all bg-white group"
                      >
                        {/* Cover Image Preview */}
                        {classItem.coverImageUrl ? (
                          <div className="relative h-48 w-full overflow-hidden">
                            <img
                              src={classItem.coverImageUrl}
                              alt={classItem.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(classItem)}
                                className="bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                                title="Edit class"
                              >
                                <Edit className="h-4 w-4 text-gray-700" />
                              </button>
                              <button
                                onClick={() => handleDelete(classItem.id)}
                                className="bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                                title="Delete class"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="h-48 w-full flex items-center justify-center relative group"
                            style={{ backgroundColor: classItem.color || '#f59e0b' }}
                          >
                            <div className="text-white/70 text-4xl font-bold">
                              {classItem.name.charAt(0)}
                            </div>
                            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(classItem)}
                                className="bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                                title="Edit class"
                              >
                                <Edit className="h-4 w-4 text-gray-700" />
                              </button>
                              <button
                                onClick={() => handleDelete(classItem.id)}
                                className="bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                                title="Delete class"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {!classItem.coverImageUrl && (
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: classItem.color || '#f59e0b' }}
                                  />
                                )}
                                <h4 className="text-lg font-bold text-gray-900">
                                  {classItem.name}
                                </h4>
                              </div>
                              {classItem.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {classItem.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-500">
                                  {linkedResources.length} {linkedResources.length === 1 ? 'resource' : 'resources'}
                                </span>
                                {classItem.paymentLink && (
                                  <span className="inline-flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                                    <Check className="h-3 w-3" />
                                    Payment Link
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Mobile buttons - visible on small screens */}
                            <div className="flex items-center space-x-2 ml-2 md:hidden">
                              <button
                                onClick={() => handleEdit(classItem)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit class"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(classItem.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete class"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



