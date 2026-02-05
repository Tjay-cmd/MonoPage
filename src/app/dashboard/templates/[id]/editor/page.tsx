'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import html2canvas from 'html2canvas';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import grapesjsTuiImageEditor from 'grapesjs-tui-image-editor';
import 'tui-image-editor/dist/tui-image-editor.css';
import { useSubscription } from '@/hooks/useSubscription';
import { ArrowLeft, Eye, Link2, Download, Save, Calendar, GraduationCap, X, Check } from 'lucide-react';
import { registerClassOrbitBlock } from '@/lib/grapesjs/registerClassOrbitBlock';
import { BusinessType } from '@/types';

// NOTE: We now use Firebase Authentication user.uid instead of localStorage
// This ensures consistency across all pages (editor, websites page, etc.)

// Payment Link types (client-side only, non-breaking for existing generator)
type LinkType = 'customer_payment' | 'platform_subscription';
interface PaymentLinkRecord {
  id: string;
  url: string;
  ownerUserId: string;
  websiteId?: string | null;
  type: LinkType;
  status?: 'active' | 'disabled';
  returnUrl?: string;
  label?: string;
}

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const hasLoadedWebsiteRef = useRef(false); // Track if we've loaded the website
  const hasInjectedCSSRef = useRef(false); // Track if we've injected CSS
  const [editor, setEditor] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Changed to false - show editor immediately
  const [templateData, setTemplateData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [websiteName, setWebsiteName] = useState<string>('');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isNewWebsite, setIsNewWebsite] = useState(true);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null);
  const [previewImagePreview, setPreviewImagePreview] = useState<string | null>(null);
  // Link picker state
  const [userLinks, setUserLinks] = useState<PaymentLinkRecord[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  const [showAllUserLinks, setShowAllUserLinks] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [showThankYouHelper, setShowThankYouHelper] = useState(false);

  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const canEditTemplates = hasTierAccess('pro');
  const hasBusinessAccess = hasTierAccess('business');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Tutor classes state
  const [isTutor, setIsTutor] = useState(false);
  const [tutorClasses, setTutorClasses] = useState<any[]>([]);
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  useEffect(() => {
    // Don't redirect if we're opening preview after payment (openPreview=true)
    // This allows the redirect to work even if subscription check hasn't completed
    const urlParams = new URLSearchParams(window.location.search);
    const isOpeningPreview = urlParams.get('openPreview') === 'true';
    
    if (!subscriptionLoading && !canEditTemplates && !isOpeningPreview) {
      router.replace('/dashboard/templates');
    }
  }, [subscriptionLoading, canEditTemplates, router]);

  // Performance toggles
  const ENABLE_IMAGE_UPLOAD_ON_SAVE = false; // set true only for export workflows

  // Utility: simple id
  const generateId = () => `img_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  // Compress a base64 image using canvas (JPEG)
  const compressBase64Image = (dataUrl: string, maxWidth = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate input
      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        console.warn('⚠️ Invalid data URL for compression:', dataUrl.substring(0, 50));
        reject(new Error('Invalid data URL'));
        return;
      }
      
      const img = new Image();
      
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          
          const canvasEl = document.createElement('canvas');
          canvasEl.width = w;
          canvasEl.height = h;
          
          const ctx = canvasEl.getContext('2d');
          if (!ctx) {
            console.warn('⚠️ Could not get canvas context');
            resolve(dataUrl);
            return;
          }
          
          ctx.drawImage(img, 0, 0, w, h);
          
          // Prefer jpeg to reduce size
          const out = canvasEl.toDataURL('image/jpeg', quality);
          
          if (!out || !out.startsWith('data:image')) {
            console.warn('⚠️ Canvas toDataURL produced invalid result');
            resolve(dataUrl);
            return;
          }
          
          console.log(`🗜️ Compressed image: ${dataUrl.length} → ${out.length} bytes (${Math.round((1 - out.length/dataUrl.length) * 100)}% reduction)`);
          resolve(out);
        } catch (error) {
          console.error('❌ Error compressing image:', error);
          resolve(dataUrl); // Fallback to original
        }
      };
      
      img.onerror = (error) => {
        console.error('❌ Failed to load image for compression:', error);
        reject(new Error('Failed to load image'));
      };
      
      img.src = dataUrl;
    });
  };

  // Upload a base64 image to Firebase Storage and return its download URL
  const uploadBase64ToStorage = async (base64: string, path: string): Promise<string> => {
    const objRef = storageRef(storage, path);
    await uploadString(objRef, base64, 'data_url');
    return await getDownloadURL(objRef);
  };

  // Find base64 images in HTML, compress+upload, replace src with URL
  const processImagesInHtml = async (htmlInput: string, ownerUserId: string, targetWebsiteId: string): Promise<{ html: string; uploaded: number; } > => {
    const container = document.createElement('div');
    container.innerHTML = htmlInput;
    const imgEls = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    let uploaded = 0;
    
    for (let i = 0; i < imgEls.length; i++) {
      const img = imgEls[i];
      let src = img.getAttribute('src') || '';
      
      // Check if it's an octet-stream that's actually an image (common mistype)
      if (src.match(/^data:application\/octet-stream;base64,/)) {
        console.log(`🔧 Fixing octet-stream MIME type for image ${i + 1}`);
        // Try to detect actual image type from base64 header
        if (src.includes('iVBORw0KGgo')) {
          src = src.replace('data:application/octet-stream', 'data:image/png');
        } else if (src.includes('/9j/')) {
          src = src.replace('data:application/octet-stream', 'data:image/jpeg');
        } else if (src.includes('R0lGOD')) {
          src = src.replace('data:application/octet-stream', 'data:image/gif');
        } else {
          // Default to jpeg
          src = src.replace('data:application/octet-stream', 'data:image/jpeg');
        }
        img.setAttribute('src', src);
        console.log(`✅ Fixed MIME type`);
      }
      
      // Skip if not a data URL or not an image (after trying to fix octet-stream)
      if (!src.startsWith('data:image')) {
        console.log(`⏭️ Skipping non-image: ${src.substring(0, 50)}...`);
        continue;
      }
      
      // Validate it's a proper base64 image data URL
      if (!src.match(/^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/)) {
        console.warn(`⚠️ Invalid format: ${src.substring(0, 50)}...`);
        continue;
      }
      
      try {
        console.log(`📤 Uploading image ${i + 1}/${imgEls.length}...`);
        
        // Compress (skip SVG as it's already optimized)
        let compressed = src;
        if (!src.startsWith('data:image/svg+xml')) {
          compressed = await compressBase64Image(src);
        }
        
        // Determine file extension from mime type
        let ext = 'jpg';
        if (src.includes('data:image/png')) ext = 'png';
        else if (src.includes('data:image/gif')) ext = 'gif';
        else if (src.includes('data:image/webp')) ext = 'webp';
        else if (src.includes('data:image/svg')) ext = 'svg';
        
        // Upload
        const imageId = generateId();
        const path = `user_websites/${ownerUserId}/${targetWebsiteId}/images/${imageId}.${ext}`;
        const url = await uploadBase64ToStorage(compressed, path);
        
        // Replace
        img.setAttribute('src', url);
        uploaded++;
        
        console.log(`✅ Uploaded image ${i + 1}: ${imageId}.${ext}`);
      } catch (error) {
        console.error(`❌ Failed to upload image ${i + 1}:`, error);
        // Keep the original src if upload fails
      }
    }
    
    console.log(`✅ Processed ${uploaded} image(s) successfully`);
    return { html: container.innerHTML, uploaded };
  };

  // Initialize user ID and check for existing website
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserId(firebaseUser.uid);
        console.log('👤 User ID:', firebaseUser.uid);
        
        // Check for existing website in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const existingWebsiteId = urlParams.get('websiteId');
        
        if (existingWebsiteId) {
          console.log('📂 Loading existing website:', existingWebsiteId);
          await loadExistingWebsite(existingWebsiteId);
        }
      } else {
        router.push('/auth/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  // Auto-open preview after payment redirect (when editor and website are ready)
  useEffect(() => {
    if (!editor) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenPreview = urlParams.get('openPreview') === 'true';
    
    if (shouldOpenPreview) {
      console.log('🔄 Auto-opening preview after payment redirect...');
      console.log('📊 Editor state:', { editor: !!editor, websiteId, isNewWebsite, templateData: !!templateData });
      
      // Wait for website to load if it's an existing website
      const waitForWebsite = async () => {
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds max wait
        
        while (attempts < maxAttempts) {
          // If it's a new website, we can open preview immediately (after template loads)
          if (isNewWebsite && templateData) {
            console.log('✅ New website with template loaded, opening preview');
            break;
          }
          
          // If it's an existing website, wait for template data to load
          if (!isNewWebsite && websiteId && templateData) {
            console.log('✅ Existing website loaded, opening preview');
            break;
          }
          
          console.log(`⏳ Waiting for website/template to load... (attempt ${attempts + 1}/${maxAttempts})`, {
            isNewWebsite,
            websiteId,
            hasTemplate: !!templateData
          });
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        
        // Open preview
        console.log('🚀 Opening preview window...');
        handlePreview();
        // Clean up URL param
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('openPreview');
        window.history.replaceState({}, '', newUrl.toString());
      };
      
      // Start waiting after a short delay to let things initialize
      setTimeout(waitForWebsite, 500);
    }
  }, [editor, websiteId, isNewWebsite, templateData]);

  // Get template ID from params
  useEffect(() => {
    const getId = async () => {
      console.log('🔍 Getting template ID from params...');
      const resolvedParams = await params;
      console.log('✅ Resolved params:', resolvedParams);
      setTemplateId(resolvedParams.id as string);
      console.log('✅ Template ID set:', resolvedParams.id);
    };
    getId();
  }, [params]);

  // Load website content as soon as the editor is ready and a websiteId exists
  // Do NOT block on templateData for existing sites (speeds up reload and avoids deadlocks)
  useEffect(() => {
    console.log('🔄 Load website useEffect triggered:', { editor: !!editor, websiteId, isNewWebsite, templateData: !!templateData, templateCssLength: templateData?.css?.length, hasLoaded: hasLoadedWebsiteRef.current });
    if (editor && websiteId && !isNewWebsite && !hasLoadedWebsiteRef.current) {
      console.log('📂 Loading existing website content...');
      hasLoadedWebsiteRef.current = true; // Mark as loaded to prevent repeats
      loadExistingWebsite(websiteId);
    }
  }, [editor, websiteId, isNewWebsite, templateData]);

  // Initialize GrapesJS (defensive initialization with DOM check)
  useLayoutEffect(() => {
    console.log('🎨 Initialize GrapesJS useLayoutEffect called. editorRef:', !!editorRef.current, 'editor exists:', !!editor);

    // Defensive check: wait for DOM element to be ready
    const initEditor = async () => {
      if (!editorRef.current || editor) return;

      // Additional check: ensure element is actually in the DOM
      if (!editorRef.current.isConnected) {
        console.log('⏳ DOM element not connected yet, retrying...');
        requestAnimationFrame(initEditor);
        return;
      }

      const newEditor = grapesjs.init({
      container: editorRef.current,
      height: '100vh',
      width: 'auto',
      
      // CRITICAL: Prevent GrapesJS from stripping custom CSS
      protectedCss: '', // Don't add any protected CSS that might override template
      
      // Storage: We'll handle this manually with Firebase
      storageManager: false,
      
      // Plugins
      plugins: [gjsPresetWebpage, gjsBlocksBasic, grapesjsTuiImageEditor],
      pluginsOpts: {
        'gjs-preset-webpage': {
          modalImportTitle: 'Import Template',
          modalImportLabel: '<div style="margin-bottom: 10px; font-size: 13px;">Paste your HTML/CSS here</div>',
          modalImportContent: (editor: any) => editor.getHtml() + '<style>' + editor.getCss() + '</style>',
        },
        'grapesjs-tui-image-editor': {
          config: {
            includeUI: {
              initMenu: 'filter',
              menuBarPosition: 'bottom',
            },
          },
          // Automatically updates image on apply
        },
      },
      
      // Canvas settings
      canvas: {
        styles: [
          // GrapesJS will load these into the canvas iframe
          // We'll add template CSS dynamically after loading
        ],
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
            name: 'Mobile',
            width: '320px',
            widthMedia: '480px',
          },
        ],
      },
      
      // Style Manager
      styleManager: {
        sectors: [
          {
            name: 'General',
            open: true,
            buildProps: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom'],
          },
          {
            name: 'Dimension',
            open: false,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'Background',
            open: false,
            // Use explicit properties to better match GrapesJS reference UI
            properties: [
              {
                property: 'background-color',
                type: 'color',
                defaults: 'transparent',
                label: 'Color',
              },
              {
                property: 'background-image',
                // Use Asset Manager image picker like the stock UI
                type: 'image',
                defaults: 'none',
                label: 'Image',
              },
              {
                property: 'background-repeat',
                type: 'select',
                defaults: 'repeat',
                options: [
                  { id: 'repeat', name: 'repeat' },
                  { id: 'repeat-x', name: 'repeat-x' },
                  { id: 'repeat-y', name: 'repeat-y' },
                  { id: 'no-repeat', name: 'no-repeat' },
                  { id: 'space', name: 'space' },
                  { id: 'round', name: 'round' },
                ],
                label: 'Repeat',
              },
              {
                property: 'background-position',
                type: 'select',
                defaults: 'left top',
                options: [
                  { id: 'left top', name: 'left top' },
                  { id: 'left center', name: 'left center' },
                  { id: 'left bottom', name: 'left bottom' },
                  { id: 'right top', name: 'right top' },
                  { id: 'right center', name: 'right center' },
                  { id: 'right bottom', name: 'right bottom' },
                  { id: 'center top', name: 'center top' },
                  { id: 'center center', name: 'center center' },
                  { id: 'center bottom', name: 'center bottom' },
                ],
                label: 'Position',
              },
              {
                property: 'background-attachment',
                type: 'select',
                defaults: 'scroll',
                options: [
                  { id: 'scroll', name: 'scroll' },
                  { id: 'fixed', name: 'fixed' },
                  { id: 'local', name: 'local' },
                ],
                label: 'Attachment',
              },
              {
                property: 'background-size',
                type: 'select',
                defaults: 'auto',
                options: [
                  { id: 'auto', name: 'auto' },
                  { id: 'cover', name: 'cover' },
                  { id: 'contain', name: 'contain' },
                ],
                label: 'Size',
              },
            ],
          },
          {
            name: 'Typography',
            open: false,
            buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration', 'text-shadow'],
          },
          {
            name: 'Decorations',
            open: false,
            buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
          },
          {
            name: 'Background Pro',
            open: false,
            buildProps: ['background','background-image','background-size','background-repeat','background-position','background-attachment','mix-blend-mode','opacity'],
          },
          {
            name: 'Filters',
            open: false,
            buildProps: ['filter','backdrop-filter'],
          },
          {
            name: 'Transform',
            open: false,
            buildProps: ['transform','transform-origin'],
          },
          {
            name: 'Transitions',
            open: false,
            buildProps: ['transition','transition-property','transition-duration','transition-timing-function','transition-delay'],
          },
        ],
      },
    });

    // Add custom commands
    newEditor.Commands.add('set-device-desktop', {
      run: (editor: any) => editor.setDevice('Desktop'),
    });
    newEditor.Commands.add('set-device-mobile', {
      run: (editor: any) => editor.setDevice('Mobile'),
    });

    // Enhanced button component with link support
    newEditor.DomComponents.addType('button', {
      isComponent: (el: any) => el.tagName === 'BUTTON',
      model: {
        defaults: {
          traits: [
            {
              type: 'text',
              label: 'Button Text',
              name: 'text',
              changeProp: true,
            },
            {
              type: 'text',
              label: 'Link (URL)',
              name: 'href',
              placeholder: 'https://example.com or #section',
            },
            {
              type: 'select',
              label: 'Link Type',
              name: 'link-type',
              options: [
                { id: 'none', value: '', name: 'None' },
                { id: 'external', value: 'external', name: 'External URL' },
                { id: 'whatsapp', value: 'whatsapp', name: 'WhatsApp' },
                { id: 'section', value: 'section', name: 'Page Section' },
                { id: 'payfast', value: 'payfast', name: 'PayFast Payment' },
              ],
            },
            {
              type: 'text',
              label: 'Phone (for WhatsApp)',
              name: 'whatsapp-phone',
              placeholder: '27123456789',
            },
          ],
        },
      },
    });

    // Booking Calendar Component (Business Tier Only)
    newEditor.DomComponents.addType('booking-calendar', {
      isComponent: (el: any) => el.classList && el.classList.contains('booking-calendar-container'),
      model: {
        defaults: {
          tagName: 'div',
          classes: ['booking-calendar-container'],
          traits: [
            {
              type: 'text',
              label: 'Title',
              name: 'title',
              changeProp: true,
            },
            {
              type: 'text',
              label: 'Subtitle',
              name: 'subtitle',
              changeProp: true,
            },
          ],
        },
      },
      view: {
        onRender() {
          // Update content when traits change
          const comp = this.model;
          comp.on('change:title', () => {
            const titleEl = this.el.querySelector('h2');
            if (titleEl) titleEl.textContent = comp.get('title') || 'Book an Appointment';
          });
          comp.on('change:subtitle', () => {
            const subtitleEl = this.el.querySelector('p');
            if (subtitleEl) subtitleEl.textContent = comp.get('subtitle') || 'Select a date and time that works for you';
          });
        },
      },
    });

    // Enhanced link component
    newEditor.DomComponents.addType('link', {
      isComponent: (el: any) => el.tagName === 'A',
      model: {
        defaults: {
          traits: [
            {
              type: 'text',
              label: 'Link Text',
              name: 'text',
              changeProp: true,
            },
            {
              type: 'text',
              label: 'URL',
              name: 'href',
            },
            {
              type: 'checkbox',
              label: 'Open in new tab',
              name: 'target',
              valueTrue: '_blank',
              valueFalse: '_self',
            },
            {
              type: 'select',
              label: 'Link Type',
              name: 'link-type',
              options: [
                { id: 'external', value: 'external', name: 'External URL' },
                { id: 'whatsapp', value: 'whatsapp', name: 'WhatsApp' },
                { id: 'section', value: 'section', name: 'Page Section' },
                { id: 'email', value: 'email', name: 'Email' },
                { id: 'phone', value: 'phone', name: 'Phone' },
              ],
            },
          ],
        },
      },
    });

    // Enhanced list item with custom bullet styles
    newEditor.DomComponents.addType('list-item', {
      isComponent: (el: any) => el.tagName === 'LI',
      model: {
        defaults: {
          traits: [
            {
              type: 'select',
              label: 'Bullet Style',
              name: 'bullet-style',
              changeProp: true,
              options: [
                { id: 'checkmark', value: 'checkmark', name: '✓ Checkmark' },
                { id: 'dot', value: 'dot', name: '• Dot' },
                { id: 'arrow', value: 'arrow', name: '→ Arrow' },
                { id: 'star', value: 'star', name: '★ Star' },
                { id: 'circle', value: 'circle', name: '○ Circle' },
                { id: 'square', value: 'square', name: '■ Square' },
                { id: 'dash', value: 'dash', name: '- Dash' },
                { id: 'plus', value: 'plus', name: '+ Plus' },
              ],
            },
            {
              type: 'color',
              label: 'Bullet Color',
              name: 'bullet-color',
              changeProp: true,
            },
          ],
        },
        init() {
          this.on('change:bullet-style', this.updateBulletStyle);
          this.on('change:bullet-color', this.updateBulletColor);
        },
        updateBulletStyle() {
          const style = this.get('bullet-style');
          const bulletMap: any = {
            'checkmark': '✓',
            'dot': '•',
            'arrow': '→',
            'star': '★',
            'circle': '○',
            'square': '■',
            'dash': '-',
            'plus': '+',
          };
          
          const bullet = bulletMap[style] || '✓';
          const componentId = this.getId();
          const bulletColor = this.get('bullet-color') || 'var(--secondary-color)';
          
          // Get the canvas document to inject styles there
          const canvas = newEditor.Canvas.getDocument();
          if (!canvas) return;
          
          // Inject custom CSS into the canvas iframe (not the main document)
          const styleId = `bullet-style-${componentId}`;
          let styleEl = canvas.getElementById(styleId);
          
          if (!styleEl) {
            styleEl = canvas.createElement('style');
            styleEl.id = styleId;
            canvas.head.appendChild(styleEl);
          }
          
          // Use !important to override template CSS
          styleEl.textContent = `
            #${componentId}::before {
              content: "${bullet}" !important;
              color: ${bulletColor} !important;
            }
          `;
        },
        updateBulletColor() {
          const color = this.get('bullet-color');
          const componentId = this.getId();
          
          // Get the canvas document
          const canvas = newEditor.Canvas.getDocument();
          if (!canvas) return;
          
          // Update the color in existing style
          const styleId = `bullet-style-${componentId}`;
          const styleEl = canvas.getElementById(styleId);
          
          if (styleEl) {
            const style = this.get('bullet-style');
            const bulletMap: any = {
              'checkmark': '✓',
              'dot': '•',
              'arrow': '→',
              'star': '★',
              'circle': '○',
              'square': '■',
              'dash': '-',
              'plus': '+',
            };
            const bullet = bulletMap[style] || '✓';
            
            styleEl.textContent = `
              #${componentId}::before {
                content: "${bullet}" !important;
                color: ${color} !important;
              }
            `;
          }
        },
      },
    });

    // Add a simple button to upload images - THE EASIEST SOLUTION
    // Add custom command for image upload
    newEditor.Commands.add('upload-image', {
      run(editor: any) {
        const selected = editor.getSelected();
        
        if (selected && selected.get('type') === 'image') {
          console.log('🖼️ Opening file picker for selected image...');
          
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';
          fileInput.style.display = 'none';
          
          fileInput.onchange = (event: any) => {
            const file = event.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (e: any) => {
                const base64 = e.target.result;
                
                // Update image src
                selected.set('src', base64);
                selected.addAttributes({ src: base64 });
                
                console.log('✅ Image updated successfully!');
              };
              reader.readAsDataURL(file);
            }
            
            // Clean up
            document.body.removeChild(fileInput);
          };
          
          document.body.appendChild(fileInput);
          fileInput.click();
        } else {
          alert('Please select an image first (click on an image in the canvas or layers panel)');
        }
      },
    });
    
    // Add button to the toolbar
    newEditor.Panels.addButton('options', {
      id: 'upload-image-btn',
      className: 'fa fa-upload',
      command: 'upload-image',
      attributes: { title: 'Upload Image (Select an image first)' },
    });
    
    console.log('✅ Image upload button added to toolbar');

    console.log('✅ GrapesJS editor initialized with double-click image upload!');

    setEditor(newEditor);

      return () => {
        if (newEditor) {
          newEditor.destroy();
        }
      };
    };

    // Start the initialization process
    initEditor();
  }, []);

  // Load template from Firebase
  useEffect(() => {
    console.log('📥 Load template useEffect called. editor:', !!editor, 'templateId:', templateId, 'isNewWebsite:', isNewWebsite, 'websiteId:', websiteId);
    if (!editor || !templateId) return;

    // Check if we're loading an existing website from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const existingWebsiteId = urlParams.get('websiteId');
    
    if (existingWebsiteId) {
      console.log('📂 Found existing website in URL, skipping heavy template load (will load website instead)');
      // Avoid ZIP/template fetch entirely; website loader will inject required CSS
      return;
    }

    // Only load template into editor if it's a NEW website
    if (isNewWebsite) {
      console.log('📥 Starting auth state listener for NEW website...');
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('👤 Auth state changed. User:', user?.uid, 'isNewWebsite:', isNewWebsite);
        if (user) {
          setUserId(user.uid);
          // Load template data and into editor for new websites ONLY
          console.log('📋 Loading template data into editor for NEW website...');
          await loadTemplate(user.uid, true);
        } else {
          router.push('/auth/login');
        }
      });

      return () => unsubscribe();
    } else {
      console.log('⏭️ Skipping template load - existing website will be loaded instead');
    }
  }, [editor, templateId, router, isNewWebsite]);

  const loadTemplate = async (uid: string | undefined, loadIntoEditor: boolean = true) => {
    try {
      console.log('📥 Loading template... loadIntoEditor:', loadIntoEditor, 'websiteId:', websiteId, 'isNewWebsite:', isNewWebsite);
      
      if (!templateId) {
        console.error('❌ No template ID');
        return;
      }

      // SAFEGUARD: If we have an existing website loaded, don't override it
      if (websiteId && !isNewWebsite && loadIntoEditor) {
        console.warn('⚠️ Blocked template load - existing website is already loaded. Use loadExistingWebsite instead.');
        return;
      }

      // Load the base template (no saved website logic here - handled elsewhere)
      console.log('📋 Loading base template:', templateId);
      const templateDoc = await getDoc(doc(db, 'templates', templateId));
      
      if (!templateDoc.exists()) {
        throw new Error('Template not found');
      }

      const template = templateDoc.data();
      
      // Check if this is a GrapesJS template (has grapesJsData)
      if (template.grapesJsData) {
        console.log('📦 This is a GrapesJS template');
        setTemplateData(template);
        
        // Only load into editor if requested (for NEW websites)
        if (loadIntoEditor) {
          console.log('📦 Loading GrapesJS project data into editor...');
          try {
            const projectData = typeof template.grapesJsData === 'string'
              ? JSON.parse(template.grapesJsData)
              : template.grapesJsData;
            
            editor.loadProjectData(projectData);
            console.log('✅ GrapesJS template loaded successfully!');
            
            // Inject CSS if stored separately in projectData.css (for templates converted from HTML)
            if (projectData.css && typeof projectData.css === 'string') {
              console.log('🎨 Injecting CSS from projectData.css...');
              
              // Wait for canvas frame to be ready
              setTimeout(() => {
                try {
                  const canvasDoc = editor.Canvas.getDocument();
                  if (canvasDoc) {
                    // Remove any existing template CSS
                    const existingStyle = canvasDoc.getElementById('template-base-css');
                    if (existingStyle) existingStyle.remove();
                    
                    // Inject CSS into canvas head
                    const styleEl = canvasDoc.createElement('style');
                    styleEl.id = 'template-base-css';
                    styleEl.setAttribute('data-gjs', 'external');
                    styleEl.textContent = projectData.css;
                    
                    if (canvasDoc.head) {
                      canvasDoc.head.appendChild(styleEl);
                      console.log('✅ CSS injected into canvas');
                    }
                  }
                } catch (cssError) {
                  console.warn('⚠️ Could not inject CSS:', cssError);
                }
              }, 500);
            }
          } catch (error) {
            console.error('❌ Error loading GrapesJS template:', error);
          }
        } else {
          console.log('⏭️ Skipping editor load - will load existing website data instead');
        }
        
        return; // Done! This is a GrapesJS template (no ZIP file)
      }
      
      // LEGACY: ZIP-based template loading
      console.log('📦 This is a ZIP-based template, fetching from storage...');
      
      // We'll add CSS and JS to template data after loading from ZIP
      // For now, set the basic template data
      setTemplateData(template);

      // Fetch the template HTML from storage
      const zipUrl =
        (template as any).zipUrl ||
        (template as any).downloadURL ||
        (template as any).fileUrl ||
        (template as any).url;

      if (!zipUrl || typeof zipUrl !== 'string') {
        throw new Error('Template file URL not found on template document');
      }

      const response = await fetch(zipUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(blob);

      // Find HTML file
      let htmlContent = '';
      const htmlFile = Object.keys(zip.files).find(name => name.endsWith('.html') || name.endsWith('.htm'));
      
      console.log('📦 All files in ZIP:', Object.keys(zip.files));
      
      if (htmlFile) {
        htmlContent = await zip.files[htmlFile].async('string');
      }

      // Extract CSS files (look for style.css or any .css file)
      let externalCss = '';
      const cssFile = Object.keys(zip.files).find(name => 
        (name.endsWith('style.css') || name.endsWith('styles.css') || name.endsWith('.css')) && !zip.files[name].dir
      );
      if (cssFile) {
        externalCss = await zip.files[cssFile].async('string');
        console.log(`📄 Found external CSS file: ${cssFile}, length: ${externalCss.length}`);
      }

      // Extract JS files (look for script.js or any .js file)
      let externalJs = '';
      const jsFile = Object.keys(zip.files).find(name => 
        (name.endsWith('script.js') || name.endsWith('scripts.js') || name.endsWith('main.js') || name.endsWith('.js')) && !zip.files[name].dir
      );
      if (jsFile) {
        externalJs = await zip.files[jsFile].async('string');
        console.log(`📄 Found external JS file: ${jsFile}, length: ${externalJs.length}`);
      }

      // Extract and convert images to base64
      const imageFiles: { [key: string]: string } = {};
      for (const fileName of Object.keys(zip.files)) {
        console.log(`🔍 Checking file: ${fileName}, isDir: ${zip.files[fileName].dir}, matches: ${fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) !== null}`);
        if (fileName.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) && !zip.files[fileName].dir) {
          const file = zip.files[fileName];
          const blob = await file.async('blob');
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          // Store with multiple path variations for flexible matching
          const justFileName = fileName.split('/').pop() || fileName;
          const fullPath = fileName;
          
          // Store all variations
          imageFiles[justFileName] = dataUrl;
          imageFiles[fullPath] = dataUrl;
          imageFiles[fileName.replace(/^\.\//, '')] = dataUrl; // Remove leading ./
          
          console.log(`📷 Converted image: ${justFileName} (stored as multiple paths)`);
        }
      }
      
      console.log(`✅ Total image files extracted: ${Object.keys(imageFiles).length / 3} (with variations)`);

      // Load HTML into editor
      if (htmlContent) {
        // Replace all image paths with base64 data URLs
        let processedHtml = htmlContent;
        
        // Create a map to track unique filenames (without duplicates from path variations)
        const uniqueFiles: { [key: string]: string } = {};
        for (const [path, dataUrl] of Object.entries(imageFiles)) {
          const filename = path.split('/').pop() || path;
          if (!uniqueFiles[filename] || path.length < uniqueFiles[filename].length) {
            uniqueFiles[filename] = dataUrl;
          }
        }
        
        console.log(`🔄 Processing ${Object.keys(uniqueFiles).length} unique images for replacement`);
        
        for (const [filename, dataUrl] of Object.entries(uniqueFiles)) {
          // Escape special characters in filename for regex
          const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Replace all variations of the path (more comprehensive)
          const patterns = [
            // HTML src attributes
            new RegExp(`src=["']images/${escapedFilename}["']`, 'gi'),
            new RegExp(`src=["']\.\/images/${escapedFilename}["']`, 'gi'),
            new RegExp(`src=["']\.\./images/${escapedFilename}["']`, 'gi'),
            new RegExp(`src=["']\\.\\.\/images/${escapedFilename}["']`, 'gi'),
            new RegExp(`src=["']/${escapedFilename}["']`, 'gi'),
            new RegExp(`src=["']${escapedFilename}["']`, 'gi'),
            // CSS url() references
            new RegExp(`url\\(["']?images/${escapedFilename}["']?\\)`, 'gi'),
            new RegExp(`url\\(["']?\.\/images/${escapedFilename}["']?\\)`, 'gi'),
            new RegExp(`url\\(["']?\.\./images/${escapedFilename}["']?\\)`, 'gi'),
            new RegExp(`url\\(["']?${escapedFilename}["']?\\)`, 'gi'),
          ];
          
          let replacementCount = 0;
          patterns.forEach(pattern => {
            const matches = processedHtml.match(pattern);
            if (matches) {
              replacementCount += matches.length;
              if (pattern.source.includes('url\\(')) {
                processedHtml = processedHtml.replace(pattern, `url('${dataUrl}')`);
              } else {
                processedHtml = processedHtml.replace(pattern, `src="${dataUrl}"`);
              }
            }
          });
          
          if (replacementCount > 0) {
            console.log(`✅ Replaced ${replacementCount} occurrence(s) of ${filename}`);
          }
        }
        
        // Log any remaining broken image references
        const brokenImageMatches = processedHtml.match(/src=["'][^"']*?(images\/[^"']+)["']/gi);
        if (brokenImageMatches && brokenImageMatches.length > 0) {
          console.warn(`⚠️ Found ${brokenImageMatches.length} potentially broken image references:`, brokenImageMatches);
          
          // Replace broken images with placeholder
          const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3EImage Not Found%3C/text%3E%3C/svg%3E';
          processedHtml = processedHtml.replace(/src=["']images\/[^"']+["']/gi, `src="${placeholder}"`);
          console.log(`🔄 Replaced broken images with placeholder`);
        }
        
        // Extract body content
        const bodyMatch = processedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let bodyContent = bodyMatch ? bodyMatch[1] : processedHtml;

        // Sanitize HTML for GrapesJS: remove invalid attributes (eg. numeric tokens like "2000")
        const sanitizeHtmlForGrapes = (html: string): string => {
          try {
            const containerEl = document.createElement('div');
            containerEl.innerHTML = html;

            const isValidAttrName = (name: string) => /^[A-Za-z_][A-Za-z0-9_:\-\.]*$/.test(name);

            const allEls = containerEl.querySelectorAll('*');
            allEls.forEach((el) => {
              // Remove problematic responsive image attributes which often break parsers
              if (el.tagName === 'IMG') {
                el.removeAttribute('srcset');
                el.removeAttribute('sizes');
              }

              // Remove any invalid attribute names
              // Copy attribute names first as the NamedNodeMap is live
              const attrs: string[] = [];
              for (let i = 0; i < el.attributes.length; i++) {
                attrs.push(el.attributes[i].name);
              }
              attrs.forEach((attrName) => {
                if (!isValidAttrName(attrName)) {
                  el.removeAttribute(attrName);
                }
              });
            });

            return containerEl.innerHTML;
          } catch (e) {
            console.warn('⚠️ sanitizeHtmlForGrapes failed, returning original HTML');
            return html;
          }
        };
        
        // PRIORITIZE: Use external CSS if available, otherwise extract inline CSS
        let cssContent = '';
        
        if (externalCss) {
          console.log('✅ Using EXTERNAL CSS file');
          cssContent = externalCss;
        } else {
          console.log('📄 No external CSS found, extracting inline CSS');
          const styleMatch = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
          if (styleMatch) {
            cssContent = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
          }
        }
        
        // Replace image references in CSS with base64 data URLs
        if (cssContent && Object.keys(uniqueFiles).length > 0) {
          console.log('🎨 Processing image references in CSS...');
          let cssReplacementCount = 0;
          
          for (const [filename, dataUrl] of Object.entries(uniqueFiles)) {
            const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            const cssPatterns = [
              new RegExp(`url\\(["']?images/${escapedFilename}["']?\\)`, 'gi'),
              new RegExp(`url\\(["']?\.\/images/${escapedFilename}["']?\\)`, 'gi'),
              new RegExp(`url\\(["']?\.\./images/${escapedFilename}["']?\\)`, 'gi'),
              new RegExp(`url\\(["']?${escapedFilename}["']?\\)`, 'gi'),
            ];
            
            cssPatterns.forEach(pattern => {
              const matches = cssContent.match(pattern);
              if (matches) {
                cssReplacementCount += matches.length;
                cssContent = cssContent.replace(pattern, `url('${dataUrl}')`);
              }
            });
          }
          
          if (cssReplacementCount > 0) {
            console.log(`✅ Replaced ${cssReplacementCount} image reference(s) in CSS`);
          }
          
          // Replace any remaining broken image paths in CSS with placeholder
          const brokenCssImages = cssContent.match(/url\(["']?(?:\.\.?\/)?images\/[^)"']+["']?\)/gi);
          if (brokenCssImages && brokenCssImages.length > 0) {
            console.warn(`⚠️ Found ${brokenCssImages.length} broken image references in CSS:`, brokenCssImages);
            const cssPlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3C/svg%3E';
            cssContent = cssContent.replace(/url\(["']?(?:\.\.?\/)?images\/[^)"']+["']?\)/gi, `url('${cssPlaceholder}')`);
            console.log('🔄 Replaced broken CSS background images with placeholder');
          }
        }
        
        // Convert CSS variables to actual values for GrapesJS compatibility
        if (cssContent) {
          const cssVars: { [key: string]: string} = {};
          const rootMatch = cssContent.match(/:root\s*\{([\s\S]*?)\}/);
          
          if (rootMatch) {
            const rootContent = rootMatch[1];
            const varMatches = rootContent.matchAll(/--([a-zA-Z-]+):\s*([^;]+);/g);
            
            Array.from(varMatches).forEach((m) => {
              cssVars[`--${m[1]}`] = m[2].trim();
            });
            
            console.log('🎨 Found CSS variables:', Object.keys(cssVars).length);
            
            // Replace all var() references with actual values
            for (const [varName, varValue] of Object.entries(cssVars)) {
              const varRegex = new RegExp(`var\\(${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
              cssContent = cssContent.replace(varRegex, varValue);
            }
            
        console.log('✅ Converted CSS variables to actual values');
      }
    }

    console.log('📐 CSS content length:', cssContent.length);
    console.log('📄 Body content length:', bodyContent.length);
    console.log('📝 First 500 chars of CSS:', cssContent.substring(0, 500));
    
    // Update template data with CSS and JS content
    setTemplateData((prev: any) => {
      const updated = {
        ...prev,
        css: cssContent,
        js: externalJs
      };
      console.log('📋 Updated template data with CSS length:', cssContent.length);
      console.log('📋 Updated template data with JS length:', externalJs.length);
      console.log('📋 Template data update complete, will trigger website load...');
      return updated;
    });
        
        // Only load into editor if requested
        if (loadIntoEditor) {
          // Get canvas iframe
          const canvas = editor.Canvas.getDocument();
        
         // Method 1: Inject CSS as NON-EDITABLE stylesheet (like external CSS)
         // This is the KEY - treat it as an external stylesheet, not as component CSS
         if (canvas && cssContent) {
           const stripImportant = (css: string) => css.replace(/!important\s*/g, '');
           const cleanedCss = stripImportant(cssContent);
           const styleElement = canvas.createElement('style');
           styleElement.id = 'template-external-styles';
           styleElement.setAttribute('data-gjs', 'external'); // Mark as external to prevent GrapesJS from managing it
           styleElement.textContent = cleanedCss;
           
           // Insert BEFORE GrapesJS's own styles to ensure high specificity
           const firstGjsStyle = canvas.head.querySelector('style[data-gjs-type]');
           if (firstGjsStyle) {
             canvas.head.insertBefore(styleElement, firstGjsStyle);
           } else {
             canvas.head.insertBefore(styleElement, canvas.head.firstChild);
           }
           console.log('✅ Injected CSS as EXTERNAL stylesheet (non-editable)');
           console.log('🎨 CSS content length:', cleanedCss.length);
           console.log('🎨 CSS first 200 chars:', cleanedCss.substring(0, 200));
         } else {
           console.log('❌ No CSS content to inject or canvas not available');
           console.log('Canvas available:', !!canvas);
           console.log('CSS content length:', cssContent?.length || 0);
         }
         
         // Method 2: Load HTML components (without CSS parsing)
         const safeBodyContent = sanitizeHtmlForGrapes(bodyContent);
         editor.setComponents(safeBodyContent);
        
        // Method 3: Inject JavaScript if available
        if (canvas && externalJs) {
          const scriptElement = canvas.createElement('script');
          scriptElement.id = 'template-external-script';
          scriptElement.textContent = externalJs;
          canvas.body.appendChild(scriptElement);
          console.log('✅ Injected external JavaScript');
        }
        
          console.log(`✅ Converted ${Object.keys(imageFiles).length} images to base64`);
          console.log('✅ Template loading complete');
        }
      }

      // Add JavaScript to handle button clicks for navigation (only if loading into editor)
      if (loadIntoEditor) {
        const navScript = `
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              // Store current page URL as referrer for payment redirects (works for old links!)
              // Use localStorage (shared across tabs) so PayFast redirect can access it
              var currentPageUrl = window.location.href;
              
              function storeReferrer() {
                try {
                  localStorage.setItem('payment_referrer', currentPageUrl);
                  sessionStorage.setItem('payment_referrer', currentPageUrl);
                } catch(e) {
                  console.warn('Could not store referrer:', e);
                }
              }
              
              // Store immediately
              storeReferrer();
              
              // Handle buttons with href attribute (from our custom traits)
              document.querySelectorAll('button[data-href], a.payment-link, button.payment-button').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                  var href = btn.getAttribute('data-href') || btn.getAttribute('href');
                  
                  // If it's a PayFast payment link, store referrer before navigating
                  if (href && (href.includes('payfast.co.za') || btn.classList.contains('payment-link') || btn.classList.contains('payment-button'))) {
                    storeReferrer();
                    
                    // Also try to add referrer to URL as query param (for old links)
                    try {
                      var url = new URL(href);
                      if (!url.searchParams.has('custom_str4')) {
                        url.searchParams.set('custom_str4', currentPageUrl);
                        if (btn.hasAttribute('data-href')) {
                          btn.setAttribute('data-href', url.toString());
                          href = url.toString();
                        } else {
                          btn.setAttribute('href', url.toString());
                          href = url.toString();
                        }
                        console.log('✅ Added referrer to PayFast URL:', url.toString());
                      }
                    } catch(e) {
                      console.warn('Could not modify PayFast URL:', e);
                    }
                  }
                  
                  // For buttons with data-href, prevent default and navigate
                  if (btn.hasAttribute('data-href')) {
                    e.preventDefault();
                    if (href) {
                      window.location.href = href;
                    }
                  }
                  // For links, let them navigate normally (they'll open in new tab with target="_blank")
                });
              });
            });
          </script>
        `;
        
        // Inject the script into the editor's canvas
        const canvas = editor.Canvas.getDocument();
        if (canvas && !canvas.getElementById('nav-handler-script')) {
          const script = canvas.createElement('script');
          script.id = 'nav-handler-script';
          script.textContent = navScript.replace(/<script>|<\/script>/g, '');
          canvas.body.appendChild(script);
        }
      }

      console.log('✅ Template loaded successfully');
    } catch (error) {
      console.error('❌ Error loading template:', error);
    }
  };

  // Load existing website data
  const loadExistingWebsite = async (websiteIdParam: string) => {
    try {
      console.log('📂 Loading website:', websiteIdParam);
      
      const websiteDoc = await getDoc(doc(db, 'user_websites', websiteIdParam));
      
      if (websiteDoc.exists()) {
        const data = websiteDoc.data();
        setWebsiteId(websiteIdParam);
        setWebsiteName(data.websiteName || '');
        setPublishedUrl(data.publishedUrl || null);
        setIsNewWebsite(false);
        console.log('✅ Website loaded:', data.websiteName);
        
        // Load the content into the editor when it's ready
        if (editor) {
          loadWebsiteIntoEditor(data);
        }
      } else {
        console.log('❌ Website not found');
      }
    } catch (error) {
      console.error('❌ Error loading website:', error);
    }
  };

  // Load website content into GrapesJS editor
  const loadWebsiteIntoEditor = async (websiteData: any) => {
    if (!editor) return;
    
    try {
      console.log('🎨 Loading website into editor...');
      
      // Prefer loading from persisted GrapesJS project data when available
      if (websiteData.projectData) {
        try {
          const projectData = typeof websiteData.projectData === 'string'
            ? JSON.parse(websiteData.projectData)
            : websiteData.projectData;
          editor.loadProjectData(projectData);
          console.log('✅ Loaded editor from saved projectData');

          // Ensure CSS is injected after frame is actually ready
          const ensureCss = () => {
            const canvasDoc = editor.Canvas.getDocument();
            if (!canvasDoc) return;

            // Remove any previous external style first
            const existingStyle = canvasDoc.getElementById('template-external-styles');
            if (existingStyle) existingStyle.remove();

            // Use last savedCss (baseline) and then apply user overrides
            const baseCss = (websiteData.savedCss || templateData?.css || '').toString();
            if (baseCss) {
              const styleEl = canvasDoc.createElement('style');
              styleEl.id = 'template-external-styles';
              styleEl.setAttribute('data-gjs', 'external');
              styleEl.textContent = baseCss; // keep original specificity
              if (canvasDoc.head.firstChild) canvasDoc.head.insertBefore(styleEl, canvasDoc.head.firstChild);
              else canvasDoc.head.appendChild(styleEl);
            }

            try {
              const userCss = websiteData.savedUserCss || '';
              if (userCss) editor.setStyle(userCss);
            } catch (e) {
              console.warn('⚠️ Failed to apply user CSS after projectData load:', e);
            }

            // Clean up problematic inline styles that GrapesJS might add
            // This fixes issues where gallery images cause buttons/backgrounds to break
            try {
              const allElements = canvasDoc.querySelectorAll('*');
              allElements.forEach((el: any) => {
                // Remove inline styles that shouldn't be there (preserve valid ones)
                if (el.style && el.style.length > 0) {
                  // Check if this is a gallery item or image - keep their styles
                  const isGalleryItem = el.classList?.contains('gallery-item') || 
                                       el.closest('.gallery-item') ||
                                       el.tagName === 'IMG';
                  
                  // Check if this is a button or section that shouldn't have conflicting styles
                  const isButton = el.classList?.contains('cta-button') || 
                                  el.classList?.contains('btn-primary') || 
                                  el.classList?.contains('btn-secondary') ||
                                  el.classList?.contains('payment-button') ||
                                  el.classList?.contains('submit-btn');
                  
                  const isSection = el.tagName === 'SECTION' || el.classList?.contains('hero') ||
                                   el.classList?.contains('services') ||
                                   el.classList?.contains('pricing') ||
                                   el.classList?.contains('testimonials');
                  
                  // Remove problematic inline styles from buttons and sections
                  // (GrapesJS sometimes adds these when gallery images are uploaded)
                  if ((isButton || isSection) && !isGalleryItem) {
                    // Remove any inline background-color that might conflict
                    if (el.style.backgroundColor && !el.classList?.contains('gallery-item')) {
                      const bgColor = el.style.backgroundColor;
                      // Only remove if it's a weird color that shouldn't be there
                      // Keep colors that match the design (black, white, gold, etc.)
                      const validColors = ['rgb(26, 26, 26)', 'rgb(0, 0, 0)', '#1a1a1a', '#000000', 
                                          'rgb(255, 255, 255)', '#ffffff', '#fff', 'white',
                                          'rgb(212, 175, 55)', '#d4af37', 'transparent'];
                      if (!validColors.some(color => bgColor.includes(color))) {
                        el.style.removeProperty('background-color');
                        console.log('🧹 Removed conflicting background-color from', el.tagName, el.className);
                      }
                    }
                    
                    // Remove any inline color that might conflict
                    if (el.style.color && !el.classList?.contains('gallery-item')) {
                      const textColor = el.style.color;
                      const validColors = ['rgb(26, 26, 26)', 'rgb(0, 0, 0)', '#1a1a1a', '#000000', 
                                          'rgb(255, 255, 255)', '#ffffff', '#fff', 'white',
                                          'rgb(212, 175, 55)', '#d4af37'];
                      if (!validColors.some(color => textColor.includes(color))) {
                        el.style.removeProperty('color');
                        console.log('🧹 Removed conflicting color from', el.tagName, el.className);
                      }
                    }
                  }
                }
              });
              
              console.log('✅ Cleaned up inline styles that might conflict with CSS');
            } catch (e) {
              console.warn('⚠️ Style cleanup failed:', e);
            }

            // Fix relative/broken images to avoid 404s
            try {
              const imgs = Array.from(canvasDoc.querySelectorAll('img')) as HTMLImageElement[];
              const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3EImage%20placeholder%3C/text%3E%3C/svg%3E';
              imgs.forEach(img => {
                const src = img.getAttribute('src') || '';
                if ((/^images\//i.test(src) || /^\.\/?images\//i.test(src)) && !/^https?:/i.test(src) && !/^data:/i.test(src)) {
                  img.setAttribute('src', placeholder);
                }
              });

              const styleSheets = Array.from(canvasDoc.styleSheets) as CSSStyleSheet[];
              styleSheets.forEach(ss => {
                let rules: any[] = [];
                try { rules = Array.from(ss.cssRules || []); } catch (_) { /* ignore cross-origin */ }
                rules.forEach((rule: any) => {
                  if (rule.style && rule.style.backgroundImage && /url\(([^)]+)\)/.test(rule.style.backgroundImage)) {
                    const url = rule.style.backgroundImage.replace(/url\(["']?([^"')]+)["']?\)/, '$1');
                    if ((/^images\//i.test(url) || /^\.\/?images\//i.test(url)) && !/^https?:/i.test(url) && !/^data:/i.test(url)) {
                      rule.style.backgroundImage = `url(${placeholder})`;
                    }
                  }
                });
              });
            } catch (e) {
              console.warn('⚠️ Image fix pass failed:', e);
            }
          };

          // Run once now (if possible) and also on frame load to be safe
          requestAnimationFrame(ensureCss);
          editor.on('canvas:frame:load', ensureCss);
          return;
        } catch (e) {
          console.warn('⚠️ Failed to load projectData, falling back to HTML/CSS:', e);
        }
      }

      // Load from saved HTML/CSS (which has Firebase Storage image URLs)
      console.log('⚠️ No (usable) GrapesJS data found, using fallback HTML/CSS load');
      console.log('📐 Saved CSS length:', websiteData.savedCss?.length || 0);
      console.log('📄 Saved HTML length:', websiteData.savedHtml?.length || 0);
      
      // STEP 1: Load HTML first
      if (websiteData.savedHtml) {
        console.log('📄 Loading HTML components...');
        editor.setComponents(websiteData.savedHtml);
        console.log('✅ HTML loaded into editor');
      }
      
      // STEP 2: Use GrapesJS's CSS management system
      const templateCss = templateData?.css || '';
      const savedUserCss = websiteData.savedUserCss || '';
      const userCssFallback = websiteData.savedCss || '';
      const userCss = savedUserCss || userCssFallback;

      if (userCss || templateCss) {
        console.log('🎨 Applying template CSS externally and user CSS via GrapesJS...');
        console.log('📐 Template CSS length:', templateCss.length);
        console.log('📐 User CSS length:', userCss.length);

        // Inject only TEMPLATE CSS as external stylesheet
        const canvas = editor.Canvas.getDocument();
        if (canvas) {
          const existingStyle = canvas.getElementById('template-external-styles');
          if (existingStyle) existingStyle.remove();
          if (templateCss) {
            const stripImportant = (css: string) => css.replace(/!important\s*/g, '');
            const cleanedTemplateCss = stripImportant(templateCss);
            const styleElement = canvas.createElement('style');
            styleElement.id = 'template-external-styles';
            styleElement.setAttribute('data-gjs', 'external');
            styleElement.textContent = cleanedTemplateCss;
            if (canvas.head.firstChild) {
              canvas.head.insertBefore(styleElement, canvas.head.firstChild);
            } else {
              canvas.head.appendChild(styleElement);
            }
            hasInjectedCSSRef.current = true;
          }
        }

        // Apply USER CSS via GrapesJS so style manager can read/modify it
        try {
          if (userCss) {
            editor.setStyle(userCss);
            console.log('✅ Applied user CSS via editor.setStyle');
          }
        } catch (error) {
          console.warn('⚠️ Failed to apply user CSS via setStyle:', error);
        }
      } else {
        console.error('❌ No saved CSS found');
      }
      
      console.log('✅ Website loading initiated with CSS injection');
    } catch (error) {
      console.error('❌ Error loading website into editor:', error);
    }
  };

  // Helper: Capture screenshot silently (without prompts) - returns File or null
  const captureScreenshotSilently = async (): Promise<File | null> => {
    try {
      if (!editor) {
        console.warn('⚠️ Editor not ready for screenshot');
        return null;
      }

      // Find the GrapesJS canvas/frame element
      const canvasFrame = editor.Canvas.getFrameEl();
      if (!canvasFrame) {
        console.warn('⚠️ Unable to find editor canvas');
        return null;
      }

      // Get the iframe content
      const iframe = canvasFrame.contentDocument || canvasFrame.contentWindow?.document;
      if (!iframe) {
        console.warn('⚠️ Unable to access editor content');
        return null;
      }

      // Wait a moment for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get the actual dimensions of the content
      const contentWidth = iframe.body.scrollWidth || 1200;
      const contentHeight = iframe.body.scrollHeight || 800;
      
      // Use a standard 16:9 aspect ratio (1920x1080) for website previews
      // This is a common aspect ratio that looks good in cards
      const standardWidth = 1920;
      const standardHeight = 1080; // 16:9 ratio
      
      // Use standard dimensions, but don't exceed content dimensions
      const targetWidth = Math.min(contentWidth, standardWidth);
      // For height, capture as much as possible up to standard height, but maintain 16:9 ratio
      const maxHeight = Math.min(contentHeight, standardHeight);
      const targetHeight = Math.min(maxHeight, Math.round(targetWidth * (9/16)));
      
      console.log('📸 Capturing screenshot:', {
        contentWidth,
        contentHeight,
        targetWidth,
        targetHeight,
        aspectRatio: `${targetWidth}:${targetHeight}`,
        ratio: (targetWidth / targetHeight).toFixed(2)
      });
      
      // Capture screenshot with proper dimensions
      // Use the full width and capture from top of page
      const canvas = await html2canvas(iframe.body, {
        width: targetWidth,
        height: targetHeight,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        logging: false,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
        scale: 1, // Use 1:1 scale for better quality
        backgroundColor: '#ffffff', // White background for better display
        allowTaint: false,
        removeContainer: false,
      });

      // Convert canvas to blob and return as File
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
        if (!blob) {
            console.warn('⚠️ Failed to convert canvas to blob');
            resolve(null);
            return;
          }
          const file = new File([blob], 'preview.png', { type: 'image/png' });
          console.log('✅ Screenshot captured silently');
          resolve(file);
        }, 'image/png');
      });
    } catch (error) {
      console.error('❌ Error capturing screenshot silently:', error);
      return null;
    }
  };

  // Capture screenshot from the editor canvas (manual button - with prompts)
  const handleCaptureScreenshot = async () => {
    const file = await captureScreenshotSilently();
    if (!file) {
      alert('Failed to capture screenshot. Please try again.');
          return;
        }

        // Show preview and ask to save
    const imageUrl = URL.createObjectURL(file);
        setPreviewImagePreview(imageUrl);
        setPreviewImageFile(file);

        // Ask user if they want to save
        const savePreview = confirm('Screenshot captured! Do you want to save this as your preview image?\n\nClick OK to save, or Cancel to try again.');
        
        if (savePreview && websiteId) {
          // Auto-save if website already exists
      const previewUrl = await uploadPreviewImage(websiteId, file);
          if (previewUrl) {
            const websiteDocRef = doc(db, 'user_websites', websiteId);
            await updateDoc(websiteDocRef, {
              previewImageUrl: previewUrl,
              previewGeneratedAt: new Date(),
            });
            alert('✅ Preview image saved successfully!');
            setPreviewImageFile(null);
            setPreviewImagePreview(null);
            URL.revokeObjectURL(imageUrl); // Clean up
          }
        } else if (savePreview) {
          // Website doesn't exist yet, will be saved when user saves the website
          alert('Preview image ready! Click Save to upload it with your website.');
        } else {
          // User cancelled, clear the preview
          setPreviewImageFile(null);
          setPreviewImagePreview(null);
          URL.revokeObjectURL(imageUrl); // Clean up
    }
  };

  // Handle file upload for preview image
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const imageUrl = URL.createObjectURL(file);
    setPreviewImagePreview(imageUrl);
    setPreviewImageFile(file);

    // Auto-save if website already exists
    if (websiteId) {
      const saveNow = confirm('Image selected! Do you want to save this as your preview image now?');
      if (saveNow) {
        const previewUrl = await uploadPreviewImage(websiteId, file);
        if (previewUrl) {
          const websiteDocRef = doc(db, 'user_websites', websiteId);
          await updateDoc(websiteDocRef, {
            previewImageUrl: previewUrl,
            previewGeneratedAt: new Date(),
          });
          alert('✅ Preview image saved successfully!');
          setPreviewImageFile(null);
          setPreviewImagePreview(null);
          URL.revokeObjectURL(imageUrl);
          // Reset file input
          event.target.value = '';
        }
      }
    } else {
      alert('Preview image ready! Click Save to upload it with your website.');
    }
  };

  // Upload preview image to Firebase Storage
  const uploadPreviewImage = async (websiteId: string, file?: File | null): Promise<string | null> => {
    // Use provided file or fall back to state
    const fileToUpload = file ?? previewImageFile;
    if (!fileToUpload) return null;

    try {
      console.log('📤 Uploading preview image...');
      const storageRef_instance = storageRef(storage, `website-previews/${websiteId}.png`);
      await uploadBytes(storageRef_instance, fileToUpload, {
        contentType: fileToUpload.type || 'image/png',
      });

      const downloadURL = await getDownloadURL(storageRef_instance);
      console.log('✅ Preview image uploaded:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading preview image:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!editor || !userId || !templateId) {
      console.error('❌ Cannot save: editor, userId, or templateId missing');
      alert('❌ Cannot save: Missing required data. Please refresh and try again.');
      return;
    }

    // Step 1: Prompt for website name if not set
    let finalWebsiteName = websiteName.trim();
    if (!finalWebsiteName) {
      const nameInput = prompt('Enter a name for your website:', templateData?.name || 'My Website');
      if (nameInput === null) {
        // User cancelled
        return;
      }
      finalWebsiteName = nameInput.trim() || `${templateData?.name || 'Website'} - ${new Date().toLocaleDateString()}`;
      setWebsiteName(finalWebsiteName);
    }

    try {
      console.log('💾 Saving website...');
      setIsSaving(true);

      let html = editor.getHtml();
      
      if (ENABLE_IMAGE_UPLOAD_ON_SAVE) {
        // Count total images for progress tracking
        const totalImages = (html.match(/data:image/g) || []).length;
        console.log(`📊 Found ${totalImages} base64 image(s) to process`);
        console.log('🔎 Processing images...');
        const websiteKey = websiteId || `website_${userId}_${templateId}_temp`;
        try {
          const processed = await processImagesInHtml(html, userId, websiteKey);
          html = processed.html;
          if (processed.uploaded > 0) console.log(`☁️ Successfully uploaded ${processed.uploaded} image(s) to Firebase Storage`);
        } catch (imageError) {
          console.error('⚠️ Error processing images:', imageError);
        }
        console.log(`📸 Image processing complete`);
      } else {
        console.log('⚡ Fast save: skipping image re-uploads');
      }
      
      // Get the original template CSS (from templateData, not canvas)
      const templateCss = templateData?.css || '';
      
      // Also get any user-added CSS from GrapesJS editor
      const editorCss = editor.getCss();
      
      // Combine: template CSS first, then editor CSS (so editor overrides)
      const fullCss = templateCss + '\n\n/* User Customizations */\n' + editorCss;
      
      console.log('📐 Template CSS length:', templateCss.length);
      console.log('📐 Editor CSS length:', editorCss.length);
      console.log('📐 Total CSS length:', fullCss.length);
      console.log('📐 Template CSS preview:', templateCss.substring(0, 200) + '...');
      
      // Also get the external JavaScript
      const templateJs = templateData?.js || '';
      
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${templateData?.name || 'Website'}</title>
  <style>${fullCss}</style>
</head>
<body>
  ${html}
  ${templateJs ? `<script>${templateJs}</script>` : ''}
</body>
</html>`;
      
      // Check if we're updating an existing website
      let saveWebsiteId = websiteId;
      
      console.log('🔍 Current websiteId from state:', websiteId);
      console.log('🔍 Current URL:', window.location.href);
      
      if (!saveWebsiteId) {
        console.log('⚠️ No websiteId in state, checking URL params...');
        // Try to get from URL params first
        const urlParams = new URLSearchParams(window.location.search);
        const urlWebsiteId = urlParams.get('websiteId');
        
        if (urlWebsiteId) {
          saveWebsiteId = urlWebsiteId;
          console.log('✅ Found websiteId in URL:', saveWebsiteId);
        } else {
          // Check for existing website for this user and template
          console.log('🔍 No websiteId in URL, querying for existing website...');
          try {
            const websitesQuery = query(
              collection(db, 'user_websites'),
              where('userId', '==', userId),
              where('templateId', '==', templateId)
            );
            
            const querySnapshot = await getDocs(websitesQuery);
            
            if (!querySnapshot.empty) {
              saveWebsiteId = querySnapshot.docs[0].id;
              console.log('📝 Found existing website, will update:', saveWebsiteId);
            } else {
              // Create new website ID
              saveWebsiteId = `website_${userId}_${templateId}_${Date.now()}`;
              console.log('🆕 Creating new website:', saveWebsiteId);
            }
          } catch (queryError: any) {
            // If query fails (e.g., offline), create a new website ID
            console.warn('⚠️ Could not query for existing website (may be offline):', queryError.message);
            saveWebsiteId = `website_${userId}_${templateId}_${Date.now()}`;
            console.log('🆕 Creating new website (offline mode):', saveWebsiteId);
          }
        }
      } else {
        console.log('✅ Using websiteId from state:', saveWebsiteId);
      }

      // Save to Firebase
      // Also persist GrapesJS project data to restore exact editor state
      console.log('💾 Preparing website for save...');
      let projectDataString = '';
      try {
        const projectData: any = editor.getProjectData();
        
        // Only filter out assets that are not actually used (large placeholder assets)
        // Keep user-uploaded images and actual content images
        if (projectData.assets && Array.isArray(projectData.assets)) {
          // Keep assets that are either:
          // 1. Not base64 (already uploaded to Firebase Storage)
          // 2. Base64 images that are actually used in the project (smaller, user-uploaded)
          projectData.assets = projectData.assets.filter((a: any) => {
            if (!a?.src) return false;
            // Keep non-base64 URLs (Firebase Storage URLs)
            if (!/^data:/i.test(a.src)) return true;
            // Keep base64 images that are small (likely user-uploaded logos/icons)
            // Large base64 images are likely placeholders and should be removed
            const base64Size = a.src.length;
            // Keep if under 500KB (typical for logos/icons)
            if (base64Size < 500000) return true;
            return false;
          });
        }
        
        // IMPORTANT: Do NOT strip base64 images from components!
        // User-uploaded images (like logos) are stored as base64 and MUST be preserved.
        // The previous stripHeavy function was removing user content, causing images to disappear.
        // We only filter assets above, components keep all their image data.
        
        // Clean up problematic inline styles from components that might cause CSS conflicts
        // This prevents gallery images from breaking buttons/backgrounds
        const cleanComponentStyles = (comp: any) => {
          if (!comp) return;
          
          // Clean up component styles
          if (comp.style) {
            // Check if this is a gallery item - preserve its styles
            const isGalleryItem = comp.classes?.includes('gallery-item') || 
                                 comp.attributes?.class?.includes('gallery-item');
            
            // Check if this is a button or section that shouldn't have inline styles
            const isButton = comp.classes?.includes('cta-button') || 
                            comp.classes?.includes('btn-primary') || 
                            comp.classes?.includes('btn-secondary') ||
                            comp.classes?.includes('payment-button') ||
                            comp.classes?.includes('submit-btn');
            
            const isSection = comp.tagName === 'section' || 
                             comp.classes?.includes('hero') ||
                             comp.classes?.includes('services') ||
                             comp.classes?.includes('pricing') ||
                             comp.classes?.includes('testimonials');
            
            // Remove problematic inline styles from buttons and sections
            // (These can be added by GrapesJS when editing gallery images)
            if ((isButton || isSection) && !isGalleryItem) {
              // Remove inline background-color and color if they exist
              // These should come from CSS, not inline styles
              if (comp.style['background-color']) {
                delete comp.style['background-color'];
                console.log('🧹 Removed inline background-color from', comp.tagName || 'component');
              }
              if (comp.style['color']) {
                delete comp.style['color'];
                console.log('🧹 Removed inline color from', comp.tagName || 'component');
              }
            }
          }
          
          // Recursively clean child components
          const children = comp.components || comp.children;
          if (Array.isArray(children)) {
            children.forEach((child: any) => cleanComponentStyles(child));
          }
        };
        
        // Clean styles from all pages and frames
        try {
          const pages = projectData.pages || [];
          pages.forEach((p: any) => {
            const frames = p?.frames || [];
            frames.forEach((f: any) => {
              if (f?.component) {
                cleanComponentStyles(f.component);
              }
            });
          });
          console.log('✅ Cleaned up problematic inline styles from components');
        } catch (cleanError) {
          console.warn('⚠️ Component style cleanup failed:', cleanError);
        }

        projectDataString = JSON.stringify(projectData);
        console.log('✅ Project data prepared (preserving user-uploaded images, cleaned styles)');
      } catch (e) {
        console.warn('⚠️ Could not read projectData, saving HTML/CSS only. Error:', e);
      }
      
      // Check if document exists to determine if this is new or update
      // Try to read from cache first (works offline), fallback to server
      console.log('🔍 Checking if document exists:', saveWebsiteId);
      const websiteDocRef = doc(db, 'user_websites', saveWebsiteId);
      
      let existingDoc: any = null;
      let isNewWebsite = true;
      
      try {
        // Try to read from cache first (works offline)
        existingDoc = await getDoc(websiteDocRef);
        isNewWebsite = !existingDoc.exists();
        console.log(`📝 Document exists: ${existingDoc.exists()}`);
      } catch (error: any) {
        // If offline and document not in cache, assume it's new
        console.warn('⚠️ Could not check document existence (may be offline):', error.message);
        console.log('📝 Assuming new website (will merge if exists)');
        isNewWebsite = true;
      }
      
      console.log(`📝 ${isNewWebsite ? 'Creating new' : 'Updating existing'} website: ${saveWebsiteId}`);
      
      // Prepare data to save to Firestore (only metadata + rendered HTML)
      const dataToSave: any = {
        userId,
        templateId,
        templateName: templateData?.name || 'Unnamed Template',
        websiteName: finalWebsiteName,
        
        // Save rendered versions (with Firebase Storage image URLs)
        savedHtml: html,
        savedCss: fullCss,
        savedUserCss: editorCss,
        savedJs: templateJs || '',
        projectData: projectDataString,
        
        status: 'draft',
        updatedAt: new Date(),
      };

      // Only set createdAt if this is a new website
      if (isNewWebsite) {
        dataToSave.createdAt = new Date();
        console.log('🆕 Setting createdAt for new website');
      } else if (existingDoc?.data()?.createdAt) {
        // Preserve existing createdAt when updating
        dataToSave.createdAt = existingDoc.data()!.createdAt;
        console.log('📝 Preserved createdAt:', existingDoc.data()!.createdAt);
      }

      console.log('💾 Saving to Firestore...');
      console.log('💾 Data being saved:', { 
        ...dataToSave, 
        savedHtml: '[HTML content]', 
        savedCss: '[CSS content]',
        createdAt: dataToSave.createdAt?.toISOString?.() || dataToSave.createdAt,
        updatedAt: dataToSave.updatedAt?.toISOString?.() || dataToSave.updatedAt
      });
      
      // Use setDoc with merge to handle both new and existing documents
      // This works offline - Firebase will queue the write and sync when online
      await setDoc(websiteDocRef, dataToSave, { merge: true });

      setWebsiteId(saveWebsiteId);

      // Update URL if needed
      if (!window.location.search.includes('websiteId')) {
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}?websiteId=${saveWebsiteId}`
        );
      }

      console.log('✅ Website saved successfully!');
      
      // Step 2: Handle preview image
      let previewUrl: string | null = null;
      
      // If user already selected/captured a preview image, use it
      if (previewImageFile) {
        console.log('📸 Uploading user-selected preview image...');
        previewUrl = await uploadPreviewImage(saveWebsiteId, previewImageFile);
      } else {
        // Step 3: Auto-capture screenshot if no preview exists
        console.log('📸 No preview image found, auto-capturing screenshot...');
        const screenshotFile = await captureScreenshotSilently();
        
        if (screenshotFile) {
          // Pass the file directly to uploadPreviewImage (no need to update state)
          previewUrl = await uploadPreviewImage(saveWebsiteId, screenshotFile);
          
        if (previewUrl) {
            console.log('✅ Auto-captured preview image uploaded!');
          }
        } else {
          console.warn('⚠️ Could not auto-capture screenshot');
        }
      }
      
      // Update website document with preview URL if we have one
      if (previewUrl) {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(websiteDocRef, {
            previewImageUrl: previewUrl,
            previewGeneratedAt: new Date(),
          });
        console.log('✅ Preview image saved to website document!');
      }
      
      alert(`✅ Website "${dataToSave.websiteName}" saved successfully!${previewUrl ? '\n\nPreview image has been automatically captured and saved.' : ''}`);
    } catch (error) {
      console.error('❌ Error saving website:', error);
      alert('❌ Failed to save website. Check console for details.');
    }
    finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    if (!editor) return;

    const html = editor.getHtml();
    
     // Get the original template CSS + editor CSS
     const templateCss = templateData?.css || '';
     const editorCss = editor.getCss();
     const fullCss = templateCss + '\n\n/* User Customizations */\n' + editorCss;
    
    // Get external JavaScript
    const templateJs = templateData?.js || '';
    
    // Get current editor page URL to store as referrer for payment redirects
    // This will be used to redirect back to the editor, which can then reopen preview
    const editorPageUrl = new URL(window.location.href);
    
    // Ensure websiteId is in the URL if we have one (critical for loading existing website!)
    if (websiteId) {
      editorPageUrl.searchParams.set('websiteId', websiteId);
    }
    
    const editorPageUrlString = editorPageUrl.toString();
    
    // Create a unique preview identifier
    const previewId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${templateData?.name || 'Website'}</title>
  <style>${fullCss}</style>
</head>
<body>
  ${html}
  ${templateJs ? `<script>${templateJs}</script>` : ''}
  <script>
    // Store preview referrer for payment redirects
    // Since preview window doesn't have a real URL, we store the editor URL
    // and mark it as a preview so redirect page knows to reopen preview
    (function() {
      var editorPageUrl = '${editorPageUrlString}';
      var previewId = '${previewId}';
      var websiteId = '${websiteId || ''}';
      var previewData = {
        editorUrl: editorPageUrl,
        previewId: previewId,
        websiteId: websiteId,
        isPreview: true,
        timestamp: Date.now()
      };
      
      // Store preview data in localStorage (shared across tabs)
      function storePreviewReferrer() {
        try {
          var previewDataStr = JSON.stringify(previewData);
          localStorage.setItem('payment_referrer', previewDataStr);
          localStorage.setItem('preview_data', previewDataStr); // Backup
          sessionStorage.setItem('payment_referrer', previewDataStr);
          console.log('✅ Stored preview referrer for payment redirect:', previewData);
        } catch(e) {
          console.warn('Could not store preview referrer:', e);
        }
      }
      
      // Store immediately
      storePreviewReferrer();
      
      // Also store on page load/visibility change to ensure it's always set
      document.addEventListener('DOMContentLoaded', storePreviewReferrer);
      
      // Store on visibility change (when tab becomes active)
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
          storePreviewReferrer();
        }
      });
      
      // Handle payment link clicks to update referrer and modify URL
      document.addEventListener('click', function(e) {
        var target = e.target.closest('a[href*="payfast"], button[data-href*="payfast"], a.payment-link, button.payment-button');
        if (target) {
          var href = target.getAttribute('href') || target.getAttribute('data-href');
          if (href && (href.includes('payfast.co.za') || target.classList.contains('payment-link') || target.classList.contains('payment-button'))) {
            // Store preview referrer before navigation
            storePreviewReferrer();
            
            // Also try to add referrer to URL as query param (for old links)
            try {
              var url = new URL(href);
              if (!url.searchParams.has('custom_str4')) {
                // Store preview data in URL as base64 encoded JSON
                var previewDataEncoded = btoa(JSON.stringify(previewData));
                url.searchParams.set('custom_str4', previewDataEncoded);
                if (target.tagName === 'A') {
                  target.setAttribute('href', url.toString());
                } else {
                  target.setAttribute('data-href', url.toString());
                }
                console.log('✅ Added preview referrer to PayFast URL');
              }
            } catch(e) {
              console.warn('Could not modify PayFast URL:', e);
            }
          }
        }
      }, true); // Use capture phase to catch before navigation
      
      // Initialize booking calendars in preview with auto-refresh
      (function() {
        const calendarContainers = document.querySelectorAll('[data-calendar-user-id]');
        calendarContainers.forEach(function(container) {
          const userId = container.getAttribute('data-calendar-user-id');
          if (userId) {
            const calendarDiv = container.querySelector('[id^="booking-calendar-"]');
            if (calendarDiv) {
              // Check if iframe already exists
              let iframe = calendarDiv.querySelector('iframe');
              if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'calendar-iframe-' + userId;
                iframe.style.width = '100%';
                iframe.style.border = 'none';
                iframe.style.minHeight = '600px';
                iframe.title = 'Booking Calendar';
                calendarDiv.innerHTML = '';
                calendarDiv.appendChild(iframe);
              }
              
              // Set initial src with cache buster
              iframe.src = window.location.origin + '/api/calendar/embed?userId=' + userId + '&_t=' + Date.now();
              
              // Auto-refresh calendar when settings change (only for saved websites)
              // Check if we're previewing a saved website by checking for websiteId in URL
              const urlParams = new URLSearchParams(window.location.search);
              const websiteId = urlParams.get('websiteId');
              
              if (websiteId) {
                let lastCheckTime = Date.now();
                let checkInterval = setInterval(async function() {
                  try {
                    const response = await fetch(window.location.origin + '/api/calendar/settings?userId=' + userId + '&checkOnly=true');
                    if (response.ok) {
                      const data = await response.json();
                      const currentTimestamp = data.lastUpdatedTimestamp || 0;
                      
                      // If settings were updated, reload the iframe
                      if (currentTimestamp > lastCheckTime) {
                        lastCheckTime = currentTimestamp;
                        iframe.src = window.location.origin + '/api/calendar/embed?userId=' + userId + '&_t=' + Date.now();
                        console.log('🔄 Calendar settings updated, reloading calendar...');
                      }
                    }
                  } catch (error) {
                    console.warn('Error checking calendar settings:', error);
                  }
                }, 5000); // Check every 5 seconds
                
                // Cleanup on page unload
                window.addEventListener('beforeunload', function() {
                  if (checkInterval) clearInterval(checkInterval);
                });
              }
            }
          }
        });
      })();
      
      // Initialize Classes Orbit Animation components in preview
      (function() {
        setTimeout(function() {
          const orbitContainers = document.querySelectorAll('.class-orbit-container[data-class-ids]');
          
          orbitContainers.forEach(function(container) {
            const classIds = container.getAttribute('data-class-ids');
            const buttonColor = container.getAttribute('data-button-color') || '#f59e0b';
            const animationSpeed = container.getAttribute('data-animation-speed') || 'normal';
            const tutorId = '${userId || ''}';
            
            if (!classIds || !tutorId) return;
            
            // Load tutor classes
            fetch(window.location.origin + '/api/tutor/classes/public?userId=' + tutorId)
              .then(function(response) { return response.json(); })
              .then(function(data) {
                const allClasses = data.classes || [];
                const selectedClassIds = classIds.split(',').filter(function(id) { return id.trim(); });
                const selectedClasses = allClasses.filter(function(c) {
                  return selectedClassIds.includes(c.id);
                });
                
                if (selectedClasses.length === 0) {
                  container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">No classes available</div>';
                  return;
                }
                
                // Create orbit animation HTML
                var orbitHtml = '<div class="class-orbit-wrapper" style="position: relative; width: 100%; overflow: hidden; height: 400px;">';
                orbitHtml += '<div class="class-orbit-track" style="display: flex; gap: 24px; width: ' + (selectedClasses.length * 3 * 344) + 'px; animation: orbit-move-' + Date.now() + ' ' + (animationSpeed === 'slow' ? '30s' : animationSpeed === 'fast' ? '10s' : '20s') + ' linear infinite;">';
                
                // Clone classes 3 times for seamless loop
                for (var i = 0; i < 3; i++) {
                  selectedClasses.forEach(function(classItem) {
                    orbitHtml += '<div class="class-card" style="flex-shrink: 0; width: 320px; height: 360px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(0,0,0,0.15); position: relative; background: white;">';
                    
                    // Cover Image or Color Background
                    if (classItem.coverImageUrl) {
                      orbitHtml += '<div style="position: relative; width: 100%; height: 240px; overflow: hidden;">';
                      orbitHtml += '<img src="' + classItem.coverImageUrl + '" alt="' + (classItem.name || 'Class') + '" style="width: 100%; height: 100%; object-fit: cover;" />';
                      orbitHtml += '<div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%);"></div>';
                      orbitHtml += '<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem; color: white;">';
                      orbitHtml += '<h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">' + (classItem.name || 'Class') + '</h3>';
                      if (classItem.description) {
                        orbitHtml += '<p style="font-size: 0.875rem; opacity: 0.95; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.4;">' + classItem.description + '</p>';
                      }
                      orbitHtml += '</div>';
                      orbitHtml += '</div>';
                      orbitHtml += '<div style="padding: 1rem; background: #f9fafb; height: 120px; display: flex; align-items: center; justify-content: center;">';
                      orbitHtml += '<div style="text-align: center; color: #374151;">';
                      orbitHtml += '<div style="font-size: 0.875rem; color: #6b7280;">Click to enroll</div>';
                      orbitHtml += '</div>';
                      orbitHtml += '</div>';
                    } else {
                      orbitHtml += '<div style="width: 100%; height: 240px; background: ' + (classItem.color || '#f59e0b') + '; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 1.5rem; color: white;">';
                      orbitHtml += '<h3 style="font-size: 1.75rem; font-weight: bold; margin-bottom: 0.5rem; text-align: center;">' + (classItem.name || 'Class') + '</h3>';
                      if (classItem.description) {
                        orbitHtml += '<p style="font-size: 0.875rem; opacity: 0.9; text-align: center; line-height: 1.4;">' + classItem.description + '</p>';
                      }
                      orbitHtml += '</div>';
                      orbitHtml += '<div style="padding: 1rem; background: rgba(255,255,255,0.1); height: 120px; display: flex; align-items: center; justify-content: center;">';
                      orbitHtml += '<div style="text-align: center; color: white;">';
                      orbitHtml += '<div style="font-size: 0.875rem; opacity: 0.9;">Click to enroll</div>';
                      orbitHtml += '</div>';
                      orbitHtml += '</div>';
                    }
                    
                    orbitHtml += '</div>';
                  });
                }
                
                orbitHtml += '</div>';
                orbitHtml += '<div class="class-orbit-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10;">';
                orbitHtml += '<div style="text-align: center;">';
                orbitHtml += '<svg style="width: 64px; height: 64px; color: white; margin: 0 auto 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>';
                orbitHtml += '<button onclick="window.location.href=\\'' + window.location.origin + '/enroll?tutorId=' + tutorId + '\\'" style="padding: 0.75rem 2rem; background: ' + buttonColor + '; color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 1rem;">Get Access</button>';
                orbitHtml += '</div></div>';
                orbitHtml += '</div>';
                
                // Add CSS animation
                var styleId = 'orbit-style-' + Date.now();
                var existingStyle = document.getElementById(styleId);
                if (!existingStyle) {
                  var style = document.createElement('style');
                  style.id = styleId;
                  var animName = 'orbit-move-' + Date.now();
                  style.textContent = '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(-' + (selectedClasses.length * 344) + 'px); } }';
                  document.head.appendChild(style);
                  
                  // Update track animation name
                  orbitHtml = orbitHtml.replace('orbit-move-' + Date.now(), animName);
                }
                
                container.innerHTML = orbitHtml;
                
                // Start animation after a delay
                setTimeout(function() {
                  var track = container.querySelector('.class-orbit-track');
                  if (track) {
                    track.style.animationPlayState = 'running';
                  }
                }, 500);
              })
              .catch(function(error) {
                console.error('Error loading classes:', error);
                container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error loading classes</div>';
              });
          });
        }, 1000);
      })();
    })();
  </script>
</body>
</html>`;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(fullHtml);
      newWindow.document.close();
      
      // Store preview window reference so we can focus it later if needed
      (window as any).__previewWindow = newWindow;
      
      // Initialize booking calendars in preview
      setTimeout(() => {
        if (newWindow.document) {
          const calendarContainers = newWindow.document.querySelectorAll('[data-calendar-user-id]');
          calendarContainers.forEach((container: Element) => {
            const userId = container.getAttribute('data-calendar-user-id');
            if (userId) {
              const calendarDiv = container.querySelector(`[id^="booking-calendar-"]`);
              if (calendarDiv && !calendarDiv.querySelector('iframe')) {
                const iframe = newWindow.document.createElement('iframe');
                iframe.src = `${window.location.origin}/api/calendar/embed?userId=${userId}`;
                iframe.style.width = '100%';
                iframe.style.border = 'none';
                iframe.style.minHeight = '600px';
                iframe.title = 'Booking Calendar';
                calendarDiv.innerHTML = '';
                calendarDiv.appendChild(iframe);
              }
            }
          });
        }
      }, 500);
    }
  };

  // Add Calendar Component to Editor
  const addCalendarComponent = () => {
    if (!editor || !userId) {
      alert('Please wait for the editor to load, or ensure you are logged in.');
      return;
    }

    // Create calendar component HTML
    const calendarHtml = `
      <div class="booking-calendar-container" data-calendar-user-id="${userId}" style="padding: 2rem; background: #f9fafb; border-radius: 1rem; margin: 1rem 0; max-width: 100%;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 2rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">Book an Appointment</h2>
          <p style="color: #6b7280; font-size: 1rem;">Select a date and time that works for you</p>
        </div>
        <div id="booking-calendar-${userId}" style="background: white; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; min-height: 600px;">
          <iframe 
            id="calendar-iframe-${userId}"
            src="/api/calendar/embed?userId=${userId}&_t=${Date.now()}" 
            style="width: 100%; height: 800px; min-height: 600px; border: none; display: block;"
            title="Booking Calendar"
            scrolling="no"
          ></iframe>
        </div>
        <script>
          // Auto-resize iframe based on content
          (function() {
            const iframe = document.getElementById('calendar-iframe-${userId}');
            if (!iframe) return;
            
            function handleResize(event) {
              if (event.data && event.data.type === 'calendar-resize') {
                iframe.style.height = event.data.height + 'px';
              }
            }
            
            window.addEventListener('message', handleResize);
            
            // Initial resize after load - try multiple times
            iframe.onload = function() {
              // Set initial height
              iframe.style.height = '800px';
              
              // Request height from iframe multiple times
              setTimeout(function() {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: 'get-height' }, '*');
                }
              }, 100);
              
              setTimeout(function() {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: 'get-height' }, '*');
                }
              }, 500);
              
              setTimeout(function() {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: 'get-height' }, '*');
                }
              }, 1000);
            };
            
            // Fallback: if no resize message received, set a default height
            setTimeout(function() {
              if (iframe.style.height === '800px' || !iframe.style.height) {
                // Check if we received a resize message
                const checkHeight = setInterval(function() {
                  if (iframe.style.height && iframe.style.height !== '800px') {
                    clearInterval(checkHeight);
                  }
                }, 1000);
                
                // After 3 seconds, if still at default, ensure minimum height
                setTimeout(function() {
                  clearInterval(checkHeight);
                  if (!iframe.style.height || iframe.style.height === '800px') {
                    iframe.style.height = '800px';
                  }
                }, 3000);
              }
            }, 2000);
          })();
        </script>
        <script>
          // Auto-refresh calendar when settings change (only for saved websites)
          (function() {
            const iframe = document.getElementById('calendar-iframe-${userId}');
            if (!iframe) return;
            
            let lastCheckTime = Date.now();
            let checkInterval = null;
            
            // Only start checking if this is a saved website (has websiteId)
            const urlParams = new URLSearchParams(window.location.search);
            const websiteId = urlParams.get('websiteId');
            
            if (websiteId) {
              // Check for settings updates every 5 seconds
              checkInterval = setInterval(async () => {
                try {
                  const response = await fetch('/api/calendar/settings?userId=${userId}&checkOnly=true');
                  if (response.ok) {
                    const data = await response.json();
                    const currentTimestamp = data.lastUpdatedTimestamp || 0;
                    
                    // If settings were updated, reload the iframe
                    if (currentTimestamp > lastCheckTime) {
                      lastCheckTime = currentTimestamp;
                      const newSrc = '/api/calendar/embed?userId=${userId}&_t=' + Date.now();
                      iframe.src = newSrc;
                      console.log('🔄 Calendar settings updated, reloading calendar...');
                    }
                  }
                } catch (error) {
                  console.warn('Error checking calendar settings:', error);
                }
              }, 5000); // Check every 5 seconds
            }
            
            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
              if (checkInterval) clearInterval(checkInterval);
            });
          })();
        </script>
      </div>
    `;

    // Add calendar component to GrapesJS
    const component = editor.Components.addComponent({
      type: 'booking-calendar',
      content: calendarHtml,
      editable: true,
      draggable: true,
      droppable: false,
      selectable: true,
      traits: [
        {
          type: 'text',
          label: 'Title',
          name: 'title',
          changeProp: true,
          default: 'Book an Appointment',
        },
        {
          type: 'text',
          label: 'Subtitle',
          name: 'subtitle',
          changeProp: true,
          default: 'Select a date and time that works for you',
        },
      ],
    });

    // Add to canvas
    editor.addComponents(component);
    
    // Select and scroll to the new component
    setTimeout(() => {
      const components = editor.getComponents();
      const addedComponent = components.models[components.models.length - 1];
      if (addedComponent) {
        editor.select(addedComponent);
        // Scroll canvas to show the component
        const canvasEl = editor.Canvas.getFrameEl();
        if (canvasEl && canvasEl.contentWindow) {
          const componentEl = addedComponent.view?.el;
          if (componentEl) {
            componentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }, 100);

    console.log('✅ Calendar component added to editor');
  };

  // Add Classes Orbit Component to Editor (Tutor Only)
  const addClassesComponent = () => {
    if (!editor || !userId) {
      alert('Please wait for the editor to load, or ensure you are logged in.');
      return;
    }

    if (!isTutor) {
      alert('This feature is only available for tutors.');
      return;
    }

    if (tutorClasses.length === 0) {
      alert('No classes available. Please create classes first in the Tutor Dashboard.');
      return;
    }

    // Open modal to select classes
    setShowClassesModal(true);
  };

  // Handle class selection and add component
  const handleAddSelectedClasses = () => {
    if (!editor || !userId || selectedClassIds.length === 0) {
      alert('Please select at least one class.');
      return;
    }

    // Create Classes Orbit component HTML with selected classes
    const classIdsString = selectedClassIds.join(',');
    const classesHtml = `
      <div class="class-orbit-container" data-class-ids="${classIdsString}" data-button-color="#f59e0b" data-animation-speed="normal" style="width: 100%; min-height: 400px; position: relative;">
        <div class="class-orbit-placeholder" style="width: 100%; min-height: 400px; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🎓</div>
          <h3 style="font-size: 1.25rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">Classes Orbit Animation</h3>
          <p style="color: #6b7280; text-align: center;">${selectedClassIds.length} ${selectedClassIds.length === 1 ? 'class' : 'classes'} selected</p>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; justify-content: center;">
            ${selectedClassIds.map(classId => {
              const classItem = tutorClasses.find((c: any) => c.id === classId);
              if (!classItem) return '';
              return `<span style="background: ${classItem.color || '#f59e0b'}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem;">${classItem.name}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Add component to GrapesJS (using registered type)
    const component = editor.Components.addComponent({
      type: 'class-orbit-component',
      content: classesHtml,
    });

    // Set properties after component is created (so updateContent is triggered)
    setTimeout(() => {
      component.set('selectedClasses', classIdsString);
      component.set('buttonColor', '#f59e0b');
      component.set('animationSpeed', 'normal');
    }, 50);

    // Add to canvas
    editor.addComponents(component);
    
    // Select and scroll to the new component
    setTimeout(() => {
      const components = editor.getComponents();
      const addedComponent = components.models[components.models.length - 1];
      if (addedComponent) {
        editor.select(addedComponent);
        // Scroll canvas to show the component
        const canvasEl = editor.Canvas.getFrameEl();
        if (canvasEl && canvasEl.contentWindow) {
          const componentEl = addedComponent.view?.el;
          if (componentEl) {
            componentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }, 100);

    // Close modal and reset selection
    setShowClassesModal(false);
    setSelectedClassIds([]);
    
    console.log('✅ Classes Orbit component added to editor');
  };

  // Load tutor classes and register Classes Orbit block
  useEffect(() => {
    if (!editor || !userId) return;

    const loadTutorClassesAndRegisterBlock = async () => {
      try {
        // Check if user is a tutor
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch('/api/users/profile', {
          headers: {
            'X-User-Id': userId,
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const payload = await response.json();
          const profile = payload.profile as { businessType?: BusinessType };
          const userBusinessType = profile.businessType;

          if (userBusinessType === 'tutor') {
            setIsTutor(true);
            
            // Load tutor classes
            const classesResponse = await fetch('/api/tutor/classes', {
              headers: {
                'X-User-Id': userId,
                'Authorization': `Bearer ${token}`,
              },
            });

            if (classesResponse.ok) {
              const classesData = await classesResponse.json();
              const loadedClasses = classesData.classes || [];
              setTutorClasses(loadedClasses);

              // Register Classes Orbit block
              registerClassOrbitBlock(editor, loadedClasses);
              console.log('✅ Classes Orbit block registered for tutor');
            }
          } else {
            setIsTutor(false);
          }
        }
      } catch (error) {
        console.error('Error loading tutor classes:', error);
      }
    };

    loadTutorClassesAndRegisterBlock();
  }, [editor, userId]);

  const handleExport = () => {
    if (!editor) return;

    try {
      console.log('📦 Exporting website...');
      
      const html = editor.getHtml();
      const templateCss = templateData?.css || '';
      const editorCss = editor.getCss();
      const fullCss = templateCss + '\n\n/* User Customizations */\n' + editorCss;
      const templateJs = templateData?.js || '';
      
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${websiteName || templateData?.name || 'My Website'}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${html}
  ${templateJs ? `<script src="script.js"></script>` : ''}
</body>
</html>`;

      // Create downloadable files
      const files = [
        { name: 'index.html', content: fullHtml },
        { name: 'styles.css', content: fullCss },
      ];
      
      if (templateJs) {
        files.push({ name: 'script.js', content: templateJs });
      }

      // Download each file
      files.forEach(file => {
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      alert(`✅ Website exported! ${files.length} file(s) downloaded.\n\nYou can now host these files on any web hosting service.`);
      console.log('✅ Export complete');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('❌ Failed to export website. Check console for details.');
    }
  };

  // Fetch links owned by current user, scoped to current website by default
  const fetchUserLinks = async (ownerId: string, currentWebsiteId?: string | null, includeAll = false) => {
    try {
      setLinksLoading(true);

      // 1) Fetch from dedicated links collection (if present)
      const constraints: any[] = [
        where('ownerUserId', '==', ownerId),
        where('type', '==', 'customer_payment'),
        where('status', '==', 'active'),
      ];
      if (!includeAll && currentWebsiteId) {
        constraints.push(where('websiteId', '==', currentWebsiteId));
      }
      let rows: PaymentLinkRecord[] = [];
      try {
        const qRef = query(collection(db, 'links'), ...constraints);
        const snap = await getDocs(qRef);
        rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      } catch (e) {
        console.warn('ℹ️ links collection fetch skipped/failed (may not exist yet):', e);
      }

      // 2) Also map from services collection (most existing data lives here)
      // Expected fields: userId (owner), name/label, paymentLink (URL), status
      try {
        // Try several common collection and field shapes
        const candidateCollections = ['services', 'user_services', 'userServices'];
        const candidateOwnerFields = ['userId', 'ownerUserId', 'ownerId'];
        const candidateUrlFields = ['paymentLink', 'paymentUrl', 'url', 'payfastUrl', 'payfastLink'];
        const candidateNameFields = ['name', 'title', 'label'];

        let mergedCount = 0;
        for (const coll of candidateCollections) {
          try {
            for (const ownerField of candidateOwnerFields) {
              const sRef = query(collection(db, coll), where(ownerField as any, '==', ownerId));
              const sSnap = await getDocs(sRef);
              console.log(`🔎 Services fetch: collection=${coll}, ownerField=${ownerField}, count=${sSnap.size}`);
              sSnap.forEach((docSnap) => {
                const data: any = docSnap.data();
                // Find a URL field
                let url: string | null = null;
                for (const uf of candidateUrlFields) {
                  if (typeof data[uf] === 'string' && data[uf].length > 0) {
                    url = data[uf];
                    break;
                  }
                }
                if (!url) return; // skip if no payment URL
                // Optional name
                let label: string | undefined = undefined;
                for (const nf of candidateNameFields) {
                  if (typeof data[nf] === 'string' && data[nf].length > 0) {
                    label = data[nf];
                    break;
                  }
                }
                const pl: PaymentLinkRecord = {
                  id: `service_${docSnap.id}`,
                  url,
                  ownerUserId: data[ownerField] || ownerId,
                  websiteId: data.websiteId || null,
                  type: 'customer_payment',
                  status: (data.status && String(data.status).toLowerCase().includes('active')) ? 'active' : 'disabled',
                  returnUrl: data.returnUrl || undefined,
                  label: label || 'Service link',
                };
                // Filter by current website if needed
                if (!includeAll && currentWebsiteId && pl.websiteId && pl.websiteId !== currentWebsiteId) {
                  return;
                }
                // Merge unique by URL
                if (!rows.find((r) => r.url === pl.url)) {
                  rows.push(pl);
                  mergedCount++;
                }
              });
            }
          } catch (inner) {
            console.warn(`ℹ️ services fetch failed for ${coll}:`, inner);
          }
        }
        console.log(`✅ Merged ${mergedCount} payment link(s) from services`);
      } catch (e) {
        console.warn('ℹ️ services collection fetch skipped/failed:', e);
      }

      setUserLinks(rows);
      console.log('📄 Total selectable links:', rows.length, rows.map(r=>({label:r.label, url:r.url, websiteId:r.websiteId}))); 
      return rows;
    } catch (e) {
      console.error('❌ Failed to fetch user links:', e);
      setUserLinks([]);
      return [] as PaymentLinkRecord[];
    } finally {
      setLinksLoading(false);
    }
  };

  // Open payment link picker
  const openLinkPicker = async () => {
    if (!editor) {
      alert('Editor not ready yet.');
      return;
    }
    if (!userId) {
      alert('Please sign in again.');
      return;
    }
    await fetchUserLinks(userId, websiteId, showAllUserLinks);
    setIsLinkPickerOpen(true);
  };

  const closeLinkPicker = () => setIsLinkPickerOpen(false);

  // Attach a selected link to current component
  const attachPaymentLinkToSelected = (link: PaymentLinkRecord) => {
    if (!editor) return;
    const selected = editor.getSelected();
    if (!selected) {
      alert('Select a button or link first.');
      return;
    }

    // Always normalize PayFast URLs to include the correct redirect
    let finalUrl = link.url;
    if (link.type === 'customer_payment' && link.url.includes('payfast.co.za')) {
      finalUrl = normalizeCustomerPayfastUrl(link.url);
      console.log('🔗 Normalized PayFast URL:', {
        original: link.url,
        normalized: finalUrl,
        userId,
        websiteId,
        publishedUrl
      });
    }

    const type = selected.get('type');
    if (type === 'link' || selected.view?.el?.tagName === 'A') {
      selected.addAttributes({ href: finalUrl, target: '_blank', 'data-link-id': link.id, 'data-link-type': link.type });
      selected.addClass('payment-link');
      editor.Modal && editor.Modal.close && editor.Modal.close();
      setIsLinkPickerOpen(false);
      return;
    }
    // Buttons: use data-href and click handler already injected
    if (type === 'button' || selected.view?.el?.tagName === 'BUTTON') {
      selected.addAttributes({ 'data-href': finalUrl, 'data-link-id': link.id, 'data-link-type': link.type });
      selected.addClass('payment-button');
      setIsLinkPickerOpen(false);
      return;
    }
    alert('Selected element is not a button or link.');
  };

  // Heuristic to detect platform subscription links we must NOT allow on public websites
  const isPlatformSubscriptionUrl = (url: string): boolean => {
    try {
      const u = String(url || '').toLowerCase();
      // Block our subscribe endpoint and explicit subscription markers
      if (u.includes('/api/payfast/subscribe')) return true;
      if (u.includes('custom_str3=subscription')) return true;
      // Common success page paths of the platform
      if (u.includes('/dashboard/payments/success')) return true;
      // Sandbox/PayFast direct links are allowed; only block when parameters clearly indicate platform subscription
      return false;
    } catch (_) {
      return false;
    }
  };

  // Normalize PayFast customer links to store referrer URL for redirecting back to the page
  const normalizeCustomerPayfastUrl = (url: string): string => {
    try {
      const u = new URL(url);
      const params = u.searchParams;
      
      // Store the current page URL as referrer (custom_str4) - this works for ALL phases!
      // This allows customers to be redirected back to the exact page they came from,
      // whether it's a published site, draft preview, or editor preview
      const currentPageUrl = window.location.href;
      params.set('custom_str4', currentPageUrl);
      console.log('✅ Added custom_str4 (referrer URL) to PayFast URL:', currentPageUrl);
      
      // Also store in sessionStorage as backup for old links or if PayFast doesn't preserve custom_str4
      try {
        sessionStorage.setItem('payment_referrer', currentPageUrl);
        console.log('✅ Stored referrer in sessionStorage as backup');
      } catch (e) {
        console.warn('⚠️ Could not store referrer in sessionStorage:', e);
      }
      
      // Ensure we are not marking it as subscription (check before setting custom_str3)
      // Remove any existing 'subscription' value first
      if (params.get('custom_str3') === 'subscription') {
        params.delete('custom_str3');
      }
      
      // Also add websiteId to custom_str3 as backup (only if not 'subscription')
      if (websiteId && userId && websiteId !== 'subscription') {
        params.set('custom_str3', websiteId);
        console.log('✅ Added custom_str3 (websiteId) to PayFast URL:', websiteId);
      } else if (!websiteId || !userId) {
        console.warn('⚠️ No websiteId available, payment-redirect API will use fallback lookup');
      } else if (websiteId === 'subscription') {
        console.warn('⚠️ websiteId is "subscription", skipping custom_str3 to avoid confusion');
      }
      
      // Use client-side redirect page for better referrer handling (works for old links too!)
      const redirectPageUrl = `${window.location.origin}/payment-redirect`;
      params.set('return_url', redirectPageUrl);
      params.set('cancel_url', redirectPageUrl);
      
      u.search = params.toString();
      console.log('🔗 Normalized PayFast URL with referrer for redirect:', u.toString());
      return u.toString();
    } catch (error) {
      console.error('❌ Error normalizing PayFast URL:', error);
      return url;
    }
  };

  // Validate raw URL pasted into traits and auto-bind if it matches an owned link
  const resolveAndBindUrlIfOwned = async (url: string) => {
    try {
      if (!userId || !editor) return;
      if (!/^https?:\/\//i.test(url)) return; // only validate http(s)
      const q = query(
        collection(db, 'links'),
        where('ownerUserId', '==', userId),
        where('url', '==', url)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        // Not found in registry; still block obvious platform subscription URLs
        if (isPlatformSubscriptionUrl(url)) {
          alert('This URL is for platform subscriptions and cannot be used on your website buttons. Use a customer payment link instead.');
        }
        return; // allow as plain external otherwise
      }
      const docSnap = snap.docs[0];
      const link = { id: docSnap.id, ...(docSnap.data() as any) } as PaymentLinkRecord;
      if (link.type === 'platform_subscription') {
        alert('This link is a platform subscription link and cannot be used inside your public website. Please select a customer payment link.');
        // Attempt to clear selection attribute to avoid misbinding
        const sel = editor.getSelected();
        if (sel) {
          if (sel.get('type') === 'link' || sel.view?.el?.tagName === 'A') {
            sel.addAttributes({ href: '' });
          } else if (sel.get('type') === 'button' || sel.view?.el?.tagName === 'BUTTON') {
            sel.addAttributes({ 'data-href': '' });
          }
        }
        return;
      }
      // Bind to selected component (also guard by heuristic)
      if (isPlatformSubscriptionUrl(link.url)) {
        alert('This URL looks like a platform subscription link and cannot be used on your website buttons.');
        return;
      }
      const finalUrl = normalizeCustomerPayfastUrl(link.url);
      attachPaymentLinkToSelected({ ...link, url: finalUrl });
    } catch (e) {
      console.warn('URL validation failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading GrapesJS Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Safe GrapesJS UI Theme - Only targets GrapesJS UI, not template content */}
      {/* Using regular style tag instead of jsx to ensure styles persist on refresh */}
      <style dangerouslySetInnerHTML={{__html: `
        /* ============================================
           SAFE GRAPESJS UI CUSTOMIZATION
           These styles ONLY affect GrapesJS UI elements,
           NOT the template content in the canvas
           ============================================ */
        
        /* Main GrapesJS color variables */
        .gjs-one-bg {
          background-color: #1f2937 !important; /* gray-800 - main panel background */
        }
        
        .gjs-two-color {
          color: #f9fafb !important; /* gray-50 - main text color */
        }
        
        .gjs-three-bg {
          background-color: #374151 !important; /* gray-700 - secondary background */
          color: #f9fafb !important;
        }
        
        .gjs-four-color,
        .gjs-four-color-h:hover {
          color: #3b82f6 !important; /* blue-500 - accent color */
        }
        
        /* Panel titles and headers */
        .gjs-pn-panel .gjs-pn-title {
          background-color: #374151 !important; /* gray-700 */
          color: #f9fafb !important;
          border-bottom: 1px solid #4b5563 !important; /* gray-600 */
        }
        
        /* Buttons in panels */
        .gjs-pn-btn {
          background-color: #374151 !important; /* gray-700 */
          color: #f9fafb !important;
          border-color: #4b5563 !important; /* gray-600 */
        }
        
        .gjs-pn-btn:hover {
          background-color: #4b5563 !important; /* gray-600 */
        }
        
        .gjs-pn-btn.gjs-pn-active {
          background-color: #3b82f6 !important; /* blue-500 */
          color: white !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
        }
        
        /* Blocks panel */
        .gjs-blocks-cs {
          background-color: #1f2937 !important; /* gray-800 */
        }
        
        .gjs-block {
          background-color: #374151 !important; /* gray-700 */
          color: #f9fafb !important;
          border: 1px solid #4b5563 !important; /* gray-600 */
        }
        
        .gjs-block:hover {
          background-color: #4b5563 !important; /* gray-600 */
        }
        
        /* Layers panel */
        .gjs-layers {
          background-color: #1f2937 !important; /* gray-800 */
        }
        
        .gjs-layer {
          color: #f9fafb !important;
        }
        
        .gjs-layer:hover {
          background-color: #374151 !important; /* gray-700 */
        }
        
        .gjs-layer.gjs-selected {
          background-color: #3b82f6 !important; /* blue-500 */
          color: white !important;
        }
        
        /* Style Manager */
        .gjs-sm-sectors {
          background-color: #1f2937 !important; /* gray-800 */
        }
        
        .gjs-sm-sector .gjs-sm-title {
          background-color: #374151 !important; /* gray-700 */
          color: #f9fafb !important;
          border-bottom: 1px solid #4b5563 !important; /* gray-600 */
        }
        
        .gjs-sm-property {
          background-color: #1f2937 !important; /* gray-800 */
          color: #f9fafb !important;
        }
        
        .gjs-sm-property:hover {
          background-color: #374151 !important; /* gray-700 */
        }
        
        .gjs-sm-label {
          color: #d1d5db !important; /* gray-300 */
        }
        
        /* Input fields in Style Manager and Traits */
        .gjs-sm-properties input,
        .gjs-sm-properties select,
        .gjs-trt-traits input,
        .gjs-trt-traits select {
          background-color: #374151 !important; /* gray-700 */
          border-color: #4b5563 !important; /* gray-600 */
          color: #f9fafb !important;
        }
        
        .gjs-sm-properties input:focus,
        .gjs-sm-properties select:focus,
        .gjs-trt-traits input:focus,
        .gjs-trt-traits select:focus {
          border-color: #3b82f6 !important; /* blue-500 */
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }
        
        /* Trait Manager */
        .gjs-trt-traits {
          background-color: #1f2937 !important; /* gray-800 */
        }
        
        .gjs-trt-trait {
          color: #f9fafb !important;
        }
        
        .gjs-trt-trait__label {
          color: #d1d5db !important; /* gray-300 */
        }
        
        /* Selected element highlight (the blue outline around selected elements) */
        .gjs-selected {
          outline: 2px solid #3b82f6 !important; /* blue-500 */
        }
        
        /* Toolbar that appears when you select an element */
        .gjs-toolbar {
          background-color: #374151 !important; /* gray-700 */
          border: 1px solid #4b5563 !important; /* gray-600 */
        }
        
        .gjs-toolbar .gjs-toolbar-item {
          color: #f9fafb !important;
        }
        
        .gjs-toolbar .gjs-toolbar-item:hover {
          background-color: #4b5563 !important; /* gray-600 */
        }
        
        /* Device manager buttons (Desktop/Mobile toggle) */
        .gjs-pn-devices-c {
          background-color: #374151 !important; /* gray-700 */
        }
        
        /* Canvas background (the area around the template) */
        .gjs-cv-canvas {
          background-color: #111827 !important; /* gray-900 */
        }
        
        /* IMPORTANT: Do NOT style anything inside the frame */
        /* The .gjs-frame contains the actual template content */
        /* We intentionally leave it unstyled so template CSS works */
      `}} />
      
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Top Bar - Matching Dashboard Style */}
        <div className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
          <button
            onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-orange-600 flex items-center space-x-2 transition-colors font-medium"
          >
              <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="text-gray-900 font-semibold text-lg">
            {templateData?.name || 'Template Editor'}
          </div>
        </div>
        
          <div className="flex items-center gap-3">
          {/* Device Switcher */}
          <div className="panel__devices"></div>
          
          {/* Actions */}
          <button
            onClick={handlePreview}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2 shadow-sm hover:shadow"
          >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
          </button>
          
          {/* Select Payment Link */}
          <button
            onClick={openLinkPicker}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center space-x-2 shadow-sm hover:shadow"
            title="Attach a payment link to the selected element"
          >
              <Link2 className="h-4 w-4" />
              <span>Select Payment Link</span>
          </button>
          
          {/* Add Calendar - Business Tier Only */}
          {hasBusinessAccess && (
            <button
              onClick={() => {
                if (!editor) return;
                addCalendarComponent();
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              title="Add booking calendar to your website"
            >
              <Calendar className="h-4 w-4" />
              <span>Add Calendar</span>
            </button>
            )}
          
          {/* Add Classes - Tutor Only */}
          {isTutor && (
            <button
              onClick={() => {
                if (!editor) return;
                addClassesComponent();
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center space-x-2 shadow-sm hover:shadow"
              title="Add classes orbit animation to your website"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Add Classes</span>
            </button>
          )}
          
          <button
            onClick={handleExport}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium flex items-center space-x-2 shadow-sm hover:shadow"
          >
              <Download className="h-4 w-4" />
              <span>Export Files</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
              className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

        {/* GrapesJS Editor */}
        <div className="flex-1 relative bg-gray-50">
          <div ref={editorRef} className="h-full" />
        </div>
      </div>

      {/* Payment Link Picker Modal */}
      {isLinkPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeLinkPicker}></div>
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-3xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold text-lg">Select Payment Link</div>
              <button onClick={closeLinkPicker} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  value={linkSearch}
                  onChange={(e)=>setLinkSearch(e.target.value)}
                  placeholder="Search by label or URL..."
                  className="flex-1 px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <label className="flex items-center gap-2 text-gray-700 text-sm">
                  <input type="checkbox" checked={showAllUserLinks} onChange={async (e)=>{ setShowAllUserLinks(e.target.checked); if (userId) { await fetchUserLinks(userId, websiteId, e.target.checked); } }} />
                  Show all my links
                </label>
                <button
                  onClick={async ()=>{ if (userId) await fetchUserLinks(userId, websiteId, showAllUserLinks); }}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Refresh
                </button>
              </div>
              <div className="max-h-80 overflow-auto border border-gray-200 rounded-xl">
                {linksLoading ? (
                  <div className="p-6 text-center text-gray-500">Loading links…</div>
                ) : userLinks.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No payment links found for this website. Create one in your Link Generator and refresh.</div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {userLinks.filter(l=>{
                      const s = linkSearch.trim().toLowerCase();
                      if (!s) return true;
                      return (l.label||'').toLowerCase().includes(s) || (l.url||'').toLowerCase().includes(s);
                    }).map(link => (
                      <li key={link.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 font-medium truncate">{link.label || link.id}</div>
                          <div className="text-xs text-gray-500 truncate mt-1">{link.url}</div>
                          <div className="text-xs text-gray-400 mt-1">type: {link.type} · status: {link.status || 'active'}</div>
                        </div>
                        <button
                          onClick={()=>attachPaymentLinkToSelected(link)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium ml-4 flex-shrink-0"
                        >
                          Use this link
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 px-4 py-3 rounded-lg">
                Tip: After selecting a link, it will be bound to the selected button/link. Payment links open in a new tab by default.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classes Selection Modal - Tutor Only */}
      {showClassesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowClassesModal(false); setSelectedClassIds([]); }}></div>
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 font-semibold text-lg flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-orange-600" />
                <span>Select Classes for Orbit Animation</span>
              </div>
              <button 
                onClick={() => { setShowClassesModal(false); setSelectedClassIds([]); }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {tutorClasses.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No classes available.</p>
                  <p className="text-sm text-gray-500">Please create classes first in the Tutor Dashboard.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Select the classes you want to display in the orbit animation. You can select multiple classes.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tutorClasses.map((classItem: any) => {
                      const isSelected = selectedClassIds.includes(classItem.id);
                      return (
                        <div
                          key={classItem.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClassIds(prev => prev.filter(id => id !== classItem.id));
                            } else {
                              setSelectedClassIds(prev => [...prev, classItem.id]);
                            }
                          }}
                          className={`border-2 rounded-xl cursor-pointer transition-all overflow-hidden ${
                            isSelected
                              ? 'border-orange-500 shadow-lg'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                          }`}
                        >
                          {/* Cover Image or Color Background */}
                          {classItem.coverImageUrl ? (
                            <>
                              <div className="relative h-32 w-full overflow-hidden">
                                <img
                                  src={classItem.coverImageUrl}
                                  alt={classItem.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                  <h3 className="font-bold text-base mb-1 drop-shadow-lg">{classItem.name}</h3>
                                  {classItem.description && (
                                    <p className="text-xs opacity-95 line-clamp-1 drop-shadow-md">{classItem.description}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-orange-500 rounded-full p-1">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div 
                              className="relative p-4"
                              style={{ backgroundColor: classItem.color || '#f59e0b' }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg text-white mb-1">{classItem.name}</h3>
                                  {classItem.description && (
                                    <p className="text-sm text-white/90 line-clamp-1">{classItem.description}</p>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="bg-white rounded-full p-1 ml-2">
                                    <Check className="h-3 w-3 text-orange-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedClassIds.length > 0 && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        <strong>{selectedClassIds.length}</strong> {selectedClassIds.length === 1 ? 'class' : 'classes'} selected
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => { setShowClassesModal(false); setSelectedClassIds([]); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedClasses}
                disabled={selectedClassIds.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Add Selected Classes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank‑You URL helper bar (shows when a link/button is selected) */}
      {showThankYouHelper && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Return URL to use in your payment provider:</span>
            <code className="text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 select-all text-gray-900 font-mono">{`${typeof window !== 'undefined' ? window.location.origin : ''}/thank-you`}</code>
            <button
              className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              onClick={() => {
                const text = `${window.location.origin}/thank-you`;
                navigator.clipboard.writeText(text);
              }}
            >Copy</button>
            <button
              className="text-xs px-3 py-1.5 bg-transparent text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => setShowThankYouHelper(false)}
            >Hide</button>
          </div>
        </div>
      )}
    </>
  );
}

