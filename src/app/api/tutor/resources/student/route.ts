import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/server/firebaseAdmin';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const enrollmentId = searchParams.get('enrollmentId');

    if (!classId || !enrollmentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: classId, enrollmentId' },
        { status: 400 }
      );
    }

    // Verify enrollment
    const enrollmentRef = adminDb.collection('tutor-enrollments').doc(enrollmentId);
    const enrollmentDoc = await enrollmentRef.get();

    if (!enrollmentDoc.exists) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    const enrollmentData = enrollmentDoc.data();

    // Check if payment is completed and class matches
    if (enrollmentData?.paymentStatus !== 'completed') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 403 }
      );
    }

    if (enrollmentData?.classId !== classId) {
      return NextResponse.json(
        { error: 'Access denied to this class' },
        { status: 403 }
      );
    }

    // Get class to find linked resources
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const classData = classDoc.data();
    const resourceIds = classData?.resourceIds || [];

    if (resourceIds.length === 0) {
      return NextResponse.json({ resources: [] });
    }

    // Get resources
    const resources: any[] = [];
    const bucket = adminStorage.bucket();

    for (const resourceId of resourceIds) {
      try {
        const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
        const resourceDoc = await resourceRef.get();

        if (resourceDoc.exists) {
          const resourceData = resourceDoc.data();
          
          // Generate signed download URL (valid for 1 hour)
          let downloadUrl = '';
          if (resourceData?.storagePath) {
            try {
              const file = bucket.file(resourceData.storagePath);
              const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 3600000, // 1 hour
              });
              downloadUrl = url;
            } catch (storageError) {
              console.error('Error generating download URL:', storageError);
            }
          }

          resources.push({
            id: resourceDoc.id,
            name: resourceData?.name || 'Untitled',
            description: resourceData?.description || '',
            fileType: resourceData?.fileType || 'file',
            downloadUrl,
            size: resourceData?.size || 0,
            uploadedAt: resourceData?.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error loading resource ${resourceId}:`, error);
      }
    }

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching student resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

