'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  Globe,
  Clock,
  Upload,
  X,
  Zap,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface UserWebsite {
  id: string;
  templateId: string;
  templateName: string;
  websiteName: string;
  savedHtml: string;
  savedCss: string;
  savedJs?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
  publishedUrl?: string;
  publishedAt?: string;
  previewImageUrl?: string;
  previewGeneratedAt?: string;
}

export default function UserWebsitesPage() {
  const [user, loading] = useAuthState(auth);
  const [websites, setWebsites] = useState<UserWebsite[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserWebsites();
    }
  }, [user]);

  const isPermissionDenied = (error: unknown): boolean => {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in (error as Record<string, unknown>) &&
      (error as { code?: string }).code === 'permission-denied'
    );
  };

  const handlePermissionDenied = (message?: string) => {
    setPermissionWarning(
      message ||
        'This account does not currently have permission to read website data. Please contact support if you believe this is incorrect.'
    );
    setWebsites([]);
  };

  // Auto-refresh websites every 60 seconds to catch newly generated previews (disabled for now to stop constant refreshing)
  // useEffect(() => {
  //   if (!user) return;
  //   
  //   const interval = setInterval(() => {
  //     console.log('🔄 Auto-refreshing websites to check for new previews...');
  //     fetchUserWebsites();
  //   }, 60000); // Check every 60 seconds

  //   return () => clearInterval(interval);
  // }, [user]);

  const fetchUserWebsites = async (retryCount = 0) => {
    if (!user) return;
    
    setLoadingWebsites(true);
    setPermissionWarning(null);
    setFetchError(null);
    try {
      console.log('🔍 Fetching websites for user:', user.uid, retryCount > 0 ? `(retry ${retryCount})` : '');
      const websitesRef = collection(db, 'user_websites');
      const q = query(
        websitesRef,
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const websitesData: UserWebsite[] = [];
      
      console.log(`📊 Query returned ${querySnapshot.size} documents`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Found website:', doc.id);
        console.log('📄 Preview URL:', data.previewImageUrl || 'NO PREVIEW URL');
        websitesData.push({
          id: doc.id,
          ...data
        } as UserWebsite);
      });
      
      console.log(`✅ Fetched ${websitesData.length} website(s)`);
      setWebsites(websitesData);
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.warn('⚠️ Firestore denied access to user websites collection.', { userId: user.uid });
        handlePermissionDenied('You do not have permission to view saved websites.');
        return;
      }

      console.error('❌ Error fetching websites:', error);
      setFetchError('We could not load your websites. Retrying with fallback strategy…');
      
      // Check if it's a BloomFilter error and retry
      if (error instanceof Error && error.message.includes('BloomFilter') && retryCount < 3) {
        console.log(`🔄 BloomFilter error detected, retrying in ${(retryCount + 1) * 1000}ms...`);
        setTimeout(() => {
          fetchUserWebsites(retryCount + 1);
        }, (retryCount + 1) * 1000);
        return;
      }
      
      // If it's not a BloomFilter error or we've exhausted retries, try a simpler query
      if (retryCount === 0) {
        console.log('🔄 Trying simpler query without orderBy...');
        try {
          const websitesRef = collection(db, 'user_websites');
          const q = query(
            websitesRef,
            where('userId', '==', user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const websitesData: UserWebsite[] = [];
          
          querySnapshot.forEach((doc) => {
            console.log('📄 Fallback query found website:', doc.id, doc.data());
            websitesData.push({
              id: doc.id,
              ...doc.data()
            } as UserWebsite);
          });
          
          // Sort manually by updatedAt
          websitesData.sort((a, b) => {
            // Handle both Firestore Timestamp and string dates
            const aUpdatedAt = (a as any).updatedAt;
            const bUpdatedAt = (b as any).updatedAt;
            
            const aTime = (aUpdatedAt && typeof aUpdatedAt.toDate === 'function') 
              ? aUpdatedAt.toDate() 
              : new Date(aUpdatedAt || a.updatedAt || 0);
            const bTime = (bUpdatedAt && typeof bUpdatedAt.toDate === 'function') 
              ? bUpdatedAt.toDate() 
              : new Date(bUpdatedAt || b.updatedAt || 0);
            
            return bTime.getTime() - aTime.getTime();
          });
          
          console.log(`✅ Fetched ${websitesData.length} website(s) with fallback query`);
          setWebsites(websitesData);
        } catch (fallbackError) {
          if (isPermissionDenied(fallbackError)) {
            console.warn('⚠️ Firestore denied fallback website query.', { userId: user.uid });
            handlePermissionDenied('You do not have permission to view saved websites.');
            return;
          }

          console.error('❌ Fallback query also failed:', fallbackError);
          setFetchError('We could not load your websites. Trying one last fallback…');
          
          // Try an even simpler query - get all documents and filter client-side
          console.log('🔄 Trying client-side filtering...');
          try {
            const websitesRef = collection(db, 'user_websites');
            const querySnapshot = await getDocs(websitesRef);
            const websitesData: UserWebsite[] = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.userId === user.uid) {
                console.log('📄 Client-side filter found website:', doc.id, data);
                websitesData.push({
                  id: doc.id,
                  ...data
                } as UserWebsite);
              }
            });
            
            // Sort manually by updatedAt
            websitesData.sort((a, b) => {
              // Handle both Firestore Timestamp and string dates
              const aUpdatedAt = (a as any).updatedAt;
              const bUpdatedAt = (b as any).updatedAt;
              
              const aTime = (aUpdatedAt && typeof aUpdatedAt.toDate === 'function') 
                ? aUpdatedAt.toDate() 
                : new Date(aUpdatedAt || a.updatedAt || 0);
              const bTime = (bUpdatedAt && typeof bUpdatedAt.toDate === 'function') 
                ? bUpdatedAt.toDate() 
                : new Date(bUpdatedAt || b.updatedAt || 0);
              
              return bTime.getTime() - aTime.getTime();
            });
            
            console.log(`✅ Fetched ${websitesData.length} website(s) with client-side filtering`);
            setWebsites(websitesData);
          } catch (clientError) {
            if (isPermissionDenied(clientError)) {
              console.warn('⚠️ Firestore denied client-side fallback website query.', { userId: user.uid });
              handlePermissionDenied('You do not have permission to view saved websites.');
              return;
            }

            console.error('❌ Client-side filtering also failed:', clientError);
            setFetchError('Something went wrong while loading your websites.');
          }
        }
      }
    } finally {
      setLoadingWebsites(false);
    }
  };

  const deleteWebsite = async (websiteId: string) => {
    if (!confirm('Are you sure you want to delete this website? This action cannot be undone.')) {
      return;
    }

    setDeletingId(websiteId);
    try {
      await deleteDoc(doc(db, 'user_websites', websiteId));
      setWebsites(websites.filter(w => w.id !== websiteId));
    } catch (error) {
      console.error('Error deleting website:', error);
      alert('Failed to delete website. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const publishWebsite = async (website: UserWebsite) => {
    if (!confirm('Are you sure you want to publish this website? It will be publicly accessible to anyone with the link.')) {
      return;
    }

    setPublishingId(website.id);
    try {
      const publicId = `${website.userId}---${website.id}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const normalizedBase = appUrl?.replace(/\/$/, '') || '';
      const publishedUrl = `${normalizedBase}/p/${publicId}`;

      await updateDoc(doc(db, 'user_websites', website.id), {
        status: 'published',
        publishedUrl,
        publishedAt: serverTimestamp(),
      });

      setWebsites(websites.map(w =>
        w.id === website.id
          ? { ...w, status: 'published', publishedUrl, publishedAt: new Date().toISOString() }
          : w
      ));

      alert(`Website published successfully! Public URL: ${publishedUrl}`);
    } catch (error) {
      console.error('Error publishing website:', error);
      alert('Failed to publish website. Please try again.');
    } finally {
      setPublishingId(null);
    }
  };

  const unpublishWebsite = async (website: UserWebsite) => {
    if (!confirm('Are you sure you want to unpublish this website? It will no longer be publicly accessible.')) {
      return;
    }

    setUnpublishingId(website.id);
    try {
      await updateDoc(doc(db, 'user_websites', website.id), {
        status: 'draft',
        publishedUrl: null,
        publishedAt: null,
      });

      setWebsites(websites.map(w =>
        w.id === website.id
          ? { ...w, status: 'draft', publishedUrl: undefined, publishedAt: undefined }
          : w
      ));

      alert('Website unpublished successfully!');
    } catch (error) {
      console.error('Error unpublishing website:', error);
      alert('Failed to unpublish website. Please try again.');
    } finally {
      setUnpublishingId(null);
    }
  };

  const previewWebsite = (website: UserWebsite) => {
    const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    if (newWindow) {
      // Build full HTML with CSS
      const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${website.websiteName}</title>
  <style>${website.savedCss || ''}</style>
</head>
<body>
  ${website.savedHtml || ''}
  <script>${website.savedJs || ''}</script>
</body>
</html>
      `;
      newWindow.document.write(fullHtml);
      newWindow.document.close();
      newWindow.document.title = `${website.websiteName} - Preview`;
    } else {
      alert('Please allow popups for this site to open the preview');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || loadingWebsites) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your websites...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h1>
          <p className="text-gray-600">You need to be signed in to view your websites.</p>
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
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">My Websites</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Manage your saved and customized websites. Edit, publish, or preview your creations.
            </p>
            <Link
              href="/dashboard/templates"
              className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors flex items-center space-x-2 text-lg shadow-lg hover:shadow-xl inline-flex"
            >
              <FileText className="h-5 w-5" />
              <span>Create New Website</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8 relative">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-50 rounded-full blur-3xl opacity-30"></div>
        </div>
        
        {permissionWarning && (
          <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 mb-6 relative z-10">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl text-center shadow-sm">
              {permissionWarning}
            </div>
          </div>
        )}

        {fetchError && !permissionWarning && (
          <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 mb-6 relative z-10">
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center shadow-sm">
              {fetchError}
            </div>
          </div>
        )}

        {/* Stats Section - Only show if there are websites */}
        {websites.length > 0 && (
          <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 mb-10 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-3">{websites.length}</div>
                <div className="text-base text-gray-600 font-medium">Total Websites</div>
              </div>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="text-4xl font-bold text-amber-600 mb-3">
                  {websites.filter(w => w.status === 'published').length}
                </div>
                <div className="text-base text-gray-600 font-medium">Published</div>
              </div>
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="text-4xl font-bold text-orange-600 mb-3">
                  {websites.filter(w => w.status === 'draft').length}
                </div>
                <div className="text-base text-gray-600 font-medium">Drafts</div>
              </div>
            </div>
          </div>
        )}
        
        {websites.length === 0 ? (
          <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Globe className="h-16 w-16 text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-xl">✨</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to Build Something Amazing?
              </h3>
              <p className="text-lg text-gray-600 mb-6 max-w-lg mx-auto">
                Create your first website in minutes. Choose from beautiful templates designed for your business type.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="/dashboard/templates"
                className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-lg shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Browse Templates</span>
              </Link>
                <Link
                  href="/dashboard"
                  className="bg-white text-gray-700 border-2 border-gray-200 px-8 py-4 rounded-xl font-semibold hover:border-gray-300 transition-colors text-lg inline-flex items-center space-x-2"
                >
                  <span>View Dashboard</span>
                </Link>
              </div>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Quick Setup</h4>
                  <p className="text-sm text-gray-600">Get online in minutes, not hours</p>
                </div>
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Mobile Ready</h4>
                  <p className="text-sm text-gray-600">Looks great on all devices</p>
                </div>
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Easy to Edit</h4>
                  <p className="text-sm text-gray-600">Update anytime, anywhere</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {websites.map((website) => (
                <WebsiteCard 
                  key={website.id} 
                  website={website}
                  previewWebsite={previewWebsite}
                  publishWebsite={publishWebsite}
                  unpublishWebsite={unpublishWebsite}
                  deleteWebsite={deleteWebsite}
                  formatDate={formatDate}
                  publishingId={publishingId}
                  unpublishingId={unpublishingId}
                  deletingId={deletingId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate component to handle image aspect ratio detection
function WebsiteCard({ 
  website,
  previewWebsite,
  publishWebsite,
  unpublishWebsite,
  deleteWebsite,
  formatDate,
  publishingId,
  unpublishingId,
  deletingId
}: { 
  website: UserWebsite;
  previewWebsite: (website: UserWebsite) => void;
  publishWebsite: (website: UserWebsite) => void;
  unpublishWebsite: (website: UserWebsite) => void;
  deleteWebsite: (websiteId: string) => void;
  formatDate: (dateString: string) => string;
  publishingId: string | null;
  unpublishingId: string | null;
  deletingId: string | null;
}) {
  const router = useRouter();
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectRatio(ratio);
      setImageLoaded(true);
      console.log('✅ Preview image loaded successfully for:', website.websiteName, 'Aspect ratio:', ratio);
      const container = img.parentElement;
      if (container) {
        const placeholder = container.querySelector('.preview-placeholder') as HTMLElement;
        if (placeholder) {
          placeholder.style.display = 'none';
        }
      }
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('❌ Failed to load preview image:', website.previewImageUrl);
    const target = e.currentTarget;
    const container = target.parentElement;
    if (container) {
      container.style.backgroundImage = 'none';
      const placeholder = container.querySelector('.preview-placeholder') as HTMLElement;
      if (placeholder) {
        placeholder.style.display = 'flex';
      }
    }
  };

  // Calculate aspect ratio class or style
  const getAspectRatioStyle = () => {
    if (aspectRatio && imageLoaded) {
      // Use the actual image aspect ratio
      return { aspectRatio: `${aspectRatio} / 1` };
    }
    // Default to 32/25 while loading
    return { aspectRatio: '32 / 25' };
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col">
                  {/* Website Preview */}
      <div 
        className="bg-gray-100 overflow-hidden relative flex items-center justify-center w-full"
        style={{
          ...getAspectRatioStyle(),
          ...(website.previewImageUrl && imageLoaded ? {
            backgroundImage: `url(/api/image-proxy?url=${encodeURIComponent(website.previewImageUrl)})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          } : {})
        }}
      >
                    {website.previewImageUrl ? (
                      <>
            {/* Hidden img for aspect ratio detection and loading detection */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
              ref={imageRef}
                          src={`/api/image-proxy?url=${encodeURIComponent(website.previewImageUrl)}`}
                          alt={`${website.websiteName} preview`}
              className="hidden"
              onLoad={handleImageLoad}
              onError={handleImageError}
                        />
                        <div 
                          className="preview-placeholder text-center absolute inset-0 flex flex-col items-center justify-center bg-gray-100"
                          style={{ zIndex: 1, display: 'none' }}
                          data-website-id={website.id}
                        >
                          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Loading preview...</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center flex flex-col items-center justify-center h-full w-full">
                        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Website Preview</p>
                        <p className="text-xs text-gray-400 mt-1">No preview available</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Website Info */}
                  <div className="p-7 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          {website.websiteName}
                        </h3>
                        <p className="text-base text-gray-600">
                          Based on: {website.templateName}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {website.status === 'draft' ? (
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            <Clock className="h-4 w-4 mr-1.5" />
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            <Globe className="h-4 w-4 mr-1.5" />
                            Published
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-6 space-y-2.5">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Created: {formatDate(website.createdAt)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Updated: {formatDate(website.updatedAt)}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-auto pt-5 border-t border-gray-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => previewWebsite(website)}
                          className="bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-base flex items-center justify-center"
                        >
                          <Eye className="h-5 w-5 mr-2" />
                          Preview
                        </button>
                        {website.status === 'draft' ? (
                          <button
                            onClick={() => publishWebsite(website)}
                            disabled={publishingId === website.id}
                            className="bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-base flex items-center justify-center"
                          >
                            {publishingId === website.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Upload className="h-5 w-5 mr-2" />
                                Publish
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <a
                              href={website.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-gray-900 text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-base text-center flex items-center justify-center"
                            >
                              <ExternalLink className="h-5 w-5 mr-2" />
                              View
                            </a>
                            <button
                              onClick={() => unpublishWebsite(website)}
                              disabled={unpublishingId === website.id}
                              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                              title="Unpublish website"
                            >
                              {unpublishingId === website.id ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                              ) : (
                                <X className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Link
                          href={`/dashboard/templates/${website.templateId}/editor?websiteId=${website.id}`}
                          className="bg-gray-100 text-gray-900 px-5 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-base flex items-center justify-center"
                        >
                          <Edit className="h-5 w-5 mr-2" />
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteWebsite(website.id)}
                          disabled={deletingId === website.id}
                          className="bg-gray-100 text-red-600 px-5 py-3 rounded-xl font-semibold hover:bg-gray-200 hover:text-red-700 transition-colors text-base flex items-center justify-center"
                        >
                          {deletingId === website.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <>
                              <Trash2 className="h-5 w-5 mr-2" />
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
      </div>
    </div>
  );
}
