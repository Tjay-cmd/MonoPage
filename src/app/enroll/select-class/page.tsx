'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Lock } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  description?: string;
  color?: string;
  coverImageUrl?: string | null;
  paymentLink?: string | null;
}

function SelectClassContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const enrollmentId = searchParams.get('enrollmentId');
  const tutorId = searchParams.get('tutorId');
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClasses = async () => {
      if (!tutorId) {
        // Try to get tutorId from enrollment
        if (enrollmentId) {
          try {
            const response = await fetch(`/api/tutor/enroll/${enrollmentId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.tutorId) {
                await loadTutorClasses(data.tutorId);
                return;
              }
            }
          } catch (e) {
            console.error('Error loading enrollment:', e);
          }
        }
        setError('Tutor ID or enrollment ID required');
        setLoading(false);
        return;
      }

      await loadTutorClasses(tutorId);
    };

    loadClasses();
  }, [tutorId, enrollmentId]);

  const loadTutorClasses = async (tutorIdParam: string) => {
    try {
      const response = await fetch(`/api/tutor/classes/public?userId=${tutorIdParam}`);
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      } else {
        setError('Failed to load classes');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async () => {
    if (!selectedClassId || !enrollmentId) {
      setError('Please select a class');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/tutor/enroll/select-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollmentId,
          classId: selectedClassId,
        }),
      });

      if (response.ok) {
        // Redirect to student portal
        router.push(`/student/${tutorId}/classes/${selectedClassId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to select class');
      }
    } catch (error: any) {
      console.error('Class selection error:', error);
      setError('Failed to select class. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  if (!enrollmentId && !tutorId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600">This enrollment link is invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Class Cards */}
      <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Select Your Class</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {classes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No classes available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  onClick={() => setSelectedClassId(classItem.id)}
                  className={`group relative cursor-pointer transition-all rounded-lg overflow-hidden border-2 ${
                    selectedClassId === classItem.id
                      ? 'border-orange-500 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Cover Image or Color Background */}
                  {classItem.coverImageUrl ? (
                    <div className="relative h-36 w-full overflow-hidden rounded-t-lg">
                      <img
                        src={classItem.coverImageUrl}
                        alt={classItem.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-bold text-lg mb-1 drop-shadow-lg">{classItem.name}</h3>
                        {classItem.description && (
                          <p className="text-xs opacity-95 line-clamp-1 drop-shadow-md">{classItem.description}</p>
                        )}
                      </div>
                      {selectedClassId === classItem.id && (
                        <div className="absolute top-3 right-3 bg-orange-500 rounded-full p-1.5 shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="relative p-5 rounded-t-lg"
                      style={{ backgroundColor: classItem.color || '#1e40af' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-white mb-1">{classItem.name}</h3>
                          {classItem.description && (
                            <p className="text-sm text-white/90 line-clamp-1">{classItem.description}</p>
                          )}
                        </div>
                        {selectedClassId === classItem.id && (
                          <div className="bg-white rounded-full p-1.5 ml-3 shadow-lg">
                            <Check className="h-4 w-4 text-orange-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content Area - Get Access Section */}
      <div className="flex-1 bg-gray-800 flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          {selectedClassId ? (
            <>
              {/* Selected Class Info */}
              {selectedClass && (
                <div className="mb-8">
                  {selectedClass.coverImageUrl && (
                    <div className="mb-6">
                      <img
                        src={selectedClass.coverImageUrl}
                        alt={selectedClass.name}
                        className="w-full h-64 object-cover rounded-lg shadow-xl mx-auto"
                      />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedClass.name}</h3>
                  {selectedClass.description && (
                    <p className="text-gray-300 mb-4">{selectedClass.description}</p>
                  )}
                </div>
              )}

              {/* Payment Link or Direct Enrollment */}
              {selectedClass?.paymentLink ? (
                <div className="space-y-4">
                  <a
                    href={selectedClass.paymentLink}
                    className="inline-block px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    Get Access
                  </a>
                  <p className="text-sm text-gray-400 mt-4">or</p>
                  <button
                    onClick={handleSelect}
                    disabled={submitting}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {submitting ? 'Enrolling...' : 'Enroll Without Payment'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleSelect}
                    disabled={submitting}
                    className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {submitting ? 'Enrolling...' : 'Get Access'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Lock Icon */}
              <div className="mb-8">
                <Lock className="h-24 w-24 text-white mx-auto mb-6 opacity-80" />
              </div>
              
              {/* CTA Text */}
              <h2 className="text-3xl font-bold text-white mb-4">Get Access</h2>
              <p className="text-gray-400 mb-8 text-lg">
                Select a class from the left to continue
              </p>
              
              {/* Placeholder Button */}
              <button
                disabled
                className="px-8 py-4 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed font-semibold text-lg opacity-50"
              >
                Get Access
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SelectClassPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div>}>
      <SelectClassContent />
    </Suspense>
  );
}
