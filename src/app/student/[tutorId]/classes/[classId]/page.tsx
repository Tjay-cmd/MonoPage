'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, File, Folder, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

interface Resource {
  id: string;
  name: string;
  description?: string;
  fileType: string;
  downloadUrl?: string;
  size?: number;
  uploadedAt?: string;
}

export default function StudentClassPage() {
  const params = useParams();
  const router = useRouter();
  const tutorId = params.tutorId as string;
  const classId = params.classId as string;

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if student is authenticated via session/enrollment
        const enrollmentId = sessionStorage.getItem(`enrollment_${tutorId}`);
        if (!enrollmentId) {
          // Try to get from URL params (after enrollment)
          const urlParams = new URLSearchParams(window.location.search);
          const enrollmentIdParam = urlParams.get('enrollmentId');
          if (enrollmentIdParam) {
            sessionStorage.setItem(`enrollment_${tutorId}`, enrollmentIdParam);
            setAuthenticated(true);
            await loadResources(enrollmentIdParam);
            return;
          }
          setError('Please complete enrollment to access resources');
          setLoading(false);
          return;
        }

        // Verify enrollment
        const response = await fetch(`/api/tutor/enroll/${enrollmentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.paymentStatus === 'completed' && data.classId === classId) {
            setAuthenticated(true);
            await loadResources(enrollmentId);
          } else {
            setError('You do not have access to this class');
          }
        } else {
          setError('Invalid enrollment');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setError('Failed to verify access');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [tutorId, classId]);

  const loadResources = async (enrollmentId: string) => {
    try {
      const response = await fetch(`/api/tutor/resources/student?classId=${classId}&enrollmentId=${enrollmentId}`);
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load resources');
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      setError('Failed to load resources');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/enroll?tutorId=${tutorId}`}
            className="inline-block px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Enroll Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Class Resources</h1>
              <p className="text-sm text-gray-600 mt-1">Access your learning materials</p>
            </div>
            <Link
              href={`/enroll?tutorId=${tutorId}`}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Resources List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && authenticated && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {resources.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resources Available</h3>
            <p className="text-gray-600">Your tutor hasn't uploaded any resources yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Resources ({resources.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {resource.fileType === 'folder' ? (
                          <Folder className="h-8 w-8 text-orange-600" />
                        ) : (
                          <File className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {resource.name}
                        </h3>
                        {resource.description && (
                          <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{resource.fileType.toUpperCase()}</span>
                          {resource.size && <span>{formatFileSize(resource.size)}</span>}
                          {resource.uploadedAt && (
                            <span>
                              Uploaded {new Date(resource.uploadedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {resource.downloadUrl && (
                      <a
                        href={resource.downloadUrl}
                        download
                        className="ml-4 flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
