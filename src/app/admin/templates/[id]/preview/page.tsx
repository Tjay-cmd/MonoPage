'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';

export default function TemplatePreviewPage() {
  const params = useParams();
  const templateId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');

  useEffect(() => {
    if (!templateId) return;

    const loadTemplate = async () => {
      try {
        // Fetch template from Firestore
        const templateDoc = await getDoc(doc(db, 'templates', templateId));
        
        if (!templateDoc.exists()) {
          setError('Template not found');
          setLoading(false);
          return;
        }

        const template = templateDoc.data();

        if (!template.grapesJsData) {
          setError('This template does not have GrapesJS data to preview');
          setLoading(false);
          return;
        }

        // Parse GrapesJS data
        const projectData = typeof template.grapesJsData === 'string'
          ? JSON.parse(template.grapesJsData)
          : template.grapesJsData;

        // Create a hidden temporary container for GrapesJS
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '1920px';
        tempContainer.style.height = '1080px';
        tempContainer.style.backgroundColor = '#fff';
        document.body.appendChild(tempContainer);

        try {
          // Initialize GrapesJS quickly to extract HTML/CSS
          const editor = grapesjs.init({
            container: tempContainer,
            plugins: [gjsPresetWebpage],
            storageManager: false,
            canvas: {
              styles: [],
            },
            fromElement: false,
            height: '1080px',
            width: '1920px',
            panels: { defaults: [] },
          });

          // Load the template data
          editor.loadProjectData(projectData);

          // Wait for GrapesJS to process (shorter wait, just enough for data loading)
          await new Promise(resolve => setTimeout(resolve, 300));

          // Use GrapesJS's built-in methods to get properly formatted HTML and CSS
          const html = editor.getHtml();
          const css = editor.getCss();

          // Create full HTML document with extracted CSS
          const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name || 'Template Preview'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    ${css || ''}
  </style>
</head>
<body>
  ${html || ''}
</body>
</html>`;

          // Create blob URL for rendering
          const blob = new Blob([fullHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          setRenderedContent(url);
          
          // Cleanup GrapesJS editor immediately
          setTimeout(() => {
            editor.destroy();
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer);
            }
          }, 100);
          
          setLoading(false);

        } catch (gjsError: any) {
          console.error('GrapesJS error:', gjsError);
          if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
          }
          throw new Error('Failed to render template: ' + (gjsError.message || 'Unknown error'));
        }

      } catch (err: any) {
        console.error('Error loading template preview:', err);
        setError(err.message || 'Failed to load template preview');
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (renderedContent && renderedContent.startsWith('blob:')) {
        URL.revokeObjectURL(renderedContent);
      }
    };
  }, [renderedContent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-white">
      <iframe
        src={renderedContent}
        className="w-full h-full border-0"
        title="Template Preview"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
