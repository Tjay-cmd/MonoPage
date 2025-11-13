'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { canManageTemplates } from '@/lib/subscription';
import html2canvas from 'html2canvas';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import { 
  ArrowLeft,
  Eye,
  Palette,
  Monitor,
  Smartphone,
  Filter,
  Search,
  Plus, 
  Upload, 
  Edit, 
  Trash2, 
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  previewImage: string;
  previewImageUrl?: string;
  grapesJsData?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  editableElements: EditableElement[];
}

interface EditableElement {
  id: string;
  type: 'text' | 'color' | 'image' | 'font';
  label: string;
  selector: string;
  defaultValue?: string;
}

export default function AdminTemplatesPage() {
  const router = useRouter();
  const { subscription, loading: subscriptionLoading, canAccessFeature } = useSubscription();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Upload form state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [grapesJsJson, setGrapesJsJson] = useState('');
  const [uploadType, setUploadType] = useState<'zip' | 'json'>('json');
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const previewImageInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Check admin permissions
  useEffect(() => {
    if (!subscriptionLoading && subscription) {
      if (!canAccessFeature('templateManagement')) {
        console.log('❌ Access denied: User does not have template management permissions');
        alert('Access denied: You do not have permission to manage templates.');
        router.push('/dashboard');
        return;
      }
    }
  }, [subscription, subscriptionLoading, canAccessFeature, router]);

  const categories = [
    { id: 'all', name: 'All Templates', icon: Monitor },
    { id: 'barber', name: 'Barber', icon: Palette },
    { id: 'photographer', name: 'Photographer', icon: Eye },
    { id: 'tutor', name: 'Tutor', icon: Monitor },
    { id: 'beauty', name: 'Beauty Salon', icon: Palette },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchTemplates();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const isPermissionDenied = (error: unknown): boolean => {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in (error as Record<string, unknown>) &&
      (error as { code?: string }).code === 'permission-denied'
    );
  };

  const fetchTemplates = async () => {
    try {
      setPermissionWarning(null);
      setFetchError(null);
      const templatesQuery = query(
        collection(db, 'templates'),
        where('status', '==', 'active')
      );
      const templatesSnapshot = await getDocs(templatesQuery);
      const templatesData = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Template));
      setTemplates(templatesData);
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.warn('⚠️ Firestore denied access to templates collection.');
        setPermissionWarning('This account does not have permission to manage templates.');
        setTemplates([]);
        setFilteredTemplates([]);
        return;
      }

      console.error('Error fetching templates:', error);
      setFetchError('Something went wrong while loading templates. Please try again later.');
      }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input clicked!');
    console.log('Event:', event);
    console.log('Files:', event.target.files);
    
    try {
      const file = event.target.files?.[0];
      console.log('File found:', file);
      
      if (file) {
        console.log('File details:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
        
        if (file.name.endsWith('.zip')) {
          setTemplateFile(file);
          console.log('ZIP file selected successfully');
        } else {
          alert('Please select a ZIP file');
        }
      } else {
        console.log('No file selected');
      }
    } catch (error) {
      console.error('Error in file upload handler:', error);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    console.log('Files dropped:', event.dataTransfer.files);
    
    const files = Array.from(event.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));
    
    if (zipFile) {
      console.log('ZIP file dropped:', zipFile.name);
      setTemplateFile(zipFile);
    } else {
      alert('Please drop a ZIP file');
    }
  };

  const handleJsonFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setGrapesJsJson(content);
      };
      reader.readAsText(file);
    } else {
      alert('Please select a JSON file');
    }
  };

  const handlePreviewImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, etc.)');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Preview image must be less than 5MB');
        return;
      }

      setPreviewImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePreviewImage = () => {
    setPreviewImageFile(null);
    setPreviewImagePreview(null);
    if (previewImageInputRef.current) {
      previewImageInputRef.current.value = '';
    }
  };

  const createStarterTemplate = async () => {
    const starterTemplateData = {
      name: 'Starter Website',
      category: 'general',
      description: 'A simple, professional starter website template perfect for small businesses. Includes hero section, services, and contact information.',
      status: 'active',
      createdAt: new Date(),
      editableElements: [
        {
          id: 'hero-title',
          type: 'text',
          label: 'Hero Title',
          selector: '.hero-title'
        },
        {
          id: 'hero-subtitle',
          type: 'text',
          label: 'Hero Subtitle',
          selector: '.hero-subtitle'
        },
        {
          id: 'business-name',
          type: 'text',
          label: 'Business Name',
          selector: '.business-name'
        },
        {
          id: 'contact-email',
          type: 'text',
          label: 'Contact Email',
          selector: '.contact-email'
        },
        {
          id: 'contact-phone',
          type: 'text',
          label: 'Contact Phone',
          selector: '.contact-phone'
        }
      ],
      grapesJsData: JSON.stringify({
        pages: [
          {
            frames: [
              {
                component: {
                  type: 'wrapper',
                  stylable: ['background', 'background-color', 'background-image', 'background-repeat', 'background-attachment', 'background-size', 'background-position'],
                  components: [
                    // Hero Section
                    {
                      type: 'section',
                      classes: ['hero-section'],
                      stylable: ['background', 'background-color', 'padding', 'margin'],
                      components: [
                        {
                          type: 'div',
                          classes: ['container', 'hero-container'],
                          stylable: ['max-width', 'margin', 'padding'],
                          components: [
                            {
                              type: 'h1',
                              classes: ['hero-title'],
                              content: 'Welcome to Your Business',
                              stylable: ['font-size', 'color', 'text-align', 'margin', 'padding']
                            },
                            {
                              type: 'p',
                              classes: ['hero-subtitle'],
                              content: 'We provide quality services to help your business grow. Professional, reliable, and affordable.',
                              stylable: ['font-size', 'color', 'text-align', 'margin', 'padding', 'line-height']
                            },
                            {
                              type: 'button',
                              classes: ['btn-primary', 'hero-cta'],
                              content: 'Get Started',
                              attributes: { href: '#contact' },
                              stylable: ['background-color', 'color', 'padding', 'border-radius', 'border']
                            }
                          ]
                        }
                      ]
                    },
                    // Services Section
                    {
                      type: 'section',
                      classes: ['services-section'],
                      stylable: ['background', 'background-color', 'padding', 'margin'],
                      components: [
                        {
                          type: 'div',
                          classes: ['container'],
                          components: [
                            {
                              type: 'h2',
                              classes: ['section-title'],
                              content: 'Our Services',
                              stylable: ['font-size', 'color', 'text-align', 'margin']
                            },
                            {
                              type: 'div',
                              classes: ['services-grid'],
                              stylable: ['display', 'grid-template-columns', 'gap', 'margin'],
                              components: [
                                {
                                  type: 'div',
                                  classes: ['service-card'],
                                  stylable: ['background-color', 'padding', 'border-radius', 'box-shadow'],
                                  components: [
                                    {
                                      type: 'h3',
                                      content: 'Service 1',
                                      stylable: ['font-size', 'color', 'margin']
                                    },
                                    {
                                      type: 'p',
                                      content: 'Description of your first service. Explain what makes it valuable to your customers.',
                                      stylable: ['font-size', 'color', 'line-height']
                                    }
                                  ]
                                },
                                {
                                  type: 'div',
                                  classes: ['service-card'],
                                  stylable: ['background-color', 'padding', 'border-radius', 'box-shadow'],
                                  components: [
                                    {
                                      type: 'h3',
                                      content: 'Service 2',
                                      stylable: ['font-size', 'color', 'margin']
                                    },
                                    {
                                      type: 'p',
                                      content: 'Description of your second service. Highlight the benefits and results.',
                                      stylable: ['font-size', 'color', 'line-height']
                                    }
                                  ]
                                },
                                {
                                  type: 'div',
                                  classes: ['service-card'],
                                  stylable: ['background-color', 'padding', 'border-radius', 'box-shadow'],
                                  components: [
                                    {
                                      type: 'h3',
                                      content: 'Service 3',
                                      stylable: ['font-size', 'color', 'margin']
                                    },
                                    {
                                      type: 'p',
                                      content: 'Description of your third service. What problems does it solve?',
                                      stylable: ['font-size', 'color', 'line-height']
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    // Contact Section
                    {
                      type: 'section',
                      classes: ['contact-section'],
                      attributes: { id: 'contact' },
                      stylable: ['background', 'background-color', 'padding', 'margin'],
                      components: [
                        {
                          type: 'div',
                          classes: ['container'],
                          components: [
                            {
                              type: 'h2',
                              classes: ['section-title'],
                              content: 'Contact Us',
                              stylable: ['font-size', 'color', 'text-align', 'margin']
                            },
                            {
                              type: 'div',
                              classes: ['contact-info'],
                              stylable: ['display', 'flex-direction', 'gap', 'justify-content'],
                              components: [
                                {
                                  type: 'div',
                                  classes: ['contact-item'],
                                  components: [
                                    {
                                      type: 'h4',
                                      content: 'Business Name',
                                      classes: ['business-name'],
                                      stylable: ['font-size', 'color', 'margin']
                                    },
                                    {
                                      type: 'p',
                                      content: 'Email: ',
                                      stylable: ['margin'],
                                      components: [
                                        {
                                          type: 'span',
                                          classes: ['contact-email'],
                                          content: 'info@yourbusiness.com',
                                          stylable: ['color']
                                        }
                                      ]
                                    },
                                    {
                                      type: 'p',
                                      content: 'Phone: ',
                                      stylable: ['margin'],
                                      components: [
                                        {
                                          type: 'span',
                                          classes: ['contact-phone'],
                                          content: '+1 (555) 123-4567',
                                          stylable: ['color']
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        ],
        styles: [
          {
            selectors: ['body'],
            style: {
              'font-family': 'Arial, sans-serif',
              'margin': '0',
              'padding': '0',
              'line-height': '1.6'
            }
          },
          {
            selectors: ['.container'],
            style: {
              'max-width': '1200px',
              'margin': '0 auto',
              'padding': '0 20px'
            }
          },
          {
            selectors: ['.hero-section'],
            style: {
              'background-color': '#f8f9fa',
              'padding': '80px 0',
              'text-align': 'center'
            }
          },
          {
            selectors: ['.hero-title'],
            style: {
              'font-size': '3rem',
              'color': '#333',
              'margin-bottom': '20px',
              'font-weight': 'bold'
            }
          },
          {
            selectors: ['.hero-subtitle'],
            style: {
              'font-size': '1.2rem',
              'color': '#666',
              'margin-bottom': '30px',
              'max-width': '600px',
              'margin-left': 'auto',
              'margin-right': 'auto'
            }
          },
          {
            selectors: ['.btn-primary'],
            style: {
              'background-color': '#007bff',
              'color': 'white',
              'padding': '12px 24px',
              'border': 'none',
              'border-radius': '5px',
              'text-decoration': 'none',
              'display': 'inline-block',
              'cursor': 'pointer'
            }
          },
          {
            selectors: ['.services-section'],
            style: {
              'padding': '60px 0',
              'background-color': 'white'
            }
          },
          {
            selectors: ['.section-title'],
            style: {
              'font-size': '2rem',
              'color': '#333',
              'text-align': 'center',
              'margin-bottom': '40px',
              'font-weight': 'bold'
            }
          },
          {
            selectors: ['.services-grid'],
            style: {
              'display': 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(300px, 1fr))',
              'gap': '30px',
              'margin-top': '40px'
            }
          },
          {
            selectors: ['.service-card'],
            style: {
              'background-color': 'white',
              'padding': '30px',
              'border-radius': '8px',
              'box-shadow': '0 2px 10px rgba(0,0,0,0.1)',
              'text-align': 'center'
            }
          },
          {
            selectors: ['.service-card h3'],
            style: {
              'font-size': '1.4rem',
              'color': '#333',
              'margin-bottom': '15px'
            }
          },
          {
            selectors: ['.service-card p'],
            style: {
              'color': '#666',
              'line-height': '1.6'
            }
          },
          {
            selectors: ['.contact-section'],
            style: {
              'background-color': '#f8f9fa',
              'padding': '60px 0',
              'text-align': 'center'
            }
          },
          {
            selectors: ['.contact-info'],
            style: {
              'display': 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'gap': '10px'
            }
          },
          {
            selectors: ['.business-name'],
            style: {
              'font-size': '1.5rem',
              'color': '#333',
              'margin-bottom': '10px',
              'font-weight': 'bold'
            }
          },
          {
            selectors: ['.contact-email', '.contact-phone'],
            style: {
              'color': '#007bff',
              'font-weight': '500'
            }
          }
        ]
      })
    };

    try {
      await addDoc(collection(db, 'templates'), starterTemplateData);
      alert('Starter Website template created successfully!');
      await fetchTemplates();
    } catch (error) {
      console.error('Error creating starter template:', error);
      alert('Failed to create starter template. Please try again.');
    }
  };

  // Generate preview image from GrapesJS JSON
  const generateTemplatePreview = async (templateId: string, grapesJsJsonString: string): Promise<string | null> => {
    try {
      console.log('🖼️ Starting preview generation for template:', templateId);
      
      // Parse the JSON
      let projectData;
      try {
        projectData = typeof grapesJsJsonString === 'string' 
          ? JSON.parse(grapesJsJsonString) 
          : grapesJsJsonString;
      } catch (parseError) {
        console.error('❌ Failed to parse GrapesJS JSON:', parseError);
        return null;
      }

      // Create a hidden container for the editor
      // Use very high resolution for crisp image quality
      const captureWidth = 3200; // Very high resolution for sharp text
      const captureHeight = 2400; // Maintain 4:3 aspect ratio
      const scale = 3; // Very high-DPI scale factor for maximum sharpness
      
      const previewContainer = document.createElement('div');
      previewContainer.id = `preview-${templateId}-${Date.now()}`;
      previewContainer.style.position = 'fixed';
      previewContainer.style.left = '-9999px';
      previewContainer.style.top = '0';
      previewContainer.style.width = `${captureWidth}px`;
      previewContainer.style.height = `${captureHeight}px`;
      previewContainer.style.backgroundColor = '#fff';
      previewContainer.style.zIndex = '-1';
      document.body.appendChild(previewContainer);

      try {
        // Wait for container to be in DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize GrapesJS editor in hidden container
        // Hide all UI panels to get clean preview
        const editor = grapesjs.init({
          container: previewContainer,
          plugins: [gjsPresetWebpage],
          storageManager: false,
          canvas: {
            styles: [],
          },
          fromElement: false,
          height: `${captureHeight}px`,
          width: `${captureWidth}px`,
          // Hide panels for clean screenshot
          panels: { defaults: [] },
        });

        // Hide all GrapesJS UI elements immediately
        const editorEl = previewContainer.querySelector('.gjs-editor');
        if (editorEl) {
          // Hide side panels
          const panels = editorEl.querySelectorAll('.gjs-pn-panels, .gjs-pn-commands, .gjs-pn-panel, .gjs-toolbar, .gjs-cv-canvas');
          panels.forEach((panel: any) => {
            if (panel && panel.style) {
              const className = panel.className || '';
              // Hide all UI panels except the canvas
              if (!className.includes('gjs-cv-canvas') && !className.includes('gjs-frame')) {
                panel.style.display = 'none';
              }
            }
          });
        }

        // Load the project data
        editor.loadProjectData(projectData);

        // Wait for editor to render
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Hide UI elements after render
        const allPanels = previewContainer.querySelectorAll('.gjs-pn-panels, .gjs-pn-commands, .gjs-pn-btn, .gjs-toolbar');
        allPanels.forEach((panel: any) => {
          if (panel && panel.style) {
            panel.style.display = 'none';
          }
        });

        // Hide all GrapesJS UI before capturing
        const editorRoot = previewContainer.querySelector('.gjs-editor') as HTMLElement;
        if (editorRoot) {
          // Hide all panels and toolbars - select each type individually
          const selectors = [
            '.gjs-pn-panels',
            '.gjs-pn-commands', 
            '.gjs-pn-btn',
            '.gjs-toolbar',
            '.gjs-pn-devices-c',
            '.gjs-sm-sector',
            '.gjs-blocks-c',
            '.gjs-layers-c',
            '.gjs-style-c',
            '.gjs-traits-c'
          ];
          
          selectors.forEach(selector => {
            const elements = editorRoot.querySelectorAll(selector);
            elements.forEach((el: any) => {
              if (el && el.style) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
                el.style.position = 'absolute';
                el.style.left = '-9999px';
              }
            });
          });

          // Make canvas frame fill the entire container
          const canvasWrapper = editorRoot.querySelector('.gjs-cv-canvas') as HTMLElement;
          if (canvasWrapper && canvasWrapper.style) {
            canvasWrapper.style.width = '100%';
            canvasWrapper.style.height = '100%';
            canvasWrapper.style.position = 'absolute';
            canvasWrapper.style.top = '0';
            canvasWrapper.style.left = '0';
          }
        }

        // Get the canvas iframe
        const canvasEl = editor.Canvas.getFrameEl();
        if (!canvasEl || !canvasEl.contentDocument) {
          console.error('❌ Canvas frame not found');
          editor.destroy();
          document.body.removeChild(previewContainer);
          return null;
        }

        const canvasDoc = canvasEl.contentDocument;
        const canvasBody = canvasDoc.body;

        // Ensure canvas iframe fills the entire area and is properly positioned
        if (canvasEl && canvasEl.style) {
          canvasEl.style.display = 'block';
          canvasEl.style.position = 'absolute';
          canvasEl.style.top = '0';
          canvasEl.style.left = '0';
          canvasEl.style.width = '100%';
          canvasEl.style.height = '100%';
          canvasEl.style.border = 'none';
          canvasEl.style.margin = '0';
          canvasEl.style.padding = '0';
          canvasEl.style.zIndex = '1';
        }

        // Ensure body has proper styling
        if (canvasBody && canvasBody.style) {
          canvasBody.style.margin = '0';
          canvasBody.style.padding = '0';
        }

        // Wait longer for images and fonts to fully load and render
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Capture screenshot at very high resolution - only capture the canvas body content
        console.log('📸 Capturing ultra-high-resolution screenshot...');
        const bodyHeight = Math.min(Math.max(canvasBody.scrollHeight || captureHeight, canvasBody.offsetHeight || captureHeight), captureHeight);
        const canvas = await html2canvas(canvasBody, {
          width: captureWidth,
          height: bodyHeight,
          scrollX: 0,
          scrollY: 0,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: captureWidth,
          windowHeight: bodyHeight,
          backgroundColor: canvasBody.style.backgroundColor || canvasDoc.body.style.backgroundColor || '#ffffff',
          removeContainer: false,
          scale: scale, // Very high-DPI scale factor (3x) for maximum sharpness
          x: 0,
          y: 0,
          imageTimeout: 20000, // Allow more time for images to load
          foreignObjectRendering: true, // Better rendering for complex content
          onclone: (clonedDoc) => {
            // Ensure fonts are loaded and properly rendered in the cloned document
            const clonedBody = clonedDoc.body;
            if (clonedBody) {
              // Use setProperty for vendor-prefixed properties to avoid TypeScript errors
              clonedBody.style.setProperty('-webkit-font-smoothing', 'antialiased');
              clonedBody.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
              clonedBody.style.textRendering = 'optimizeLegibility';
              clonedBody.style.imageRendering = 'crisp-edges';
              
              // Force all text elements to have better rendering
              const allElements = clonedBody.querySelectorAll('*');
              allElements.forEach((el: any) => {
                if (el && el.style) {
                  el.style.setProperty('-webkit-font-smoothing', 'antialiased');
                  el.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
                  el.style.textRendering = 'optimizeLegibility';
                }
              });
            }
          }
        });

        // Convert to blob with maximum quality (PNG for best quality, especially for text)
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0); // Maximum quality (1.0)
        });

        if (!blob) {
          console.error('❌ Failed to convert canvas to blob');
          editor.destroy();
          document.body.removeChild(previewContainer);
          return null;
        }

        // Upload to Firebase Storage
        console.log('📤 Uploading preview image to Firebase Storage...');
        const storageRef_instance = ref(storage, `template-previews/${templateId}/preview.png`);
        await uploadBytes(storageRef_instance, blob, {
          contentType: 'image/png',
        });

        const downloadURL = await getDownloadURL(storageRef_instance);
        console.log('✅ Preview image uploaded:', downloadURL);

        // Cleanup
        editor.destroy();
        document.body.removeChild(previewContainer);

        return downloadURL;
      } catch (editorError) {
        console.error('❌ Error in editor/preview generation:', editorError);
        // Cleanup on error
        if (document.body.contains(previewContainer)) {
          document.body.removeChild(previewContainer);
        }
        return null;
      }
    } catch (error) {
      console.error('❌ Error generating template preview:', error);
      return null;
    }
  };

  const uploadTemplate = async () => {
    if (!templateName || !templateCategory) {
      alert('Please fill in all required fields');
      return;
    }

    if (uploadType === 'json' && !grapesJsJson) {
      alert('Please paste or upload GrapesJS JSON');
      return;
    }

    if (uploadType === 'zip' && !templateFile) {
      alert('Please select a ZIP file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create template ID
      const templateId = `${templateCategory.toLowerCase()}-${Date.now()}`;
      
      let templateData: any = {
        name: templateName,
        category: templateCategory,
        description: templateDescription,
        previewImage: '',
        status: 'active',
        createdAt: new Date(),
        editableElements: []
      };

      if (uploadType === 'json') {
        // Parse and save GrapesJS JSON
        try {
          const parsedJson = JSON.parse(grapesJsJson);
          // Store as STRING to avoid Firebase nested object limits
          templateData.grapesJsData = JSON.stringify(parsedJson);
          console.log('✅ GrapesJS JSON parsed and stringified for storage');
        } catch (error) {
          alert('Invalid JSON format. Please check your JSON and try again.');
          setUploading(false);
          return;
        }
      } else {
        // Upload ZIP file to Firebase Storage
        const storageRef = ref(storage, `templates/${templateId}/template.zip`);
        
        const uploadInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        await uploadBytes(storageRef, templateFile!);
        clearInterval(uploadInterval);
        
        const downloadURL = await getDownloadURL(storageRef);
        templateData.zipUrl = downloadURL;
      }

      // Upload preview image if provided
      let previewImageUrl = '';
      if (previewImageFile) {
        try {
          console.log('📤 Uploading preview image...');
          setUploadProgress(85);
          
          // Determine file extension
          const fileExt = previewImageFile.name.split('.').pop() || 'png';
          const storageRef = ref(storage, `template-previews/${templateId}/preview.${fileExt}`);
          
          await uploadBytes(storageRef, previewImageFile, {
            contentType: previewImageFile.type,
          });
          
          previewImageUrl = await getDownloadURL(storageRef);
          console.log('✅ Preview image uploaded:', previewImageUrl);
          templateData.previewImageUrl = previewImageUrl;
          templateData.previewImage = previewImageUrl; // Also set legacy field
        } catch (previewError) {
          console.error('❌ Error uploading preview image:', previewError);
          alert('Warning: Preview image upload failed, but template will still be saved.');
        }
      }

      setUploadProgress(100);

      // Save to Firestore
      const templateDocRef = await addDoc(collection(db, 'templates'), templateData);
      const savedTemplateId = templateDocRef.id;
      
      console.log('✅ Template saved with ID:', savedTemplateId);
      
      // Reset form
      setTemplateFile(null);
      setPreviewImageFile(null);
      setPreviewImagePreview(null);
      setTemplateName('');
      setTemplateCategory('');
      setTemplateDescription('');
      setGrapesJsJson('');
      setShowUploadForm(false);
      if (previewImageInputRef.current) {
        previewImageInputRef.current.value = '';
      }
      
      // Refresh templates
      await fetchTemplates();
      
      let successMessage = 'Template uploaded successfully!';
      if (previewImageFile) {
        successMessage += ' Preview image uploaded.';
      }
      alert(successMessage);
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Failed to upload template. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        // Delete from Firestore first
        await deleteDoc(doc(db, 'templates', templateId));
        
        // Try to delete from Storage (handle case where file doesn't exist)
        try {
          const storageRef = ref(storage, `templates/${templateId}/template.zip`);
          await deleteObject(storageRef);
          console.log('✅ Storage file deleted successfully');
        } catch (storageError: any) {
          // If storage file doesn't exist, that's okay - just log it
          if (storageError.code === 'storage/object-not-found') {
            console.log('ℹ️ Storage file not found (already deleted or never existed)');
          } else {
            console.warn('⚠️ Storage deletion failed:', storageError);
            // Don't throw error - Firestore deletion was successful
          }
        }
        
        // Refresh templates
        await fetchTemplates();
        
        alert('Template deleted successfully!');
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'templates', templateId), {
        status: newStatus
      });
      
      await fetchTemplates();
    } catch (error) {
      console.error('Error updating template status:', error);
    }
  };

  const handlePreviewTemplate = (template: Template) => {
    // Open template preview in a new tab
    const previewUrl = `/admin/templates/${template.id}/preview`;
    window.open(previewUrl, '_blank');
  };

  // Regenerate preview for existing template
  const regeneratePreview = async (template: Template) => {
    if (!template.grapesJsData) {
      alert('Cannot regenerate preview: This template does not have GrapesJS JSON data. Only JSON templates can have auto-generated previews.');
      return;
    }

    if (!confirm(`Regenerate preview image for "${template.name}"?`)) {
      return;
    }

    try {
      setUploading(true);
      console.log('🖼️ Regenerating preview for template:', template.id);
      
      const previewUrl = await generateTemplatePreview(template.id, template.grapesJsData);
      
      if (previewUrl) {
        // Update template with preview URL
        await updateDoc(doc(db, 'templates', template.id), {
          previewImageUrl: previewUrl,
          previewImage: previewUrl, // Also update legacy field
        });
        console.log('✅ Preview regenerated successfully:', previewUrl);
        alert('✅ Preview image regenerated successfully!');
        
        // Refresh templates
        await fetchTemplates();
      } else {
        alert('⚠️ Failed to generate preview. Please check the console for details.');
      }
    } catch (error) {
      console.error('❌ Error regenerating preview:', error);
      alert('Failed to regenerate preview. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {permissionWarning && (
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl text-center shadow-sm">
            {permissionWarning}
          </div>
        </div>
      )}

      {fetchError && !permissionWarning && (
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center shadow-sm">
            {fetchError}
          </div>
        </div>
      )}

      {/* Header - Top Navigation etc. */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Template Management</h1>
              <p className="text-gray-600">Manage and organize your website templates</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={createStarterTemplate}
                className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-lg border border-gray-200 transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Starter
              </button>
              <button
                onClick={() => setShowUploadForm(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 py-10">
        {/* Search and Filter */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-3 justify-start items-center">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center px-6 py-3 rounded-xl text-base font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-orange-100 text-orange-700 border-2 border-orange-300 shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2.5" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Upload New Template</h2>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                    placeholder="e.g., Modern Barber"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all bg-white"
                  >
                    <option value="">Select Category</option>
                    <option value="barber">Barber</option>
                    <option value="tutor">Tutor</option>
                    <option value="photographer">Photographer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none"
                    rows={3}
                    placeholder="Brief description of the template..."
                  />
                </div>

                {/* Upload Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Format *
                  </label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setUploadType('json')}
                      className={`px-4 py-4 border-2 rounded-xl transition-all ${
                        uploadType === 'json'
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="font-semibold">🎨 GrapesJS JSON</div>
                      <div className="text-xs mt-1 text-gray-600">Recommended</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadType('zip')}
                      className={`px-4 py-4 border-2 rounded-xl transition-all ${
                        uploadType === 'zip'
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="font-semibold">📦 ZIP File</div>
                      <div className="text-xs mt-1 text-gray-600">Legacy format</div>
                    </button>
                  </div>
                </div>

                {uploadType === 'json' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GrapesJS Project JSON *
                    </label>
                    
                    {/* JSON File Input */}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleJsonFileUpload}
                      ref={jsonFileInputRef}
                      style={{ display: 'none' }}
                    />
                    
                    <button
                      type="button"
                      onClick={() => jsonFileInputRef.current?.click()}
                      className="w-full mb-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all"
                    >
                      <Upload className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                      <span className="text-sm text-gray-600">Click to upload JSON file</span>
                    </button>
                    
                    <textarea
                      value={grapesJsJson}
                      onChange={(e) => setGrapesJsJson(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all font-mono text-xs resize-none"
                      rows={8}
                      placeholder='Or paste your GrapesJS JSON here...
Example: { "pages": [...], "styles": [...] }'
                    />
                    
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Get this from: <code className="bg-gray-100 px-1 py-0.5 rounded">editor.getProjectData()</code>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template ZIP File *
                    </label>
                    
                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept=".zip"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                    />
                    
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full px-4 py-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer ${
                        isDragOver
                          ? 'border-orange-500 bg-orange-50'
                          : templateFile
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                    >
                      <div className="text-center">
                        <Upload className={`h-8 w-8 mx-auto mb-3 ${
                          isDragOver ? 'text-orange-500' : 'text-gray-400'
                        }`} />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {templateFile 
                            ? `✓ ${templateFile.name}` 
                            : isDragOver 
                            ? 'Drop your ZIP file here' 
                            : 'Drag & drop ZIP file or click to browse'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {templateFile 
                            ? `Size: ${(templateFile.size / 1024 / 1024).toFixed(2)} MB`
                            : 'Legacy method for HTML/CSS/JS templates'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preview Image (Recommended)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Upload a screenshot of your template. You can also manually regenerate previews later using the "Regenerate" button.
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePreviewImageUpload}
                    ref={previewImageInputRef}
                    style={{ display: 'none' }}
                  />
                  
                  {previewImagePreview ? (
                    <div className="relative">
                      <div className="border-2 border-green-400 rounded-lg p-2 bg-green-50">
                        <img 
                          src={previewImagePreview} 
                          alt="Preview" 
                          className="w-full h-32 object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={removePreviewImage}
                          className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          title="Remove preview image"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          {previewImageFile?.name} ({(previewImageFile ? (previewImageFile.size / 1024).toFixed(1) : 0)} KB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => previewImageInputRef.current?.click()}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer"
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-6 w-6 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload preview image</span>
                        <span className="text-xs text-gray-500 mt-1">PNG, JPG, or WebP (max 5MB)</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUploadForm(false)}
                  className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 rounded-lg border border-gray-200 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={uploadTemplate}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
              >
                {/* Template Preview */}
                <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden relative">
                  {template.previewImage ? (
                    <img
                      src={template.previewImage}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      style={{
                        imageRendering: 'high-quality',
                      } as React.CSSProperties}
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Monitor className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Preview</p>
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-7 flex flex-col flex-1">
                  <div className="mb-5 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 pr-3">
                      {template.name}
                    </h3>
                      <span className="inline-block bg-orange-100 text-orange-800 text-sm px-4 py-2 rounded-full font-medium flex-shrink-0">
                      {template.category}
                    </span>
                  </div>
                    <p className="text-base text-gray-600 leading-relaxed">
                    {template.description || 'No description available'}
                  </p>
                </div>

                {/* Editable Elements Info */}
                  <div className="mb-5">
                    <div className="flex items-center text-base text-gray-500 mb-3">
                      <Palette className="h-5 w-5 mr-2" />
                      <span className="font-medium">Customizable Elements</span>
                  </div>
                    <div className="flex flex-wrap gap-2">
                    {template.editableElements?.slice(0, 3).map((element, index) => (
                      <span
                        key={index}
                          className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg"
                      >
                        {element.label}
                      </span>
                    ))}
                    {template.editableElements?.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg">
                        +{template.editableElements.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                  <div className="space-y-3 pt-5 border-t border-gray-200">
                  <button 
                    onClick={() => router.push(`/dashboard/templates/${template.id}/editor`)}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-5 rounded-xl transition-colors flex items-center justify-center text-base"
                  >
                    <Palette className="h-5 w-5 mr-2" />
                    🎨 Visual Editor
                  </button>
                  
                  {/* Additional Actions */}
                  <div className="flex flex-wrap gap-2.5">
                    <button 
                      onClick={() => handlePreviewTemplate(template)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center text-sm min-w-[90px] font-medium"
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      Preview
                    </button>
                    {template.grapesJsData && (
                      <button 
                        onClick={() => regeneratePreview(template)}
                        disabled={uploading}
                        className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center text-sm disabled:opacity-50 min-w-[130px] font-medium"
                        title="Regenerate preview image"
                      >
                        {uploading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-700"></div>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1.5" />
                            Regenerate
                          </>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => deleteTemplate(template.id)}
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center text-sm min-w-[90px] font-medium"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No templates are available yet.'}
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 rounded-lg border border-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
