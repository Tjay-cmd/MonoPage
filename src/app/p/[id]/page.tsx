import { Metadata } from 'next';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const publicId = resolvedParams.id;

    // Extract userId and websiteId from the publicId
    const [userId, websiteId] = publicId.split('---', 2);

    if (!userId || !websiteId) {
      return {
        title: 'Website Not Found',
      };
    }

    // Get the website document
    const websiteDoc = await adminDb.collection('user_websites').doc(websiteId).get();

    if (!websiteDoc.exists) {
      return {
        title: 'Website Not Found',
      };
    }

    const websiteData = websiteDoc.data() || {};

    // Check if the website is published and the userId matches
    if (websiteData.status !== 'published' || websiteData.userId !== userId) {
      return {
        title: 'Website Not Found',
      };
    }

    return {
      title: websiteData.websiteName || 'Published Website',
      description: `View ${websiteData.websiteName} - created with our website builder`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Website Not Found',
    };
  }
}

export default async function PublishedWebsitePage({ params }: Props) {
  try {
    const resolvedParams = await params;
    const publicId = resolvedParams.id;

    console.log('🔍 Loading published website with publicId:', publicId);

    // Extract userId and websiteId from the publicId
    const [userId, websiteId] = publicId.split('---', 2);

    console.log('🔍 Extracted userId:', userId, 'websiteId:', websiteId);

    if (!userId || !websiteId) {
      console.log('❌ Invalid publicId format');
      notFound();
    }

    // Get the website document
    const websiteDoc = await adminDb.collection('user_websites').doc(websiteId).get();

    if (!websiteDoc.exists) {
      console.log('❌ Website document not found:', websiteId);
      notFound();
    }

    const websiteData = websiteDoc.data() || {};
    console.log('📄 Website data:', {
      id: websiteDoc.id,
      userId: websiteData.userId,
      status: websiteData.status,
      websiteName: websiteData.websiteName
    });

    // Check if the website is published and the userId matches
    if (websiteData.status !== 'published') {
      console.log('❌ Website is not published. Status:', websiteData.status);
      notFound();
    }

    if (websiteData.userId !== userId) {
      console.log('❌ UserId mismatch. Expected:', userId, 'Actual:', websiteData.userId);
      notFound();
    }

    console.log('✅ Website is valid and published');

    // Build the full HTML document
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${websiteData.websiteName || 'Published Website'}</title>
  <meta name="description" content="Created with our website builder">
  <style>${websiteData.savedCss || ''}</style>
</head>
<body>
  ${websiteData.savedHtml || ''}
  <script>${websiteData.savedJs || ''}</script>
</body>
</html>
    `;

    // Return the HTML directly
    return (
      <div dangerouslySetInnerHTML={{ __html: fullHtml }} />
    );

  } catch (error) {
    console.error('Error loading published website:', error);
    notFound();
  }
}
