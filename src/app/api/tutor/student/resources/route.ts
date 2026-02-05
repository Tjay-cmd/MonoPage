import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { adminStorage } from '@/lib/server/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutorId');
    const classId = searchParams.get('classId');
    const email = searchParams.get('email'); // Optional - for verification

    if (!tutorId || !classId) {
      return NextResponse.json(
        { error: 'Missing tutorId or classId' },
        { status: 400 }
      );
    }

    // Verify enrollment if email provided
    if (email) {
      const enrollmentRef = adminDb.collection('tutor-enrollments')
        .where('tutorId', '==', tutorId)
        .where('studentEmail', '==', email.toLowerCase())
        .where('classId', '==', classId)
        .limit(1);

      const enrollmentSnapshot = await enrollmentRef.get();

      if (enrollmentSnapshot.empty) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      const enrollment = enrollmentSnapshot.docs[0].data();
      if (enrollment.paymentStatus !== 'completed') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 403 }
        );
      }
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
    for (const resourceId of resourceIds) {
      const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
      const resourceDoc = await resourceRef.get();

      if (resourceDoc.exists) {
        const resourceData = resourceDoc.data();
        
        // Generate download URL if file exists
        let downloadUrl = null;
        if (resourceData?.filePath) {
          try {
            const bucket = adminStorage.bucket();
            const file = bucket.file(resourceData.filePath);
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });
            downloadUrl = url;
          } catch (error) {
            console.error('Error generating download URL:', error);
          }
        }

        resources.push({
          id: resourceDoc.id,
          name: resourceData?.name || 'Untitled',
          description: resourceData?.description || '',
          fileType: resourceData?.fileType || 'file',
          downloadUrl,
          size: resourceData?.size || null,
        });
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

