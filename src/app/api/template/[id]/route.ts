import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise (Next.js 15+ requirement)
    const resolvedParams = await params;
    const templateId = resolvedParams.id;
    
    console.log('API Route: Starting template fetch for ID:', templateId);
    console.log('API Route: Request URL:', request.url);
    console.log('API Route: Request method:', request.method);
    
    // Get template metadata from Firestore
    console.log('API Route: Fetching template document from Firestore...');
    const templateDoc = await adminDb.collection('templates').doc(templateId).get();
    
    if (!templateDoc.exists) {
      console.log('API Route: Template document not found');
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    const templateData = templateDoc.data() || {};
    console.log('API Route: Template data:', templateData);
    console.log('API Route: Available fields:', Object.keys(templateData));
    
    // Try multiple possible field names for the ZIP URL
    const zipUrl = templateData.zipUrl || 
                   templateData.downloadURL || 
                   templateData.zipUrl || 
                   templateData.fileUrl ||
                   templateData.url;
    
    console.log('API Route: ZIP URL:', zipUrl);
    console.log('API Route: ZIP URL type:', typeof zipUrl);
    
    if (!zipUrl || typeof zipUrl !== 'string') {
      console.log('API Route: No valid ZIP URL found in template data');
      return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
    }
    
    // Extract the storage path from the URL
    console.log('API Route: Attempting to split URL:', zipUrl);
    const urlParts = zipUrl.split('/o/');
    console.log('API Route: URL parts:', urlParts);
    
    if (urlParts.length < 2) {
      console.log('API Route: Invalid Firebase Storage URL format');
      return NextResponse.json({ error: 'Invalid Firebase Storage URL' }, { status: 400 });
    }
    
    const encodedPath = urlParts[1].split('?')[0];
    const storagePath = decodeURIComponent(encodedPath);
    console.log('API Route: Storage path:', storagePath);
    
    // Fetch the file directly from Firebase Storage URL (server-side compatible)
    console.log('API Route: Fetching file from Firebase Storage URL...');
    const response = await fetch(zipUrl);
    console.log('API Route: Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file from Firebase Storage: ${response.status} ${response.statusText}`);
    }
    
    const zipBlob = await response.blob();
    console.log('API Route: Blob fetched successfully, size:', zipBlob.size);
    
    // Return the file as a response
    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="template.zip"`,
      },
    });
    
  } catch (error) {
    console.error('API Route: Error fetching template:', error);
    console.error('API Route: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ 
      error: 'Failed to fetch template',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
