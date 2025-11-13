'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Eye, Download } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import grapesjs from 'grapesjs';

// Declare window.grapesjs for TypeScript
declare global {
  interface Window {
    grapesjs: any;
  }
}


function TemplateEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Get template from URL params (if editing existing template)
  const templateId = searchParams.get('template');

  // Initialize GrapesJS (copied from working template editor)
  useEffect(() => {
    console.log('🎨 Initialize GrapesJS useEffect called. editorRef:', !!editorRef.current, 'editor exists:', !!editor);
    if (!editorRef.current || editor) return;

    console.log('🎨 Initializing GrapesJS editor...');

    const newEditor = grapesjs.init({
      container: editorRef.current,
      height: '100vh',
      width: 'auto',
      
      // CRITICAL: Prevent GrapesJS from stripping custom CSS
      protectedCss: '', // Don't add any protected CSS that might override template
      
      // Storage: We'll handle this manually with Firebase
      storageManager: false,
      
      // Plugins
      plugins: [],
      pluginsOpts: {},
      
      // Canvas settings
      canvas: {
        styles: [],
        scripts: [],
      },
      
      // Panel configuration
      panels: {
        defaults: [
          {
            id: 'basic-actions',
            el: '.panel__basic-actions',
            buttons: [
              {
                id: 'visibility',
                active: true,
                className: 'btn-toggle-borders',
                label: '<i class="fa fa-clone"></i>',
                command: 'sw-visibility',
              },
            ],
          },
          {
            id: 'panel-devices',
            el: '.panel__devices',
            buttons: [
              {
                id: 'device-desktop',
                label: '<i class="fa fa-television"></i>',
                command: 'set-device-desktop',
                active: true,
                togglable: false,
              },
              {
                id: 'device-tablet',
                label: '<i class="fa fa-tablet"></i>',
                command: 'set-device-tablet',
                togglable: false,
              },
              {
                id: 'device-mobile',
                label: '<i class="fa fa-mobile"></i>',
                command: 'set-device-mobile',
                togglable: false,
              },
            ],
          },
        ],
      },
      
      // Device Manager
      deviceManager: {
        devices: [
          {
            name: 'Desktop',
            width: '',
          },
          {
            name: 'Tablet',
            width: '768px',
            widthMedia: '992px',
          },
          {
            name: 'Mobile',
            width: '320px',
            widthMedia: '768px',
          },
        ],
      },
      
      // Block Manager
      blockManager: {
        appendTo: '.blocks-container',
      },
      
      // Layer Manager
      layerManager: {
        appendTo: '.layers-container',
      },
      
      // Trait Manager
      traitManager: {
        appendTo: '.traits-container',
      },
      
      // Selector Manager
      selectorManager: {
        appendTo: '.styles-container',
      },
    });

    setEditor(newEditor);
    setLoading(false);
    console.log('✅ GrapesJS editor initialized successfully!');
  }, []);

  // Load template when editor is ready
  useEffect(() => {
    if (!editor || !templateId) return;

    const loadTemplate = async () => {
      try {
        if (templateId) {
          console.log('Loading template:', templateId);
          const templateDoc = await getDoc(doc(db, 'templates', templateId));
          if (templateDoc.exists()) {
            const template = templateDoc.data();
            if (template.grapesJsData) {
              const projectData = typeof template.grapesJsData === 'string'
                ? JSON.parse(template.grapesJsData)
                : template.grapesJsData;
              
              editor.loadProjectData(projectData);
              console.log('✅ Template loaded successfully!');
            }
          }
        }
      } catch (error) {
        console.error('Error loading template:', error);
        // Fallback to basic template
        editor.setComponents(`
          <div style="padding: 50px; text-align: center; font-family: Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1 style="color: white; margin-bottom: 20px; font-size: 3rem; font-weight: 300;">Welcome to Your Website</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 1.2rem; margin-bottom: 30px; max-width: 600px;">Start building your amazing website by dragging components from the left panel. This is your blank canvas!</p>
            <div style="margin-top: 30px;">
              <button style="background: rgba(255,255,255,0.2); color: white; padding: 15px 30px; border: 2px solid white; border-radius: 50px; font-size: 16px; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px);">
                Get Started
              </button>
            </div>
          </div>
        `);
      }
    };

    loadTemplate();
  }, [editor, templateId]);

  const handleSave = async () => {
    if (!editor) return;

    setSaving(true);
    try {
      const projectData = editor.getProjectData();
      const html = editor.getHtml();
      const css = editor.getCss();

      // Here you would typically save to your backend
      console.log('Saving project data:', projectData);
      console.log('HTML:', html);
      console.log('CSS:', css);

      // For now, just show success message
      alert('Website saved successfully! (This is a demo - actual saving will be implemented)');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving website. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (!editor) return;
    
    const html = editor.getHtml();
    const css = editor.getCss();
    
    // Open preview in new window
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>${css}</style>
        </head>
        <body>${html}</body>
        </html>
      `);
      previewWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-semibold text-gray-900">
              {templateId === 'starter' ? 'Starter Website' : templateId ? `Editing: ${templateId}` : 'Create New Website'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Website name..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePreview}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* GrapesJS Editor */}
      <div className="flex h-screen">
        {/* Left Sidebar - Blocks */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Components</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="blocks-container p-4"></div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <div className="flex items-center space-x-4">
              <div className="panel__basic-actions"></div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="panel__devices"></div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative">
            <div ref={editorRef} className="h-full w-full" id="grapesjs-editor"></div>
          </div>
        </div>

        {/* Right Sidebar - Layers, Styles, Traits */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="flex border-b border-gray-200">
            <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border-b-2 border-blue-500">
              Layers
            </button>
            <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Styles
            </button>
            <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Traits
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="layers-container p-4"></div>
            <div className="styles-container p-4 hidden"></div>
            <div className="traits-container p-4 hidden"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplateEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading editor...</p>
        </div>
      </div>
    }>
      <TemplateEditorContent />
    </Suspense>
  );
}
