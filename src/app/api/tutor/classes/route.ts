import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, resourceIds, coverImageUrl, paymentLink } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    // Generate class ID
    const classId = randomBytes(16).toString('hex');

    // Create class document
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    await classRef.set({
      tutorId: userId,
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#f59e0b',
      resourceIds: resourceIds || [],
      coverImageUrl: coverImageUrl || null,
      paymentLink: paymentLink || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update resources to link them to this class
    if (resourceIds && resourceIds.length > 0) {
      const batch = adminDb.batch();
      for (const resourceId of resourceIds) {
        const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
        const resourceDoc = await resourceRef.get();
        if (resourceDoc.exists) {
          const resourceData = resourceDoc.data();
          const currentClassIds = resourceData?.classIds || [];
          if (!currentClassIds.includes(classId)) {
            batch.update(resourceRef, {
              classIds: [...currentClassIds, classId],
              updatedAt: new Date(),
            });
          }
        }
      }
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      classId,
    });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Get all classes for this tutor
    try {
      const classesRef = adminDb.collection('tutor-classes')
        .where('tutorId', '==', userId)
        .orderBy('createdAt', 'desc');
      
      const classesSnapshot = await classesRef.get();
      const classes = classesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || '',
          color: data.color || '#f59e0b',
          resourceIds: data.resourceIds || [],
          coverImageUrl: data.coverImageUrl || null,
          paymentLink: data.paymentLink || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });

      return NextResponse.json({
        classes,
      });
    } catch (error: any) {
      // If index doesn't exist, try without orderBy
      const classesRef = adminDb.collection('tutor-classes')
        .where('tutorId', '==', userId);
      
      const classesSnapshot = await classesRef.get();
      const classes = classesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || '',
          color: data.color || '#f59e0b',
          resourceIds: data.resourceIds || [],
          coverImageUrl: data.coverImageUrl || null,
          paymentLink: data.paymentLink || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({
        classes,
      });
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, color, resourceIds, coverImageUrl, paymentLink } = body;

    // Get existing class
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classData = classDoc.data();
    
    // Verify ownership
    if (classData?.tutorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get old resource IDs
    const oldResourceIds = classData?.resourceIds || [];
    const newResourceIds = resourceIds || [];

    // Update class
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (color !== undefined) updateData.color = color || '#f59e0b';
    if (resourceIds !== undefined) updateData.resourceIds = newResourceIds;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl || null;
    if (paymentLink !== undefined) updateData.paymentLink = paymentLink || null;

    await classRef.update(updateData);

    // Update resource links
    const resourcesToAdd = newResourceIds.filter((id: string) => !oldResourceIds.includes(id));
    const resourcesToRemove = oldResourceIds.filter((id: string) => !newResourceIds.includes(id));

    const batch = adminDb.batch();
    
    // Add class to new resources
    for (const resourceId of resourcesToAdd) {
      const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
      const resourceDoc = await resourceRef.get();
      if (resourceDoc.exists) {
        const resourceData = resourceDoc.data();
        const currentClassIds = resourceData?.classIds || [];
        if (!currentClassIds.includes(classId)) {
          batch.update(resourceRef, {
            classIds: [...currentClassIds, classId],
            updatedAt: new Date(),
          });
        }
      }
    }

    // Remove class from old resources
    for (const resourceId of resourcesToRemove) {
      const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
      const resourceDoc = await resourceRef.get();
      if (resourceDoc.exists) {
        const resourceData = resourceDoc.data();
        const currentClassIds = resourceData?.classIds || [];
        batch.update(resourceRef, {
          classIds: currentClassIds.filter((id: string) => id !== classId),
          updatedAt: new Date(),
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!classId) {
      return NextResponse.json({ error: 'Class ID required' }, { status: 400 });
    }

    // Get class document
    const classRef = adminDb.collection('tutor-classes').doc(classId);
    const classDoc = await classRef.get();

    if (!classDoc.exists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const classData = classDoc.data();
    
    // Verify ownership
    if (classData?.tutorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check for enrollments
    try {
      const enrollmentsRef = adminDb.collection('tutor-enrollments')
        .where('tutorId', '==', userId)
        .where('classId', '==', classId);
      
      const enrollmentsSnapshot = await enrollmentsRef.get();
      if (!enrollmentsSnapshot.empty) {
        return NextResponse.json(
          { error: 'Cannot delete class with active enrollments' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // If index doesn't exist, continue with deletion
      console.warn('Could not check enrollments:', error.message);
    }

    // Unlink resources
    const resourceIds = classData?.resourceIds || [];
    const batch = adminDb.batch();
    
    for (const resourceId of resourceIds) {
      const resourceRef = adminDb.collection('tutor-resources').doc(resourceId);
      const resourceDoc = await resourceRef.get();
      if (resourceDoc.exists) {
        const resourceData = resourceDoc.data();
        const currentClassIds = resourceData?.classIds || [];
        batch.update(resourceRef, {
          classIds: currentClassIds.filter((id: string) => id !== classId),
          updatedAt: new Date(),
        });
      }
    }

    await batch.commit();

    // Delete class document
    await classRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}



