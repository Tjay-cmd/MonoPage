'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import JSZip from 'jszip';
import { 
  ArrowLeft,
  Save,
  Eye,
  Download,
  Palette,
  Type,
  Image,
  Settings,
  RotateCcw,
  Monitor,
  XCircle,
  Plus,
  RefreshCw,
  List,
  Trash2
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  previewImage: string;
  editableElements: EditableElement[];
}

interface EditableElement {
  id: string;
  type: 'text' | 'color' | 'image' | 'font';
  label: string;
  selector: string;
  defaultValue?: string;
}

interface Customization {
  [key: string]: string;
}

export default function CustomizeTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [customizations, setCustomizations] = useState<Customization>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editableElements, setEditableElements] = useState<any[]>([]); // Parsed editable elements
  const [selectedElement, setSelectedElement] = useState<any>(null); // Currently selected element for editing
  const [showEditModal, setShowEditModal] = useState(false); // Show/hide edit modal
  const [tempCustomizations, setTempCustomizations] = useState<Customization>({}); // Temporary changes before "Done"
  const [committedValues, setCommittedValues] = useState<Customization>({}); // Saved values for each element
  
  // Service Management
  const [serviceBlocks, setServiceBlocks] = useState<any>(null); // Detected service cards
  const [userServices, setUserServices] = useState<any[]>([]); // PayFast services
  const [servicesSynced, setServicesSynced] = useState(false); // Sync status
  const [showServiceManager, setShowServiceManager] = useState(false); // Service manager modal
  const [selectedService, setSelectedService] = useState<any>(null); // Service being edited
  const [showServiceEditor, setShowServiceEditor] = useState(false); // Service editor modal

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchTemplate();
        await loadSavedCustomizations();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, templateId]);

  // Re-add click handlers when template content changes
  useEffect(() => {
    if (templateContent && editableElements.length > 0) {
      // Try multiple times with increasing delays
      const retrySetup = (attempt: number = 1) => {
        setTimeout(() => {
          console.log(`Attempt ${attempt} to setup click handlers`);
          addClickHandlersToPreview();
          
          // If still not working after 5 attempts, try again
          if (attempt < 5) {
            retrySetup(attempt + 1);
          }
        }, attempt * 1000);
      };
      
      retrySetup();
    }
  }, [templateContent, editableElements]);

  // Apply loaded customizations to the live iframe
  useEffect(() => {
    if (Object.keys(committedValues).length > 0 && templateContent) {
      console.log('Applying loaded customizations to live iframe:', committedValues);
      
      // Wait for iframe to be ready and click handlers to be set up
      setTimeout(() => {
        const iframe = document.querySelector('iframe[title="Template Edit View"]') as HTMLIFrameElement;
        if (iframe && iframe.contentDocument) {
          const doc = iframe.contentDocument;
          
          // Apply all committed customizations to the live iframe
          Object.entries(committedValues).forEach(([key, value]) => {
            console.log('Applying to live iframe:', key, '=', value);
            
            // Parse the key to get element info
            let parts = key.split('-');
            let index: string = parts[parts.length - 1]; // Last part is always the index
            let property: string | undefined;
            let elementId: string;
            
            // Special handling for different element types
            if (key.startsWith('bg-ctrl-')) {
              // For bg-ctrl-home-gradient-start: elementId='bg-ctrl-home', property='gradient', index='start'
              // For bg-ctrl-home-0: elementId='bg-ctrl-home', property=undefined, index='0'
              // For bg-ctrl-home-bgType: elementId='bg-ctrl-home', property='bgType', index=undefined
              const bgParts = key.split('-');
              const lastPart = bgParts[bgParts.length - 1];
              
              // Check if last part is an index (number), a property (string), or neither
              if (!isNaN(parseInt(lastPart)) && lastPart === parseInt(lastPart).toString()) {
                // It's a pure number: bg-ctrl-home-0 → elementId='bg-ctrl-home', index='0', property=undefined
                index = bgParts.pop() || '';
                elementId = bgParts.join('-');
                property = undefined;
              } else if (lastPart === 'bgType' || lastPart === 'start' || lastPart === 'end') {
                // It's part of a property: bg-ctrl-home-gradient-start
                index = bgParts.pop() || ''; // 'start'
                property = bgParts.pop(); // 'gradient'
                elementId = bgParts.join('-'); // 'bg-ctrl-home'
              } else {
                // Default: treat as property without index (bg-ctrl-home-bgType)
                property = bgParts.pop();
                elementId = bgParts.join('-');
                index = '';
              }
            } else if (key.startsWith('text-')) {
              // For text-93-1, we have: elementId-index (NO property for text content)
              // For text-93-0-color, we have: elementId-index-property
              const textParts = key.split('-');
              const lastPart = textParts[textParts.length - 1];
              
              // Check if last part is a property (color, font-size, etc.) or an index (number)
              if (isNaN(parseInt(lastPart))) {
                // It's a property: text-93-0-color → elementId='text-93', index='0', property='color'
                property = textParts.pop(); // 'color'
                index = textParts.pop() || ''; // '0'
                elementId = textParts.join('-'); // 'text-93'
              } else {
                // It's just an index: text-93-1 → elementId='text-93', index='1', property=undefined
                index = textParts.pop() || ''; // '1'
                elementId = textParts.join('-'); // 'text-93'
                property = undefined;
              }
            } else if (key.startsWith('img-')) {
              // For img-7-0, we have: elementId-index (similar to text)
              const imgParts = key.split('-');
              index = imgParts.pop() || ''; // '0'
              elementId = imgParts.join('-'); // 'img-7'
              property = undefined;
            } else if (key.startsWith('button-link-ctrl-')) {
              // For button-link-ctrl-btn-primary-0-bg-color, we have: elementId-property-subproperty
              // E.g., 'button-link-ctrl-btn-primary-0-bg-color' → elementId='button-link-ctrl-btn-primary-0', property='bg', index='color'
              parts = key.split('-');
              index = parts.pop() || ''; // 'color'
              property = parts.pop(); // 'bg'
              elementId = parts.join('-'); // 'button-link-ctrl-btn-primary-0'
            } else {
              // Default parsing
              index = parts.pop() || '';
              property = parts.pop();
              elementId = parts.join('-');
            }
            
            // Find the element using multiple strategies
            let element = null;
            
            // Special handling for background elements (bg-ctrl-*)
            if (elementId.startsWith('bg-ctrl-')) {
              // For bg-ctrl-home, we want to find the element with data-bg-id="bg-ctrl-home"
              element = doc.querySelector(`[data-bg-id="${elementId}"]`);
              console.log('Looking for background element with data-bg-id:', elementId, 'Found:', !!element);
            }
            // Special handling for text elements (text-*)
            else if (elementId.startsWith('text-')) {
              // For text-93-1, we want to find the element with data-element-id="text-93" and data-element-index="1"
              if (index && !isNaN(parseInt(index))) {
                element = doc.querySelector(`[data-element-id="${elementId}"][data-element-index="${index}"]`);
                console.log('Looking for text element with data-element-id:', elementId, 'index:', index, 'Found:', !!element);
              } else {
                element = doc.querySelector(`[data-element-id="${elementId}"]`);
                console.log('Looking for text element with data-element-id:', elementId, 'Found:', !!element);
              }
            }
            // Special handling for image elements (img-*)
            else if (elementId.startsWith('img-')) {
              // For img-7-0, we want to find the element with data-element-id="img-7" and data-element-index="0"
              if (index && !isNaN(parseInt(index))) {
                element = doc.querySelector(`[data-element-id="${elementId}"][data-element-index="${index}"]`);
                console.log('Looking for image element with data-element-id:', elementId, 'index:', index, 'Found:', !!element);
              } else {
                element = doc.querySelector(`[data-element-id="${elementId}"]`);
                console.log('Looking for image element with data-element-id:', elementId, 'Found:', !!element);
              }
            }
            // Special handling for button-link-ctrl elements
            else if (elementId.startsWith('button-link-ctrl-')) {
              // Extract the stable identifier and remove trailing index
              let identifier = elementId.replace('button-link-ctrl-', '');
              
              // Remove trailing -<number> (the index)
              identifier = identifier.replace(/-\d+$/, '');
              
              // Try to find button by various attributes (skip if identifier starts with number)
              if (!/^\d/.test(identifier)) {
                try {
                  element = doc.querySelector(`button#${identifier}, a#${identifier}`);
                } catch (e) {
                  console.log('Invalid selector for ID:', identifier);
                }
              }
              
              if (!element && !/^\d/.test(identifier)) {
                try {
                  element = doc.querySelector(`button.${identifier}, a.${identifier}`);
                } catch (e) {
                  console.log('Invalid selector for class:', identifier);
                }
              }
              
              if (!element) {
                const textToFind = identifier.replace(/-/g, ' ').replace(/^\d+\s*/, ''); // Remove leading numbers
                const buttons = doc.querySelectorAll('button, a.btn, a.button, a[class*="btn"]');
                for (const btn of Array.from(buttons)) {
                  const btnText = btn.textContent?.trim().toLowerCase();
                  if (btnText && (btnText === textToFind || btnText.includes(textToFind) || textToFind.includes(btnText))) {
                    element = btn as HTMLElement;
                    break;
                  }
                }
              }
            } else {
              // Normal element finding
              if (index) {
                element = doc.querySelector(`[data-element-id="${elementId}"][data-element-index="${index}"]`);
              }
              
              if (!element) {
                element = doc.querySelector(`#${elementId}`);
              }
              
              if (!element) {
                element = doc.querySelector(`.${elementId}`);
              }
              
              if (!element) {
                element = doc.querySelector(`[data-element-id="${elementId}"]`);
              }
            }
            
            if (element) {
              console.log('Found element in live iframe:', element.tagName);
              
              if (property === 'text' || !property) {
                element.textContent = value;
              } else if (property === 'color') {
                element.style.color = value;
              } else if (property === 'bg' || property === 'bg-color') {
                element.style.setProperty('background-color', value, 'important');
                element.style.setProperty('--base-color', value, 'important');
                console.log('Applied bg-color:', value, 'to element:', element.tagName);
              } else if (property === 'hover' || property === 'hover-color') {
                element.style.setProperty('--hover-color', value, 'important');
                console.log('Applied hover-color:', value, 'to element:', element.tagName);
              } else if (property === 'link') {
                element.setAttribute('data-href', value);
              } else if (property === 'background' || property === 'background-color') {
                element.style.backgroundColor = value;
              } else if (property === 'background-image' || property === 'backgroundImage') {
                element.style.backgroundImage = value;
              } else if (property === 'color') {
                const hexValue = rgbToHex(value);
                element.style.color = hexValue;
              } else if (property === 'font-size') {
                element.style.fontSize = value + 'px';
              } else if (property === 'font-weight') {
                element.style.fontWeight = value;
              } else if (property === 'font-style') {
                element.style.fontStyle = value;
              } else if (property === 'text-decoration') {
                element.style.textDecoration = value;
              } else if (index === '0' && !property) {
                // Handle text content (text-6-0)
                element.textContent = value;
              } else if (property === 'gradient' && index === 'start') {
                // Handle gradient start color
                const endColor = committedValues[`${elementId}-gradient-end`];
                if (endColor) {
                  element.style.background = `linear-gradient(135deg, ${value}, ${endColor})`;
                }
              } else if (property === 'gradient' && index === 'end') {
                // Handle gradient end color
                const startColor = committedValues[`${elementId}-gradient-start`];
                if (startColor) {
                  element.style.background = `linear-gradient(135deg, ${startColor}, ${value})`;
                }
              } else if (property === 'bgType' && value === 'gradient') {
                // Apply gradient if both colors are available
                const startColor = committedValues[`${elementId}-gradient-start`];
                const endColor = committedValues[`${elementId}-gradient-end`];
                if (startColor && endColor) {
                  element.style.background = `linear-gradient(135deg, ${startColor}, ${endColor})`;
                }
              } else if (property === 'bgType' && value === 'solid') {
                // Apply solid color
                const solidColor = committedValues[`${elementId}-0`];
                if (solidColor) {
                  element.style.background = solidColor;
                }
              } else if (index === '0' && !property) {
                // Handle solid background color (bg-ctrl-home-0)
                element.style.background = value;
              }
            }
          });
          
          console.log('✅ Applied all customizations to live iframe');
          
          // After applying customizations, try to detect service blocks again
          if (userServices.length > 0) {
            console.log('Re-detecting service blocks after applying customizations...');
            detectServiceBlocks(doc);
          }
        }
      }, 2000); // Increased delay to ensure everything is ready
    }
  }, [committedValues, templateContent, userServices]);
  

  const fetchTemplate = async () => {
    try {
      const templateDoc = await getDoc(doc(db, 'templates', templateId));
      if (templateDoc.exists()) {
        const templateData = { id: templateDoc.id, ...templateDoc.data() } as Template;
        setTemplate(templateData);
        
        // Initialize customizations with default values
        const initialCustomizations: Customization = {};
        templateData.editableElements?.forEach(element => {
          initialCustomizations[element.id] = element.defaultValue || '';
        });
        setCustomizations(initialCustomizations);
        
        // Load template content
        await loadTemplateContent(templateData);
      } else {
        router.push('/dashboard/templates');
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    }
  };

  const loadSavedCustomizations = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !templateId) return;
    
    try {
      console.log('Loading saved customizations for template:', templateId);
      
      // Check if there's a websiteId in the URL (for editing existing website)
      const urlParams = new URLSearchParams(window.location.search);
      const websiteId = urlParams.get('websiteId');
      
      console.log('═══════════════════════════════════════════════');
      console.log('🔄 LOADING SAVED CUSTOMIZATIONS ON PAGE LOAD');
      console.log('═══════════════════════════════════════════════');
      console.log('👤 Current User:', currentUser.uid);
      console.log('📋 Template ID:', templateId);
      
      if (websiteId) {
        // Load specific website
        console.log('🔍 Loading specific website from URL:', websiteId);
        const websiteDoc = await getDoc(doc(db, 'userWebsites', websiteId));
        if (websiteDoc.exists()) {
          const websiteData = websiteDoc.data();
          console.log('✅ Website document found');
          console.log('📊 customizations count:', Object.keys(websiteData.customizations || {}).length);
          console.log('📊 savedContent length:', websiteData.savedContent?.length || 0);
          console.log('📊 updatedAt:', websiteData.updatedAt);
          console.log('📄 Sample customizations:', Object.entries(websiteData.customizations || {}).slice(0, 5));
          
          if (websiteData.customizations) {
            setCommittedValues(websiteData.customizations);
            console.log('✅ Loaded saved customizations into committedValues');
          } else {
            console.log('⚠️ No customizations found in website document');
          }
          
          // Update URL to include websiteId if not already there
          if (!window.location.search.includes('websiteId')) {
            window.history.replaceState(null, '', `?websiteId=${websiteId}`);
            console.log('🔗 URL updated with websiteId');
          }
        } else {
          console.log('❌ Website document not found for ID:', websiteId);
        }
      } else {
        // Load the most recent website for this template
        console.log('🔍 No URL websiteId, querying for latest website...');
        const websitesRef = collection(db, 'userWebsites');
        const q = query(
          websitesRef,
          where('userId', '==', currentUser.uid),
          where('templateId', '==', templateId)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('🔍 Query results:', querySnapshot.size, 'websites found');
        if (!querySnapshot.empty) {
          // Sort by updatedAt manually (most recent first)
          const websites = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          
          const latestWebsite = websites[0];
          console.log('✅ Found latest website:', latestWebsite.id);
          console.log('📊 customizations count:', Object.keys(latestWebsite.customizations || {}).length);
          console.log('📊 savedContent length:', latestWebsite.savedContent?.length || 0);
          console.log('📊 updatedAt:', latestWebsite.updatedAt);
          console.log('📄 Sample customizations:', Object.entries(latestWebsite.customizations || {}).slice(0, 5));
          
          if (latestWebsite.customizations) {
            setCommittedValues(latestWebsite.customizations);
            console.log('✅ Loaded latest customizations into committedValues');
          } else {
            console.log('⚠️ No customizations found in latest website');
          }
          
          // Update URL to include websiteId for future saves
          if (latestWebsite.id) {
            window.history.replaceState(null, '', `?websiteId=${latestWebsite.id}`);
            console.log('🔗 URL updated with websiteId:', latestWebsite.id);
          }
        } else {
          console.log('📝 No existing websites found for this template');
        }
      }
      console.log('═══════════════════════════════════════════════');
      console.log('✅ LOAD CUSTOMIZATIONS COMPLETED');
      console.log('═══════════════════════════════════════════════');
    } catch (error) {
      console.error('Error loading saved customizations:', error);
    }
  };

  const loadTemplateContent = async (templateData: Template) => {
    try {
      console.log('Loading template content for:', templateData);
      
      // Get the ZIP file URL from the template data
      const zipUrl = (templateData as any).zipUrl || (templateData as any).downloadURL;
      if (!zipUrl) {
        console.error('No ZIP URL found in template data');
        console.log('Available template data:', templateData);
        setTemplateContent(`
          <div style="padding: 20px; text-align: center; color: #666;">
            <h3>Template not found</h3>
            <p>Unable to load template content. Please check if the template was uploaded correctly.</p>
            <p>Available data: ${JSON.stringify(templateData, null, 2)}</p>
          </div>
        `);
        return;
      }

      console.log('ZIP URL:', zipUrl);
      
      // Fetch the template ZIP directly from Firebase Storage
      console.log('Fetching template ZIP directly from storage...');
      const response = await fetch(zipUrl);
      console.log('ZIP fetch response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template ZIP: ${response.status} ${response.statusText}`);
      }
      
      const zipBlob = await response.blob();
      console.log('ZIP file loaded, size:', zipBlob.size);
      
      // Extract the ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipBlob);
      
      console.log('ZIP files:', Object.keys(zipContent.files));
      
      // Look for index.html or the main HTML file
      let htmlFile = zipContent.file('index.html');
      if (!htmlFile) {
        // Look for any HTML file
        const htmlFiles = Object.keys(zipContent.files).filter(name => name.endsWith('.html'));
        if (htmlFiles.length > 0) {
          htmlFile = zipContent.file(htmlFiles[0]);
        }
      }
      
      if (!htmlFile) {
        throw new Error('No HTML file found in the template ZIP');
      }
      
      // Get the HTML content
      const htmlContent = await htmlFile.async('text');
      console.log('HTML content loaded, length:', htmlContent.length);
      
      // Look for CSS files and inline them
      let cssContent = '';
      const cssFiles = Object.keys(zipContent.files).filter(name => name.endsWith('.css'));
      for (const cssFile of cssFiles) {
        const css = zipContent.file(cssFile);
        if (css) {
          const cssText = await css.async('text');
          cssContent += `\n<style>\n${cssText}\n</style>\n`;
        }
      }
      
      // Look for JS files and inline them
      let jsContent = '';
      const jsFiles = Object.keys(zipContent.files).filter(name => name.endsWith('.js'));
      for (const jsFile of jsFiles) {
        const js = zipContent.file(jsFile);
        if (js) {
          const jsText = await js.async('text');
          jsContent += `\n<script>\n${jsText}\n</script>\n`;
        }
      }
      
      // Process images and convert them to data URLs
      let processedHtml = htmlContent;
      
      // Find all image files in the ZIP
      const imageFiles = Object.keys(zipContent.files).filter(name => 
        name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || 
        name.endsWith('.gif') || name.endsWith('.svg') || name.endsWith('.webp')
      );
      
      console.log('Found image files:', imageFiles);
      
      for (const imageFile of imageFiles) {
        const image = zipContent.file(imageFile);
        if (image) {
          try {
            const imageBlob = await image.async('blob');
            const arrayBuffer = await imageBlob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const imageDataUrl = `data:${imageBlob.type};base64,${base64}`;
            
            // Get the filename for replacement
            const imageName = imageFile.split('/').pop(); // Get just the filename
            const imagePath = `images/${imageName}`;
            const imagePathAlt = `./images/${imageName}`;
            const imagePathAlt2 = `../images/${imageName}`;
            
            console.log(`Converting image: ${imageName} to data URL`);
            
            // Replace all possible references to this image
            processedHtml = processedHtml.replace(new RegExp(imagePath, 'g'), imageDataUrl);
            processedHtml = processedHtml.replace(new RegExp(imagePathAlt, 'g'), imageDataUrl);
            processedHtml = processedHtml.replace(new RegExp(imagePathAlt2, 'g'), imageDataUrl);
            processedHtml = processedHtml.replace(new RegExp(imageName, 'g'), imageDataUrl);
          } catch (imageError) {
            console.warn(`Failed to process image ${imageFile}:`, imageError);
          }
        }
      }
      
      // Combine everything into a complete HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${templateData.name}</title>
          ${cssContent}
          <style id="edit-mode-styles">
            /* Edit Mode: Only add outlines to elements we specifically mark as editable */
            body.edit-mode [data-editable="true"] {
              outline: 2px dashed rgba(59, 130, 246, 0.5) !important;
              outline-offset: 2px !important;
              cursor: pointer !important;
            }
            
            /* Hover effect in edit mode - brighten the outline */
            body.edit-mode [data-editable="true"]:hover {
              outline: 2px dashed rgba(59, 130, 246, 0.9) !important;
              outline-offset: 2px !important;
            }
            
            /* Disable animations in edit mode to reduce distraction */
            body.edit-mode *,
            body.edit-mode *::before,
            body.edit-mode *::after {
              animation-duration: 0s !important;
              transition-duration: 0s !important;
            }
            
            /* Allow normal clicks on buttons and links in edit mode */
            body.edit-mode a,
            body.edit-mode button,
            body.edit-mode [onclick],
            body.edit-mode [href] {
              pointer-events: auto !important;
              cursor: pointer !important;
            }
            
            /* Button hover effects in edit mode */
            body.edit-mode button {
              transition: background-color 0.2s ease !important;
            }
            
            body.edit-mode button:hover {
              background-color: var(--hover-color, #2563eb) !important;
            }
            
            /* Ensure base color is always applied */
            body.edit-mode button:not(:hover) {
              background-color: var(--base-color, inherit) !important;
            }
            
            /* Button click handlers for links */
            body.edit-mode button[data-href] {
              cursor: pointer !important;
            }
            
            body.edit-mode button[data-href]:hover {
              opacity: 0.9 !important;
            }
            
            /* Preview Mode: Force remove ALL outlines and edit indicators */
            body:not(.edit-mode) * {
              outline: none !important;
              outline-offset: 0 !important;
              cursor: auto !important;
            }
            
            /* Preview Mode: Re-enable animations */
            body:not(.edit-mode) *,
            body:not(.edit-mode) *::before,
            body:not(.edit-mode) *::after {
              animation-duration: inherit !important;
              transition-duration: inherit !important;
            }
          </style>
        </head>
        <body class="edit-mode">
          ${processedHtml}
          ${jsContent}
        </body>
        </html>
      `;
      
      console.log('Full HTML generated, length:', fullHtml.length);
      setTemplateContent(fullHtml);
      
      // Parse the template to identify editable elements
      parseEditableElements(processedHtml);
      
      // Add click handlers to make elements editable
      setTimeout(() => {
        addClickHandlersToPreview();
      }, 2000); // Wait longer for iframe to load
      
    } catch (error) {
      console.error('Error loading template content:', error);
      setTemplateContent(`
        <div style="padding: 20px; text-align: center; color: #e74c3c;">
          <h3>Error Loading Template</h3>
          <p>Failed to load your uploaded template: ${error.message}</p>
          <p>Please check that your ZIP file contains an HTML file (index.html or similar).</p>
        </div>
      `);
    }
  };

  const parseEditableElements = (htmlContent: string) => {
    const elements: any[] = [];
    
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find text elements that can be edited
    const textElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button');
    textElements.forEach((element, index) => {
      const text = element.textContent?.trim();
      if (text && text.length > 0) {
        elements.push({
          id: `text-${index}`,
          type: 'text',
          selector: element.tagName.toLowerCase(),
          currentValue: text,
          label: `Text: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`,
          element: element
        });
      }
    });
    
    // Find color elements (backgrounds, text colors)
    // First, find elements with inline styles
    const inlineColorElements = doc.querySelectorAll('[style*="background"], [style*="color"]');
    inlineColorElements.forEach((element, index) => {
      const style = element.getAttribute('style') || '';
      const bgMatch = style.match(/background[^:]*:\s*([^;]+)/i);
      const colorMatch = style.match(/(?:^|;)\s*color[^:]*:\s*([^;]+)/i);
      
      if (bgMatch) {
        elements.push({
          id: `bg-${index}`,
          type: 'color',
          property: 'background',
          selector: element.tagName.toLowerCase(),
          currentValue: bgMatch[1].trim(),
          label: `Background: ${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ')[0] : ''}`,
          element: element
        });
      }
      
      if (colorMatch && !bgMatch) { // Avoid duplicate entries
        elements.push({
          id: `color-${index}`,
          type: 'color',
          property: 'color',
          selector: element.tagName.toLowerCase(),
          currentValue: colorMatch[1].trim(),
          label: `Text Color: ${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ')[0] : ''}`,
          element: element
        });
      }
    });
    
    // Also find major sections that might have background colors
    const majorSections = doc.querySelectorAll('header, section, div[class*="hero"], div[class*="banner"], div[class*="bg"]');
    majorSections.forEach((element, index) => {
      // Skip if already added
      const alreadyAdded = Array.from(inlineColorElements).includes(element);
      if (!alreadyAdded) {
        // Check computed style
        const computedBg = window.getComputedStyle(element).backgroundColor;
        if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
          elements.push({
            id: `section-bg-${index}`,
            type: 'color',
            property: 'background-color',
            selector: element.tagName.toLowerCase(),
            currentValue: computedBg,
            label: `Section Background: ${element.className || element.tagName.toLowerCase()}`,
            element: element
          });
        }
      }
    });
    
    // Find images
    const imageElements = doc.querySelectorAll('img');
    imageElements.forEach((element, index) => {
      elements.push({
        id: `img-${index}`,
        type: 'image',
        selector: 'img', // Add selector for images
        currentValue: element.getAttribute('src') || '',
        label: `Image: ${element.getAttribute('alt') || `Image ${index + 1}`}`,
        element: element
      });
    });
    
    // Detect service blocks
    detectServiceBlocks(doc);
    
    console.log('Parsed editable elements:', elements);
    setEditableElements(elements);
  };
  
  // Detect service card sections in the template
  const detectServiceBlocks = (doc: Document) => {
    console.log('🔍 Detecting service blocks...');
    
    // Look for common service card patterns
    const serviceSelectors = [
      '.service-card',
      '.service-item',
      '.service',
      '[class*="service-"]',
      '[class*="pricing"]',
      '[class*="package"]',
      '.card',
      '.item'
    ];
    
    for (const selector of serviceSelectors) {
      const cards = doc.querySelectorAll(selector);
      console.log(`Checking selector "${selector}": found ${cards.length} elements`);
      
      // Need at least 2 similar cards to be a service section
      if (cards.length >= 2) {
        const container = cards[0].parentElement;
        const template = cards[0].cloneNode(true) as Element;
        
        console.log(`✅ Found ${cards.length} service cards with selector: ${selector}`);
        
        setServiceBlocks({
          container: container,
          cards: Array.from(cards),
          template: template,
          selector: selector
        });
        
        // Auto-sync if we have user services and this is a re-detection
        if (userServices.length > 0) {
          console.log('Auto-syncing with existing user services...');
          syncServicesWithPayFast(userServices);
        } else {
          // Ask user if they want to sync with PayFast
          setTimeout(() => {
            if (confirm('🎯 Service section detected! Would you like to sync with your PayFast services?')) {
              fetchUserServices();
            }
          }, 2000);
        }
        
        return; // Found services, stop looking
      }
    }
    
    console.log('ℹ️ No service blocks detected in template');
  };
  
  // Fetch user's PayFast services
  const fetchUserServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      console.log('📥 Fetching PayFast services...');
      
      const servicesQuery = query(
        collection(db, 'services'),
        where('userId', '==', user.uid)
      );
      
      const servicesSnapshot = await getDocs(servicesQuery);
      const services = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description || '',
        price: doc.data().price,
        // Generate PayFast payment URL (simplified for now)
        paymentUrl: `/payment/${doc.id}`
      }));
      
      console.log(`✅ Found ${services.length} PayFast services:`, services);
      
      setUserServices(services);
      
      if (services.length > 0) {
        syncServicesWithPayFast(services);
      } else {
        alert('No PayFast services found. Please create services first in the Payments section.');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      alert('Failed to fetch services. Please try again.');
    }
  };
  
  // Sync template services with PayFast data
  const syncServicesWithPayFast = (services: any[]) => {
    if (!serviceBlocks) {
      console.log('❌ No service blocks to sync');
      return;
    }
    
    console.log('🔄 Syncing services with PayFast...');
    
    const iframe = document.querySelector('iframe[title="Template Edit View"]') as HTMLIFrameElement;
    if (!iframe || !iframe.contentDocument) {
      console.log('❌ Iframe not ready');
      return;
    }
    
    const doc = iframe.contentDocument;
    const container = doc.querySelector(serviceBlocks.selector)?.parentElement;
    
    if (!container) {
      console.log('❌ Service container not found in iframe');
      return;
    }
    
    // Clear existing service cards
    container.innerHTML = '';
    
    // Create a card for each PayFast service
    services.forEach((service, index) => {
      const card = serviceBlocks.template.cloneNode(true) as Element;
      
      // Update service title
      const titleElement = card.querySelector('h3, .service-title, [class*="title"]');
      if (titleElement) {
        titleElement.textContent = service.name;
      }
      
      // Update description
      const descElement = card.querySelector('p, .service-description, [class*="description"]');
      if (descElement && service.description) {
        descElement.textContent = service.description;
      }
      
      // Update price
      const priceElement = card.querySelector('.price, [class*="price"], .cost');
      if (priceElement) {
        priceElement.textContent = `$${service.price}`;
      }
      
      // Update button link
      const buttonElement = card.querySelector('button, a.btn, .button');
      if (buttonElement) {
        buttonElement.setAttribute('data-payment-url', service.paymentUrl);
        buttonElement.setAttribute('data-service-id', service.id);
        buttonElement.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = service.paymentUrl;
        });
      }
      
      // Mark as synced
      card.setAttribute('data-synced', 'true');
      card.setAttribute('data-service-id', service.id);
      
      container.appendChild(card);
    });
    
    setServicesSynced(true);
    console.log('✅ Services synced successfully!');
    
    // Re-setup click handlers
    setTimeout(() => {
      addClickHandlersToPreview();
    }, 500);
  };
  
  // Open template in new tab for true preview
  const openInNewTab = async () => {
    if (!templateContent) {
      alert('Template not loaded yet');
      return;
    }
    
    // First save the current changes
    if (Object.keys(tempCustomizations).length > 0) {
      const shouldSave = confirm('You have unsaved changes. Would you like to save them before previewing?');
      if (shouldSave) {
        await saveWebsite();
      }
    }
    
    // Get the saved version from the database
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('Please sign in to preview');
      return;
    }
    
    // Check if we're editing an existing website
    const urlParams = new URLSearchParams(window.location.search);
    let websiteId = urlParams.get('websiteId');
    
    if (!websiteId) {
      // Check if user already has a website for this template
      const websitesRef = collection(db, 'userWebsites');
      const q = query(
        websitesRef,
        where('userId', '==', currentUser.uid),
        where('templateId', '==', templateId)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        websiteId = querySnapshot.docs[0].id;
      }
    }
    
    let savedContent = '';
    
    if (websiteId) {
      // Load saved content from database
      console.log('═══════════════════════════════════════════════');
      console.log('📖 LOADING SAVED CONTENT FROM DATABASE');
      console.log('═══════════════════════════════════════════════');
      console.log('🔍 websiteId:', websiteId);
      const websiteDoc = await getDoc(doc(db, 'userWebsites', websiteId));
      if (websiteDoc.exists()) {
        const websiteData = websiteDoc.data();
        savedContent = websiteData.savedContent || '';
        console.log('✅ Loaded saved content from database');
        console.log('📊 savedContent length:', savedContent.length);
        console.log('📊 customizations count:', Object.keys(websiteData.customizations || {}).length);
        console.log('📊 updatedAt:', websiteData.updatedAt);
        console.log('📄 First 200 chars:', savedContent.substring(0, 200));
        console.log('📄 Sample customizations:', Object.entries(websiteData.customizations || {}).slice(0, 3));
        
        // Check if button colors are in the saved HTML
        const hasGreenButton = savedContent.includes('#73f73b') || savedContent.includes('73f73b');
        const hasBookButton = savedContent.includes('Book Your Appointment');
        console.log('🔍 Saved HTML contains green color (#73f73b):', hasGreenButton);
        console.log('🔍 Saved HTML contains "Book Your Appointment":', hasBookButton);
        
        // Try to find the button in saved content
        if (hasBookButton) {
          const buttonIndex = savedContent.indexOf('Book Your Appointment');
          const surroundingHTML = savedContent.substring(Math.max(0, buttonIndex - 200), buttonIndex + 200);
          console.log('🔍 HTML around "Book Your Appointment" button:', surroundingHTML);
        }
      } else {
        console.log('❌ Website not found in database, generating from template');
        savedContent = await getSavedTemplateContent();
      }
    } else {
      // No saved version yet, generate from current state
      console.log('⚠️ No saved version found (no websiteId), generating from current state');
      savedContent = await getSavedTemplateContent();
    }
    
    const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (newWindow) {
      // Write the saved template content to the new window
      newWindow.document.write(savedContent);
      newWindow.document.close();
      
      // Set the title
      newWindow.document.title = `${template?.name || 'Template'} - Preview`;
      
      // Apply service blocks to the preview if we have them
      if (serviceBlocks && userServices.length > 0) {
        setTimeout(() => {
          console.log('Applying service blocks to preview...');
          
          // Find the service container in the preview
          const serviceContainer = newWindow.document.querySelector(serviceBlocks.selector)?.parentElement;
          if (serviceContainer) {
            // Clear existing service cards
            serviceContainer.innerHTML = '';
            
            // Create a card for each PayFast service
            userServices.forEach((service, index) => {
              const card = serviceBlocks.template.cloneNode(true) as Element;
              
              // Update service title
              const titleElement = card.querySelector('h3, .service-title, [class*="title"]');
              if (titleElement) {
                titleElement.textContent = service.name;
              }
              
              // Update description
              const descElement = card.querySelector('p, .service-description, [class*="description"]');
              if (descElement && service.description) {
                descElement.textContent = service.description;
              }
              
              // Update price
              const priceElement = card.querySelector('.price, [class*="price"], .cost');
              if (priceElement) {
                priceElement.textContent = `$${service.price}`;
              }
              
              // Update button link
              const buttonElement = card.querySelector('button, a.btn, .button');
              if (buttonElement) {
                buttonElement.setAttribute('data-payment-url', service.paymentUrl);
                buttonElement.setAttribute('data-service-id', service.id);
              }
              
              // Mark as synced
              card.setAttribute('data-synced', 'true');
              card.setAttribute('data-service-id', service.id);
              
              serviceContainer.appendChild(card);
            });
            
            console.log('✅ Applied service blocks to preview');
          }
        }, 500);
      }
      
      console.log('✅ Saved template opened in new tab - clean preview with customizations');
    } else {
      alert('Please allow popups for this site to open the preview');
    }
  };

  // Get the saved template content with all customizations applied
  const getSavedTemplateContent = async () => {
    if (!templateContent) {
      return '';
    }

    // Create a temporary iframe to apply customizations
    const tempIframe = document.createElement('iframe');
    tempIframe.style.display = 'none';
    document.body.appendChild(tempIframe);
    
    try {
      // Write the original template content
      tempIframe.contentDocument?.write(templateContent);
      tempIframe.contentDocument?.close();
      
      const doc = tempIframe.contentDocument;
      if (!doc) return templateContent;
      
      // Set up data attributes for all editable elements (so we can find them later)
      if (editableElements.length > 0) {
        editableElements.forEach((element) => {
          const elements = doc.querySelectorAll(element.selector);
          elements.forEach((el: HTMLElement, index) => {
            el.setAttribute('data-element-id', element.id);
            el.setAttribute('data-element-index', index.toString());
          });
        });
      }
      
      // Apply all committed customizations
      Object.entries(committedValues).forEach(([key, value]) => {
        console.log('Applying customization:', key, '=', value);
        
        // Parse the key to get element info
        let parts = key.split('-');
        let index: string = parts[parts.length - 1]; // Last part is always the index
        let property: string | undefined;
        let elementId: string;
        
        // Special handling for different element types
        if (key.startsWith('bg-ctrl-')) {
          // For bg-ctrl-home-gradient-start: elementId='bg-ctrl-home', property='gradient', index='start'
          // For bg-ctrl-home-0: elementId='bg-ctrl-home', property=undefined, index='0'
          // For bg-ctrl-home-bgType: elementId='bg-ctrl-home', property='bgType', index=undefined
          const bgParts = key.split('-');
          const lastPart = bgParts[bgParts.length - 1];
          
          // Check if last part is an index (number), a property (string), or neither
          if (!isNaN(parseInt(lastPart)) && lastPart === parseInt(lastPart).toString()) {
            // It's a pure number: bg-ctrl-home-0 → elementId='bg-ctrl-home', index='0', property=undefined
            index = bgParts.pop() || '';
            elementId = bgParts.join('-');
            property = undefined;
          } else if (lastPart === 'bgType' || lastPart === 'start' || lastPart === 'end') {
            // It's part of a property: bg-ctrl-home-gradient-start
            index = bgParts.pop() || ''; // 'start'
            property = bgParts.pop(); // 'gradient'
            elementId = bgParts.join('-'); // 'bg-ctrl-home'
          } else {
            // Default: treat as property without index (bg-ctrl-home-bgType)
            property = bgParts.pop();
            elementId = bgParts.join('-');
            index = '';
          }
        } else if (key.startsWith('text-')) {
          // For text-93-1, we have: elementId-index (NO property for text content)
          // For text-93-0-color, we have: elementId-index-property
          const textParts = key.split('-');
          const lastPart = textParts[textParts.length - 1];
          
          // Check if last part is a property (color, font-size, etc.) or an index (number)
          if (isNaN(parseInt(lastPart))) {
            // It's a property: text-93-0-color → elementId='text-93', index='0', property='color'
            property = textParts.pop(); // 'color'
            index = textParts.pop() || ''; // '0'
            elementId = textParts.join('-'); // 'text-93'
          } else {
            // It's just an index: text-93-1 → elementId='text-93', index='1', property=undefined
            index = textParts.pop() || ''; // '1'
            elementId = textParts.join('-'); // 'text-93'
            property = undefined;
          }
        } else if (key.startsWith('img-')) {
          // For img-7-0, we have: elementId-index (similar to text)
          const imgParts = key.split('-');
          index = imgParts.pop() || ''; // '0'
          elementId = imgParts.join('-'); // 'img-7'
          property = undefined;
        } else if (key.startsWith('button-link-ctrl-')) {
          // For button-link-ctrl-btn-primary-0-bg-color, we have: elementId-property-subproperty
          // E.g., 'button-link-ctrl-btn-primary-0-bg-color' → elementId='button-link-ctrl-btn-primary-0', property='bg', index='color'
          parts = key.split('-');
          index = parts.pop() || ''; // 'color'
          property = parts.pop(); // 'bg'
          elementId = parts.join('-'); // 'button-link-ctrl-btn-primary-0'
        } else {
          // Default parsing
          index = parts.pop() || '';
          property = parts.pop();
          elementId = parts.join('-');
        }
        
        console.log('Parsed key - elementId:', elementId, 'property:', property, 'index:', index);
        
        // Find the element using multiple strategies
        let element = null;
        
        // Special handling for background elements (bg-ctrl-*)
        if (elementId.startsWith('bg-ctrl-')) {
          // For bg-ctrl-home, extract the identifier part (everything after 'bg-ctrl-')
          const bgIdentifier = elementId.replace('bg-ctrl-', '');
          
          // Try with data-bg-id first
          element = doc.querySelector(`[data-bg-id="${elementId}"]`);
          
          // If not found, try to find by ID, class, or tag name
          if (!element) {
            element = doc.querySelector(`#${bgIdentifier}`) || 
                     doc.querySelector(`.${bgIdentifier}`) || 
                     doc.querySelector(bgIdentifier);
          }
          
          console.log('Looking for background element:', elementId, 'Found:', !!element);
        }
        // Special handling for text elements (text-*)
        else if (elementId.startsWith('text-')) {
          // For text-93-1, we want to find the element with data-element-id="text-93" and data-element-index="1"
          if (index && !isNaN(parseInt(index))) {
            element = doc.querySelector(`[data-element-id="${elementId}"][data-element-index="${index}"]`);
            console.log('Looking for text element with data-element-id:', elementId, 'index:', index, 'Found:', !!element);
          } else {
            element = doc.querySelector(`[data-element-id="${elementId}"]`);
            console.log('Looking for text element with data-element-id:', elementId, 'Found:', !!element);
          }
        }
        // Special handling for image elements (img-*)
        else if (elementId.startsWith('img-')) {
          // For img-7-0, we want to find the element with data-element-id="img-7" and data-element-index="0"
          if (index && !isNaN(parseInt(index))) {
            element = doc.querySelector(`[data-element-id="${elementId}"][data-element-index="${index}"]`);
            console.log('Looking for image element with data-element-id:', elementId, 'index:', index, 'Found:', !!element);
          } else {
            element = doc.querySelector(`[data-element-id="${elementId}"]`);
            console.log('Looking for image element with data-element-id:', elementId, 'Found:', !!element);
          }
        }
        // Special handling for button-link-ctrl elements
        else if (elementId.startsWith('button-link-ctrl-')) {
          // Extract the stable identifier (everything after 'button-link-ctrl-')
          // Also remove the trailing index (e.g., '-0', '-1') if present
          let identifier = elementId.replace('button-link-ctrl-', '');
          
          // Remove trailing -<number> (the index)
          identifier = identifier.replace(/-\d+$/, '');
          
          console.log('Looking for button with identifier (after removing index):', identifier);
          
          // Try to find button by various attributes
          // 1. Try by ID (only if identifier doesn't start with a number)
          if (!/^\d/.test(identifier)) {
            try {
              element = doc.querySelector(`button#${identifier}, a#${identifier}`);
            } catch (e) {
              console.log('Invalid selector for ID:', identifier);
            }
          }
          
          // 2. Try by class (only if identifier doesn't start with a number)
          if (!element && !/^\d/.test(identifier)) {
            try {
              element = doc.querySelector(`button.${identifier}, a.${identifier}`);
            } catch (e) {
              console.log('Invalid selector for class:', identifier);
            }
          }
          
          // 3. Try by text content (convert identifier back to text)
          if (!element) {
            const textToFind = identifier.replace(/-/g, ' ').replace(/^\d+\s*/, ''); // Remove leading numbers
            const buttons = doc.querySelectorAll('button, a.btn, a.button, a[class*="btn"]');
            for (const btn of Array.from(buttons)) {
              const btnText = btn.textContent?.trim().toLowerCase();
              if (btnText && (btnText === textToFind || btnText.includes(textToFind) || textToFind.includes(btnText))) {
                element = btn as HTMLElement;
                console.log('✅ Found button by text match:', btnText);
                break;
              }
            }
          }
        } else {
          // Strategy 1: Look for data attributes
          if (index) {
            element = doc.querySelector(`[data-element-id="${elementId}"][data-element-index="${index}"]`);
          }
          
          // Strategy 2: Look for element ID
          if (!element) {
            element = doc.querySelector(`#${elementId}`);
          }
          
          // Strategy 3: Look for class name
          if (!element) {
            element = doc.querySelector(`.${elementId}`);
          }
          
          // Strategy 4: Look for any element with data-element-id
          if (!element) {
            element = doc.querySelector(`[data-element-id="${elementId}"]`);
          }
        }
        
        if (element) {
          console.log('✅ Found element:', element.tagName, element.textContent?.substring(0, 30));
          
          // Special handling for background elements with no property (bg-ctrl-home-0)
          if (index && !property && elementId.startsWith('bg-ctrl-')) {
            // This is a background solid color, not text content
            element.style.background = value;
            console.log('✅ Applied solid background:', value, 'to', element.tagName);
          } else if (property === 'text' || (!property && elementId.startsWith('text-'))) {
            element.textContent = value;
          } else if (property === 'color') {
            element.style.color = value;
          } else if (property === 'bg' || property === 'bg-color') {
            element.style.setProperty('background-color', value, 'important');
            element.style.setProperty('--base-color', value, 'important');
            console.log('✅ Applied bg-color:', value, 'to', element.tagName, element.textContent?.substring(0, 30));
          } else if (property === 'hover' || property === 'hover-color') {
            element.style.setProperty('--hover-color', value, 'important');
            console.log('✅ Applied hover-color:', value, 'to', element.tagName, element.textContent?.substring(0, 30));
          } else if (property === 'link') {
            element.setAttribute('data-href', value);
          } else if (property === 'background' || property === 'background-color') {
            element.style.backgroundColor = value;
          } else if (property === 'background-image' || property === 'backgroundImage') {
            element.style.backgroundImage = value;
          } else if (property === 'color') {
            const hexValue = rgbToHex(value);
            element.style.color = hexValue;
          } else if (property === 'font-size') {
            element.style.fontSize = value + 'px';
          } else if (property === 'font-weight') {
            element.style.fontWeight = value;
          } else if (property === 'font-style') {
            element.style.fontStyle = value;
          } else if (property === 'text-decoration') {
            element.style.textDecoration = value;
          } else if (index === '0' && !property) {
            // Handle text content (text-6-0)
            element.textContent = value;
          } else if (property === 'gradient' && index === 'start') {
            // Handle gradient start color
            const endColor = committedValues[`${elementId}-gradient-end`];
            if (endColor) {
              element.style.background = `linear-gradient(135deg, ${value}, ${endColor})`;
            }
          } else if (property === 'gradient' && index === 'end') {
            // Handle gradient end color
            const startColor = committedValues[`${elementId}-gradient-start`];
            if (startColor) {
              element.style.background = `linear-gradient(135deg, ${startColor}, ${value})`;
            }
          } else if (property === 'bgType' && value === 'gradient') {
            // Apply gradient if both colors are available
            const startColor = committedValues[`${elementId}-gradient-start`];
            const endColor = committedValues[`${elementId}-gradient-end`];
            if (startColor && endColor) {
              element.style.background = `linear-gradient(135deg, ${startColor}, ${endColor})`;
            }
          } else if (property === 'bgType' && value === 'solid') {
            // Apply solid color
            const solidColor = committedValues[`${elementId}-0`];
            if (solidColor) {
              element.style.background = solidColor;
            }
          }
          
          console.log('✅ Applied customization to element');
        } else {
          console.log('❌ Element not found for key:', key);
        }
      });
      
      // Note: Service blocks are handled by the live iframe only
      // The saved content should only contain the base template with customizations
      // Service blocks are applied dynamically when the page loads
      
      // Get the modified HTML
      const modifiedContent = doc.documentElement.outerHTML;
      
      // Clean up
      document.body.removeChild(tempIframe);
      
      return modifiedContent;
    } catch (error) {
      console.error('Error getting saved template content:', error);
      document.body.removeChild(tempIframe);
      return templateContent;
    }
  };

  // Add a new service card
  const addServiceCard = () => {
    if (!serviceBlocks) {
      alert('No service section detected in this template');
      return;
    }
    
    const iframe = document.querySelector('iframe[title="Template Edit View"]') as HTMLIFrameElement;
    if (!iframe || !iframe.contentDocument) return;
    
    const doc = iframe.contentDocument;
    const container = doc.querySelector(serviceBlocks.selector)?.parentElement;
    
    if (!container) return;
    
    // Clone the template
    const newCard = serviceBlocks.template.cloneNode(true) as Element;
    
    // Reset content
    const titleElement = newCard.querySelector('h3, .service-title, [class*="title"]');
    if (titleElement) titleElement.textContent = 'New Service';
    
    const descElement = newCard.querySelector('p, .service-description, [class*="description"]');
    if (descElement) descElement.textContent = 'Service description';
    
    const priceElement = newCard.querySelector('.price, [class*="price"], .cost');
    if (priceElement) priceElement.textContent = '$0';
    
    // Mark as custom (not synced)
    newCard.setAttribute('data-synced', 'false');
    newCard.setAttribute('data-service-id', `custom-${Date.now()}`);
    
    // Add to container
    container.appendChild(newCard);
    
    console.log('✅ New service card added');
    
    // Re-setup click handlers
    setTimeout(() => {
      addClickHandlersToPreview();
    }, 500);
  };

  const handleCustomizationChange = (elementId: string, value: string) => {
    setCustomizations(prev => ({
      ...prev,
      [elementId]: value
    }));
    
    // Apply changes to the template in real-time
    applyCustomizations(elementId, value);
  };

  const addClickHandlersToPreview = () => {
    const iframe = document.querySelector('iframe[title="Template Edit View"]') as HTMLIFrameElement;
    if (!iframe) {
      console.log('Iframe not found, retrying...');
      setTimeout(() => addClickHandlersToPreview(), 1000);
      return;
    }

    // Wait for iframe to load
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      setupClickHandlers(iframe);
    } else {
      iframe.onload = () => {
        console.log('Iframe loaded, setting up click handlers');
        setupClickHandlers(iframe);
      };
    }
  };

  const setupClickHandlers = (iframe: HTMLIFrameElement) => {
    const doc = iframe.contentDocument;
    if (!doc) {
      console.log('No content document, retrying...');
      setTimeout(() => addClickHandlersToPreview(), 1000);
      return;
    }


    console.log('Setting up click handlers in iframe (Edit Mode)');
    
    // Add a global click handler to the document
    doc.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      console.log('Element clicked:', target.tagName, target.textContent?.substring(0, 50));
      
      // Check if Ctrl/Cmd is pressed for editing mode
      const isEditMode = e.ctrlKey || e.metaKey;
      
      // If it's a button or link and NOT in edit mode, handle navigation
      if ((target.tagName === 'BUTTON' || target.tagName === 'A') && !isEditMode) {
        console.log('Normal click on button/link - handling navigation');
        
        // Check if button has a custom link
        const customLink = target.getAttribute('data-href');
        const paymentUrl = target.getAttribute('data-payment-url');
        
        if (paymentUrl) {
          // Service button with PayFast link
          console.log('Service button clicked, redirecting to PayFast:', paymentUrl);
          window.location.href = paymentUrl;
          return;
        } else if (customLink) {
          console.log('Button has custom link:', customLink);
          if (customLink.startsWith('#')) {
            // Scroll to section
            const section = doc.querySelector(customLink);
            if (section) {
              section.scrollIntoView({ behavior: 'smooth' });
            }
          } else if (customLink.startsWith('http')) {
            // External link
            window.open(customLink, '_blank');
          } else {
            // Other links
            window.location.href = customLink;
          }
          return;
        }
        
        // Let normal link behavior work
        return;
      }
      
      // For all other cases, prevent default and handle editing
      e.preventDefault();
      e.stopPropagation();
      
      // Check if Ctrl/Cmd is pressed for background selection
      const isBackgroundMode = e.ctrlKey || e.metaKey;
      
      if (isBackgroundMode) {
        // Ctrl+Click mode - could be background or button/link editing
        
        // Check if it's a button or link for text editing
        if (target.tagName === 'BUTTON' || target.tagName === 'A') {
          console.log('Ctrl+Click on button/link - opening text editor');
          
          // Create a stable ID based on the button's content and position
          const buttonText = target.textContent?.trim().replace(/\s+/g, '-').toLowerCase() || 'button';
          const buttonClass = target.className?.trim().replace(/\s+/g, '-') || '';
          const buttonId = target.id || '';
          
          // Use a combination of ID, class, and text to create a stable identifier
          const stableIdentifier = buttonId || buttonClass || buttonText;
          const stableId = `button-link-ctrl-${stableIdentifier}`;
          
          console.log('Creating stable button ID:', stableId);
          
          const buttonLinkElement = {
            id: stableId,
            type: 'text',
            selector: target.tagName.toLowerCase(),
            currentValue: target.textContent?.trim() || '',
            label: `${target.tagName}: ${target.textContent?.substring(0, 30)}${target.textContent && target.textContent.length > 30 ? '...' : ''}`,
            element: target,
            index: 0
          };
          
          // Load previously committed values for this button
          const tempValues: Customization = {};
          
          // Load all saved values that match this button's stable ID
          Object.keys(committedValues).forEach(key => {
            if (key.startsWith(stableId)) {
              tempValues[key] = committedValues[key];
            }
          });
          
          console.log('Loading saved button values:', tempValues);
          
          setTempCustomizations(tempValues);
          setSelectedElement(buttonLinkElement);
          setShowEditModal(true);
          return;
        }
        
        // Otherwise, it's background selection mode
        const computedStyle = window.getComputedStyle(target);
        const bgColor = computedStyle.backgroundColor;
        
         console.log('Background mode - selected element:', target.tagName, 'bg:', bgColor);
         
         // Create a stable ID based on element's position and attributes
         const elementId = target.id || target.className || target.tagName.toLowerCase();
         const stableId = `bg-ctrl-${elementId}`;
         
         // Set the data-bg-id attribute so we can find this element later
         target.setAttribute('data-bg-id', stableId);
         
         const backgroundElement = {
           id: stableId,
           type: 'style',
           property: 'background-color',
           selector: target.tagName.toLowerCase(),
           currentValue: bgColor,
           label: `Background Color`,
           element: target,
           index: 0
         };
         
         // Load previously committed values for this background element
         const elementKey = `${stableId}-${backgroundElement.index}`;
         const tempValues: Customization = {};
         
         // Load all saved values that match this element's stable ID
         Object.keys(committedValues).forEach(key => {
           if (key.startsWith(stableId)) {
             tempValues[key] = committedValues[key];
           }
         });
         
         console.log('Loading saved background values:', tempValues);
         
         setTempCustomizations(tempValues);
         setSelectedElement(backgroundElement);
         setShowEditModal(true);
      } else {
        // Check if clicking on a service card (Shift+Click for service editor)
        if (e.shiftKey && serviceBlocks) {
          const serviceCard = target.closest(serviceBlocks.selector);
          if (serviceCard) {
            
            // Get service data
            const serviceName = serviceCard.querySelector('h3, .service-title, [class*="title"]')?.textContent || 'Untitled';
            const serviceDesc = serviceCard.querySelector('p, .service-description, [class*="description"]')?.textContent || '';
            const servicePrice = serviceCard.querySelector('.price, [class*="price"], .cost')?.textContent?.replace(/[^0-9.]/g, '') || '0';
            const serviceId = serviceCard.getAttribute('data-service-id') || '';
            const isSynced = serviceCard.getAttribute('data-synced') === 'true';
            
            setSelectedService({
              element: serviceCard,
              name: serviceName,
              description: serviceDesc,
              price: servicePrice,
              id: serviceId,
              synced: isSynced
            });
            
            setShowServiceEditor(true);
            console.log('📝 Opening service editor for:', serviceName);
            return;
          }
        }
        
        // Normal element selection
        const clickedElement = findClickedElement(target);
        if (clickedElement) {
          
          // Get the current value from the actual element
          if (clickedElement.type === 'text') {
            const textElements = doc.querySelectorAll(clickedElement.selector);
            if (textElements[clickedElement.index]) {
              const el = textElements[clickedElement.index] as HTMLElement;
              clickedElement.currentValue = el.textContent || '';
              
              // Get computed styles for text
              const computedStyle = window.getComputedStyle(el);
              clickedElement.styles = {
                color: computedStyle.color,
                fontSize: computedStyle.fontSize,
                fontWeight: computedStyle.fontWeight,
                fontStyle: computedStyle.fontStyle,
                textDecoration: computedStyle.textDecoration,
                textAlign: computedStyle.textAlign
              };
            }
          } else if (clickedElement.type === 'image') {
            const imageElements = doc.querySelectorAll(clickedElement.selector);
            if (imageElements[clickedElement.index]) {
              clickedElement.currentValue = imageElements[clickedElement.index].getAttribute('src') || '';
            }
          } else if (clickedElement.type === 'color') {
            if (clickedElement.element) {
              const el = clickedElement.element as HTMLElement;
              const style = el.getAttribute('style') || '';
              const propertyMatch = style.match(new RegExp(`${clickedElement.property}[^:]*:\\s*([^;]+)`, 'i'));
              if (propertyMatch) {
                clickedElement.currentValue = propertyMatch[1].trim();
              }
            }
          }
          
           console.log('Opening edit modal for:', clickedElement);
           
           // Load previously committed values for this element
           const elementKey = `${clickedElement.id}-${clickedElement.index}`;
           const tempValues: Customization = {};
           
           // Check if we have saved values for this element
           Object.keys(committedValues).forEach(key => {
             if (key.startsWith(elementKey)) {
               tempValues[key] = committedValues[key];
             }
           });
           
           setTempCustomizations(tempValues);
           setSelectedElement(clickedElement);
           setShowEditModal(true);
        }
      }
    });

    // Add visual feedback to all editable elements
    editableElements.forEach((element, elementIndex) => {
      if (element.type === 'text') {
        const textElements = doc.querySelectorAll(element.selector);
        textElements.forEach((el: HTMLElement, index) => {
          el.style.cursor = 'pointer';
          el.style.outline = '2px dashed #3b82f6';
          el.style.outlineOffset = '2px';
          el.style.transition = 'all 0.2s ease';
          el.setAttribute('data-editable', 'true');
          el.setAttribute('data-element-id', element.id);
          el.setAttribute('data-element-index', index.toString());
          el.setAttribute('data-text-content', el.textContent?.trim() || '');
          
          // Add hover effects
          el.addEventListener('mouseenter', () => {
            el.style.outline = '2px solid #3b82f6';
            el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
          });
          
          el.addEventListener('mouseleave', () => {
            el.style.outline = '2px dashed #3b82f6';
            el.style.backgroundColor = 'transparent';
          });
        });
      } else if (element.type === 'image') {
        const imageElements = doc.querySelectorAll('img');
        imageElements.forEach((el: HTMLElement, index) => {
          el.style.cursor = 'pointer';
          el.style.outline = '2px dashed #3b82f6';
          el.style.outlineOffset = '2px';
          el.style.transition = 'all 0.2s ease';
          el.setAttribute('data-editable', 'true');
          el.setAttribute('data-element-id', element.id);
          el.setAttribute('data-element-index', index.toString());
          
          // Add hover effects
          el.addEventListener('mouseenter', () => {
            el.style.outline = '2px solid #3b82f6';
            el.style.opacity = '0.8';
          });
          
          el.addEventListener('mouseleave', () => {
            el.style.outline = '2px dashed #3b82f6';
            el.style.opacity = '1';
          });
        });
      }
    });
    
    // Also make all buttons and links editable (for text editing)
    const buttonsAndLinks = doc.querySelectorAll('button, a');
    buttonsAndLinks.forEach((el: HTMLElement, index) => {
      // Only if not already marked as editable
      if (!el.getAttribute('data-editable')) {
        el.setAttribute('data-editable', 'true');
        el.setAttribute('data-element-id', `button-link-${index}`);
        el.setAttribute('data-element-index', index.toString());
        el.setAttribute('data-text-content', el.textContent?.trim() || '');
      }
      
      // Add specific event listener to handle Ctrl+Click editing
      el.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
          console.log('Ctrl+Click detected on button/link - opening editor');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Create a stable ID based on the button's content and position
          const buttonText = el.textContent?.trim().replace(/\s+/g, '-').toLowerCase() || 'button';
          const buttonClass = el.className?.trim().replace(/\s+/g, '-') || '';
          const buttonId = el.id || '';
          
          // Use a combination of ID, class, and text to create a stable identifier
          const stableIdentifier = buttonId || buttonClass || buttonText;
          const stableId = `button-link-ctrl-${stableIdentifier}`;
          
          console.log('Creating stable button ID:', stableId);
          
          // Open the edit modal for this button/link
          const buttonLinkElement = {
            id: stableId,
            type: 'text',
            selector: el.tagName.toLowerCase(),
            currentValue: el.textContent?.trim() || '',
            label: `${el.tagName}: ${el.textContent?.substring(0, 30)}${el.textContent && el.textContent.length > 30 ? '...' : ''}`,
            element: el,
            index: 0
          };
          
          // Load previously committed values for this button
          const tempValues: Customization = {};
          
          // Load all saved values that match this button's stable ID
          Object.keys(committedValues).forEach(key => {
            if (key.startsWith(stableId)) {
              tempValues[key] = committedValues[key];
            }
          });
          
          console.log('Loading saved button values:', tempValues);
          
          // Use a timeout to ensure the modal opens after the event is fully processed
          setTimeout(() => {
            setTempCustomizations(tempValues);
            setSelectedElement(buttonLinkElement);
            setShowEditModal(true);
          }, 10);
          
          return false;
        }
      }, true); // Use capture phase to intercept before other handlers
    });
    
    console.log('Click handlers setup complete');
  };

  const findClickedElement = (target: HTMLElement): any => {
    console.log('Finding clicked element for:', target.tagName, target.textContent?.substring(0, 30));
    
    // Check if the clicked element has editable data
    if (target.getAttribute('data-editable') === 'true') {
      const elementId = target.getAttribute('data-element-id');
      const elementIndex = target.getAttribute('data-element-index');
      
      // Handle buttons and links specially
      if (elementId && elementId.startsWith('button-link-')) {
        return {
          id: elementId,
          type: 'text',
          selector: target.tagName.toLowerCase(),
          currentValue: target.textContent?.trim() || '',
          label: `${target.tagName}: ${target.textContent?.substring(0, 30)}${target.textContent && target.textContent.length > 30 ? '...' : ''}`,
          element: target,
          index: elementIndex ? parseInt(elementIndex) : 0
        };
      }
      
      const element = editableElements.find(el => el.id === elementId);
      
      if (element) {
        // Create a copy with the specific index
        const elementWithIndex = {
          ...element,
          index: elementIndex ? parseInt(elementIndex) : 0
        };
        console.log('Found element by data attribute:', elementWithIndex);
        return elementWithIndex;
      }
    }
    
    // Check parent elements
    let parent = target.parentElement;
    let depth = 0;
    while (parent && depth < 5) { // Limit depth to avoid infinite loops
      if (parent.getAttribute('data-editable') === 'true') {
        const elementId = parent.getAttribute('data-element-id');
        const elementIndex = parent.getAttribute('data-element-index');
        const element = editableElements.find(el => el.id === elementId);
        
        if (element) {
          // Create a copy with the specific index
          const elementWithIndex = {
            ...element,
            index: elementIndex ? parseInt(elementIndex) : 0
          };
          console.log('Found element by parent data attribute:', elementWithIndex);
          return elementWithIndex;
        }
      }
      parent = parent.parentElement;
      depth++;
    }
    
    // Try to match by text content for navigation items
    const textContent = target.textContent?.trim();
    if (textContent) {
      // Look for navigation items by text content
      const navElement = editableElements.find(el => 
        el.type === 'text' && 
        el.selector.includes('nav') && 
        el.label?.toLowerCase().includes(textContent.toLowerCase())
      );
      if (navElement) {
        console.log('Found element by text content match:', navElement);
        return navElement;
      }
    }
    
    console.log('No matching element found');
    return null;
  };

  // Convert RGB color to hex
  const rgbToHex = (rgb: string): string => {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return rgb;
  };

  const applyCustomizations = (elementWithIndex: any, value: string, property?: string) => {
    console.log('Applying customization:', elementWithIndex, 'Value:', value, 'Property:', property);

    // Update the iframe content with the new value
    const iframe = document.querySelector('iframe[title="Template Edit View"]') as HTMLIFrameElement;
    if (!iframe || !iframe.contentDocument) {
      console.log('Iframe not found or not ready');
      return;
    }

    const doc = iframe.contentDocument;
    
    if (elementWithIndex.type === 'text') {
      // Find and update text content or styles
      const textElements = doc.querySelectorAll(elementWithIndex.selector);
      console.log(`Found ${textElements.length} text elements for ${elementWithIndex.selector}`);
      
      if (elementWithIndex.index !== undefined && textElements[elementWithIndex.index]) {
        const el = textElements[elementWithIndex.index] as HTMLElement;
        
        if (property) {
          // Update a specific style property
          console.log('Updating style property:', property, 'to:', value);
          // Use setProperty with 'important' for background-color to override hover states
          if (property === 'background-color' || property === 'backgroundColor') {
            el.style.setProperty('background-color', value, 'important');
          } else {
            el.style[property as any] = value;
          }
        } else {
          // Update text content
          console.log('Updating text element at index:', elementWithIndex.index);
          el.textContent = value;
          console.log('Text updated successfully to:', value);
        }
      } else if (textElements.length > 0) {
        const el = textElements[0] as HTMLElement;
        
        if (property) {
          // Use setProperty with 'important' for background-color to override hover states
          if (property === 'background-color' || property === 'backgroundColor') {
            const hexValue = rgbToHex(value);
            el.style.setProperty('background-color', hexValue, 'important');
          } else if (property === 'color') {
            const hexValue = rgbToHex(value);
            el.style[property as any] = hexValue;
          } else {
            el.style[property as any] = value;
          }
        } else {
          console.log('Updating first text element');
          el.textContent = value;
          console.log('Text updated successfully to:', value);
        }
      }
    } else if (elementWithIndex.type === 'color' || elementWithIndex.type === 'style') {
      // Find and update color/background
      console.log('Updating style property:', elementWithIndex.property, 'to:', value);
      
      if (elementWithIndex.element) {
        const el = elementWithIndex.element as HTMLElement;
        const currentStyle = el.getAttribute('style') || '';
        
        // Check if the property already exists in the style
        const propertyRegex = new RegExp(`${elementWithIndex.property}[^:]*:[^;]+`, 'gi');
        
        if (propertyRegex.test(currentStyle)) {
          // Replace existing property
          const newStyle = currentStyle.replace(propertyRegex, `${elementWithIndex.property}: ${value}`);
          el.setAttribute('style', newStyle);
        } else {
          // Add new property
          const newStyle = currentStyle + (currentStyle.endsWith(';') ? '' : ';') + ` ${elementWithIndex.property}: ${value};`;
          el.setAttribute('style', newStyle);
        }
        
        console.log('Style updated successfully');
      }
    } else if (elementWithIndex.type === 'image') {
      // Find and update image src
      const imageElements = doc.querySelectorAll(elementWithIndex.selector);
      console.log(`Found ${imageElements.length} image elements for ${elementWithIndex.selector}`);
      
      if (elementWithIndex.index !== undefined && imageElements[elementWithIndex.index]) {
        console.log('Updating image element at index:', elementWithIndex.index);
        imageElements[elementWithIndex.index].setAttribute('src', value);
        console.log('Image updated successfully');
      } else if (imageElements.length > 0) {
        console.log('Updating first image element');
        imageElements[0].setAttribute('src', value);
        console.log('Image updated successfully');
      }
    }
    
    console.log('Customization applied successfully');
  };

  const saveWebsite = async () => {
    if (!template) return;
    
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 SAVE WEBSITE STARTED');
    console.log('═══════════════════════════════════════════════');
    
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('👤 Current User:', currentUser.uid);
        console.log('📊 committedValues:', committedValues);
        console.log('📊 Number of customizations:', Object.keys(committedValues).length);
        console.log('📊 tempCustomizations:', tempCustomizations);
        console.log('📊 Number of temp customizations:', Object.keys(tempCustomizations).length);
        
        // Get the current saved content with all customizations
        console.log('🔨 Generating savedContent from template...');
        const savedContent = await getSavedTemplateContent();
        console.log('✅ savedContent generated, length:', savedContent.length);
        console.log('📄 First 200 chars:', savedContent.substring(0, 200));
        
        // Check if we're editing an existing website (from URL parameter)
        const urlParams = new URLSearchParams(window.location.search);
        let websiteId = urlParams.get('websiteId');
        
        console.log('🔍 websiteId from URL:', websiteId);
        
        if (!websiteId) {
          // Check if user already has a website for this template
          console.log('🔍 No URL websiteId, querying database...');
          const websitesRef = collection(db, 'userWebsites');
          const q = query(
            websitesRef,
            where('userId', '==', currentUser.uid),
            where('templateId', '==', templateId)
          );
          
          const querySnapshot = await getDocs(q);
          console.log('🔍 Query results:', querySnapshot.size, 'websites found');
          if (!querySnapshot.empty) {
            // Use the first existing website
            websiteId = querySnapshot.docs[0].id;
            console.log('✅ Found existing website in database:', websiteId);
            const existingData = querySnapshot.docs[0].data();
            console.log('📊 Existing customizations count:', Object.keys(existingData.customizations || {}).length);
            console.log('📊 Existing savedContent length:', existingData.savedContent?.length || 0);
          } else {
            console.log('📝 No existing website found, will create new');
          }
        }
        
        // Filter out large base64 data from customizations (images)
        // These will be in savedContent, but are too large for Firestore customizations field
        const filteredCustomizations: Record<string, string> = {};
        Object.entries(committedValues).forEach(([key, value]) => {
          // Skip base64 image data (starts with "data:image")
          if (typeof value === 'string' && value.startsWith('data:image')) {
            console.log('⚠️ Skipping large image data for key:', key, '(length:', value.length, ')');
          } else {
            filteredCustomizations[key] = value;
          }
        });
        
        const dataToSave = {
          templateId,
          templateName: template.name,
          customizations: filteredCustomizations,
          savedContent,
          userId: currentUser.uid,
          websiteName: `${template.name} - Customized`,
          updatedAt: new Date().toISOString(),
          status: 'draft',
          isPublished: false
        };
        
        console.log('💾 Data to save:', {
          ...dataToSave,
          savedContent: `${dataToSave.savedContent.substring(0, 100)}... (${dataToSave.savedContent.length} chars)`,
          customizationsCount: Object.keys(dataToSave.customizations).length
        });
        
        if (websiteId) {
          // Update existing website
          console.log('📝 Updating existing website:', websiteId);
          // Use merge: true to work offline - Firebase will queue and sync when online
          await setDoc(doc(db, 'userWebsites', websiteId), dataToSave, { merge: true });
          
          console.log('✅ Website updated with ID:', websiteId);
          console.log('💾 Changes queued for sync (will sync when online if offline)');
        } else {
          // Create new website
          websiteId = `website_${currentUser.uid}_${templateId}_${Date.now()}`;
          console.log('➕ Creating new website:', websiteId);
          await setDoc(doc(db, 'userWebsites', websiteId), {
            ...dataToSave,
            createdAt: new Date().toISOString(),
          });
          
          console.log('✅ New website created with ID:', websiteId);
          console.log('💾 Changes queued for sync (will sync when online if offline)');
          
          // Update URL to include websiteId so future saves update this website
          window.history.replaceState(null, '', `?websiteId=${websiteId}`);
          console.log('🔗 URL updated with websiteId');
        }
        
        // Clear temp customizations since they're now saved
        setTempCustomizations({});
        
        console.log('═══════════════════════════════════════════════');
        console.log('🎉 SAVE WEBSITE COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════');
        
        alert('Your website has been saved successfully!');
      }
    } catch (error) {
      console.error('❌═══════════════════════════════════════════════');
      console.error('❌ ERROR SAVING WEBSITE:', error);
      console.error('❌═══════════════════════════════════════════════');
      alert('Failed to save website. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomization = async () => {
    if (!template) return;
    
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Save as user's own website, not modifying the original template
        await setDoc(doc(db, 'userWebsites', `${currentUser.uid}_${Date.now()}`), {
          templateId,
          templateName: template.name,
          customizations,
          userId: currentUser.uid,
          websiteName: `${template.name} - Customized`,
          createdAt: new Date().toISOString(),
          status: 'active'
        });
        
        alert('Your customized website has been saved! This is your own version and won\'t affect the original template.');
      }
    } catch (error) {
      console.error('Error saving customization:', error);
      alert('Failed to save customization. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetCustomizations = () => {
    if (!template) return;
    
    const initialCustomizations: Customization = {};
    template.editableElements?.forEach(element => {
      initialCustomizations[element.id] = element.defaultValue || '';
    });
    setCustomizations(initialCustomizations);
  };

  const generateWebsite = () => {
    // This would generate the final website from template + customizations
    alert('Website generation feature coming soon!');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setModalPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Template not found</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-blue-600 hover:text-blue-700 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit: {template.name}
              </h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={openInNewTab}
                className="btn-secondary"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </button>
              <button
                onClick={saveWebsite}
                disabled={saving}
                className="btn-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Website'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customize</h2>
              <p className="text-sm text-gray-600">Click elements to edit</p>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">How to Edit:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Click</strong> elements to edit text/images</li>
                    <li>• <strong>Ctrl+Click</strong> for background editing</li>
                    <li>• <strong>Ctrl+Click</strong> buttons/links to edit text</li>
                    <li>• <strong>Normal click</strong> buttons/links to test navigation</li>
                    {serviceBlocks && (
                      <li>• <strong>Shift+Click</strong> service cards for full editor</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Editable Elements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Text content</li>
                    <li>• Images & logos</li>
                    <li>• Colors & backgrounds</li>
                    <li>• Navigation links</li>
                  </ul>
                </div>

                {/* Service Manager Section */}
                {serviceBlocks && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          <List className="h-5 w-5 mr-2 text-purple-600" />
                          Services
                        </h4>
                        {servicesSynced && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            ✓ Synced
                          </span>
                        )}
                      </div>
                      
                      {userServices.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {userServices.map((service, index) => (
                            <div 
                              key={service.id}
                              className="bg-white p-2 rounded text-sm flex items-center justify-between"
                            >
                              <span className="font-medium text-gray-800">{service.name}</span>
                              <span className="text-purple-600 font-semibold">${service.price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <button
                          onClick={addServiceCard}
                          className="btn-primary w-full text-sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </button>
                        
                        <button
                          onClick={fetchUserServices}
                          className="btn-secondary w-full text-sm"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {servicesSynced ? 'Refresh Services' : 'Sync with PayFast'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      console.log('Manual click handler setup');
                      // Force retry multiple times
                      for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                          console.log(`Manual setup attempt ${i + 1}`);
                          addClickHandlersToPreview();
                        }, i * 500);
                      }
                    }}
                    className="btn-secondary w-full text-sm mb-3"
                  >
                    🔧 Setup Click Handlers
                  </button>
                  
                  <button
                    onClick={resetCustomizations}
                    className="btn-secondary w-full mb-3"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </button>
                  
                  <button
                    onClick={openInNewTab}
                    className="btn-secondary w-full mb-3"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </button>
                  
                  <button
                    onClick={generateWebsite}
                    className="btn-primary w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Website
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Website Window */}
          <div className="flex-1 bg-gray-100 p-4">
            <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Browser Window Header */}
              <div className="px-4 py-2 flex items-center space-x-2 bg-gray-200">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 mx-4 flex items-center justify-center gap-2">
                  <div className="px-3 py-1 rounded text-sm text-center bg-white text-gray-600">
                    {template?.name || 'Template'}
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    ✏️ EDIT MODE
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Desktop</span>
                </div>
              </div>

              {/* Website Content */}
              <div className="h-full overflow-auto">
                {templateContent ? (
                  <iframe
                    srcDoc={templateContent}
                    className="w-full h-full border-0"
                    title="Template Edit View"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="p-8 text-center h-full flex items-center justify-center">
                    <div>
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Monitor className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Loading Template...
                      </h3>
                      <p className="text-gray-600">
                        Please wait while we load your template.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedElement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md absolute"
            style={{
              left: modalPosition.x === 0 ? '50%' : `${modalPosition.x}px`,
              top: modalPosition.y === 0 ? '50%' : `${modalPosition.y}px`,
              transform: modalPosition.x === 0 ? 'translate(-50%, -50%)' : 'none',
              cursor: isDragging ? 'grabbing' : 'auto'
            }}
          >
            <div 
              className="flex justify-between items-center mb-4 cursor-move"
              onMouseDown={handleMouseDown}
            >
              <h2 className="text-xl font-semibold select-none">Edit Element</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setModalPosition({ x: 0, y: 0 });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedElement.label}
                </label>
                
                {selectedElement.type === 'text' && (
                  <div className="space-y-4">
                    {/* Text Content */}
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Text Content
                       </label>
                       <textarea
                         value={
                           tempCustomizations[`${selectedElement.id}-${selectedElement.index}`] || 
                           committedValues[`${selectedElement.id}-${selectedElement.index}`] || 
                           selectedElement.currentValue
                         }
                         onChange={(e) => {
                           const newValue = e.target.value;
                           const key = `${selectedElement.id}-${selectedElement.index}`;
                           setTempCustomizations(prev => ({
                             ...prev,
                             [key]: newValue
                           }));
                           applyCustomizations(selectedElement, newValue);
                         }}
                         className="input-field min-h-[80px]"
                         placeholder={selectedElement.currentValue}
                       />
                     </div>
                    
                    {/* Button Background Color (only for buttons) */}
                    {selectedElement.selector === 'button' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Button Background Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={
                              tempCustomizations[`${selectedElement.id}-${selectedElement.index}-bg-color`] || 
                              committedValues[`${selectedElement.id}-${selectedElement.index}-bg-color`] || 
                              '#3b82f6'
                            }
                            onChange={(e) => {
                              const key = `${selectedElement.id}-${selectedElement.index}-bg-color`;
                              setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                              applyCustomizations(selectedElement, e.target.value, 'background-color');
                            }}
                            className="w-12 h-10 rounded border-2 border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={
                              tempCustomizations[`${selectedElement.id}-${selectedElement.index}-bg-color`] || 
                              committedValues[`${selectedElement.id}-${selectedElement.index}-bg-color`] || 
                              '#3b82f6'
                            }
                            onChange={(e) => {
                              const key = `${selectedElement.id}-${selectedElement.index}-bg-color`;
                              setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                              applyCustomizations(selectedElement, e.target.value, 'background-color');
                            }}
                            className="flex-1 input-field"
                            placeholder="#3b82f6"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Button Hover Color (only for buttons) */}
                    {selectedElement.selector === 'button' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hover Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={
                              tempCustomizations[`${selectedElement.id}-${selectedElement.index}-hover-color`] || 
                              committedValues[`${selectedElement.id}-${selectedElement.index}-hover-color`] || 
                              '#2563eb'
                            }
                            onChange={(e) => {
                              const key = `${selectedElement.id}-${selectedElement.index}-hover-color`;
                              setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                              // Apply hover color via CSS custom property
                              const element = selectedElement.element;
                              if (element) {
                                element.style.setProperty('--hover-color', e.target.value);
                                element.style.setProperty('--original-bg', element.style.backgroundColor || '#3b82f6');
                              }
                            }}
                            className="w-12 h-10 rounded border-2 border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={
                              tempCustomizations[`${selectedElement.id}-${selectedElement.index}-hover-color`] || 
                              committedValues[`${selectedElement.id}-${selectedElement.index}-hover-color`] || 
                              '#2563eb'
                            }
                            onChange={(e) => {
                              const key = `${selectedElement.id}-${selectedElement.index}-hover-color`;
                              setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                              // Apply hover color via CSS custom property
                              const element = selectedElement.element;
                              if (element) {
                                element.style.setProperty('--hover-color', e.target.value);
                                element.style.setProperty('--original-bg', element.style.backgroundColor || '#3b82f6');
                              }
                            }}
                            className="flex-1 input-field"
                            placeholder="#2563eb"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Button Link (only for buttons) */}
                    {selectedElement.selector === 'button' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Button Link
                        </label>
                        {selectedElement.element?.getAttribute('data-payment-url') ? (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-800">Service Button</span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                              This button is linked to a PayFast service. The link is managed automatically.
                            </p>
                            <p className="text-xs text-green-600">
                              Service URL: {selectedElement.element.getAttribute('data-payment-url')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              className="input-field"
                              value={
                                tempCustomizations[`${selectedElement.id}-${selectedElement.index}-link`] || 
                                committedValues[`${selectedElement.id}-${selectedElement.index}-link`] || 
                                ''
                              }
                              onChange={(e) => {
                                const key = `${selectedElement.id}-${selectedElement.index}-link`;
                                setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                // Apply link to button
                                const element = selectedElement.element;
                                if (element) {
                                  if (e.target.value) {
                                    element.setAttribute('data-href', e.target.value);
                                    element.style.cursor = 'pointer';
                                  } else {
                                    element.removeAttribute('data-href');
                                  }
                                }
                              }}
                              placeholder="https://wa.me/1234567890 or #section-id"
                            />
                            <div className="text-xs text-gray-500 space-y-1">
                              <p>• <strong>WhatsApp:</strong> https://wa.me/1234567890</p>
                              <p>• <strong>Section:</strong> #contact, #services, #about</p>
                              <p>• <strong>External:</strong> https://example.com</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Text Color */}
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Text Color
                       </label>
                       <div className="flex items-center space-x-2">
                         <input
                           type="color"
                           value={
                             tempCustomizations[`${selectedElement.id}-${selectedElement.index}-color`] || 
                             committedValues[`${selectedElement.id}-${selectedElement.index}-color`] || 
                             selectedElement.styles?.color || '#000000'
                           }
                           onChange={(e) => {
                             const key = `${selectedElement.id}-${selectedElement.index}-color`;
                             setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                             applyCustomizations(selectedElement, e.target.value, 'color');
                           }}
                           className="w-12 h-10 rounded border-2 border-gray-300 cursor-pointer"
                         />
                         <input
                           type="text"
                           value={
                             tempCustomizations[`${selectedElement.id}-${selectedElement.index}-color`] || 
                             committedValues[`${selectedElement.id}-${selectedElement.index}-color`] || 
                             selectedElement.styles?.color || '#000000'
                           }
                           onChange={(e) => {
                             const key = `${selectedElement.id}-${selectedElement.index}-color`;
                             setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                             applyCustomizations(selectedElement, e.target.value, 'color');
                           }}
                           className="input-field flex-1 text-sm"
                           placeholder="#000000"
                         />
                       </div>
                     </div>
                    
                    {/* Font Size */}
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Font Size
                       </label>
                       <div className="flex items-center space-x-2">
                         <input
                           type="range"
                           min="10"
                           max="72"
                           value={parseInt(
                             tempCustomizations[`${selectedElement.id}-${selectedElement.index}-fontSize`] || 
                             committedValues[`${selectedElement.id}-${selectedElement.index}-fontSize`] || 
                             selectedElement.styles?.fontSize || '16'
                           )}
                           onChange={(e) => {
                             const newValue = e.target.value + 'px';
                             const key = `${selectedElement.id}-${selectedElement.index}-fontSize`;
                             setTempCustomizations(prev => ({ ...prev, [key]: newValue }));
                             applyCustomizations(selectedElement, newValue, 'fontSize');
                           }}
                           className="flex-1"
                         />
                         <input
                           type="number"
                           min="10"
                           max="72"
                           value={parseInt(
                             tempCustomizations[`${selectedElement.id}-${selectedElement.index}-fontSize`] || 
                             committedValues[`${selectedElement.id}-${selectedElement.index}-fontSize`] || 
                             selectedElement.styles?.fontSize || '16'
                           )}
                           onChange={(e) => {
                             const newValue = e.target.value + 'px';
                             const key = `${selectedElement.id}-${selectedElement.index}-fontSize`;
                             setTempCustomizations(prev => ({ ...prev, [key]: newValue }));
                             applyCustomizations(selectedElement, newValue, 'fontSize');
                           }}
                           className="input-field w-20 text-sm"
                           placeholder="16"
                         />
                       </div>
                     </div>
                    
                    {/* Font Weight & Style */}
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Font Weight
                         </label>
                         <select
                           value={
                             tempCustomizations[`${selectedElement.id}-${selectedElement.index}-fontWeight`] || 
                             committedValues[`${selectedElement.id}-${selectedElement.index}-fontWeight`] || 
                             selectedElement.styles?.fontWeight || '400'
                           }
                           onChange={(e) => {
                             const key = `${selectedElement.id}-${selectedElement.index}-fontWeight`;
                             setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                             applyCustomizations(selectedElement, e.target.value, 'fontWeight');
                           }}
                           className="input-field text-sm"
                         >
                           <option value="300">Light</option>
                           <option value="400">Normal</option>
                           <option value="600">Semi Bold</option>
                           <option value="700">Bold</option>
                           <option value="900">Black</option>
                         </select>
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Font Style
                         </label>
                         <select
                           value={
                             tempCustomizations[`${selectedElement.id}-${selectedElement.index}-fontStyle`] || 
                             committedValues[`${selectedElement.id}-${selectedElement.index}-fontStyle`] || 
                             selectedElement.styles?.fontStyle || 'normal'
                           }
                           onChange={(e) => {
                             const key = `${selectedElement.id}-${selectedElement.index}-fontStyle`;
                             setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                             applyCustomizations(selectedElement, e.target.value, 'fontStyle');
                           }}
                           className="input-field text-sm"
                         >
                           <option value="normal">Normal</option>
                           <option value="italic">Italic</option>
                         </select>
                       </div>
                     </div>
                     
                     {/* Text Decoration */}
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Text Decoration
                       </label>
                       <select
                         value={
                           tempCustomizations[`${selectedElement.id}-${selectedElement.index}-textDecoration`] || 
                           committedValues[`${selectedElement.id}-${selectedElement.index}-textDecoration`] || 
                           selectedElement.styles?.textDecoration || 'none'
                         }
                         onChange={(e) => {
                           const key = `${selectedElement.id}-${selectedElement.index}-textDecoration`;
                           setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                           applyCustomizations(selectedElement, e.target.value, 'textDecoration');
                         }}
                         className="input-field text-sm"
                       >
                         <option value="none">None</option>
                         <option value="underline">Underline</option>
                         <option value="line-through">Strikethrough</option>
                       </select>
                     </div>
                  </div>
                )}
                
                {(selectedElement.type === 'color' || selectedElement.type === 'style') && (
                  <div className="space-y-4">
                    {/* Background Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                         <button
                           onClick={() => {
                             const key = `${selectedElement.id}-bgType`;
                             setTempCustomizations(prev => ({ ...prev, [key]: 'color' }));
                           }}
                           className={`px-3 py-2 text-sm rounded border-2 ${
                             (tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`] || 'color') === 'color'
                               ? 'border-blue-500 bg-blue-50 text-blue-700'
                               : 'border-gray-300 hover:border-gray-400'
                           }`}
                         >
                           🎨 Color
                         </button>
                         <button
                           onClick={() => {
                             const key = `${selectedElement.id}-bgType`;
                             setTempCustomizations(prev => ({ ...prev, [key]: 'gradient' }));
                           }}
                           className={`px-3 py-2 text-sm rounded border-2 ${
                             (tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`]) === 'gradient'
                               ? 'border-blue-500 bg-blue-50 text-blue-700'
                               : 'border-gray-300 hover:border-gray-400'
                           }`}
                         >
                           🌈 Gradient
                         </button>
                         <button
                           onClick={() => {
                             const key = `${selectedElement.id}-bgType`;
                             setTempCustomizations(prev => ({ ...prev, [key]: 'image' }));
                           }}
                           className={`px-3 py-2 text-sm rounded border-2 ${
                             (tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`]) === 'image'
                               ? 'border-blue-500 bg-blue-50 text-blue-700'
                               : 'border-gray-300 hover:border-gray-400'
                           }`}
                         >
                           🖼️ Image
                         </button>
                      </div>
                    </div>

                     {/* Solid Color */}
                     {(!(tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`]) || (tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`]) === 'color') && (
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Background Color
                         </label>
                         <div className="flex items-center space-x-3">
                           <input
                             type="color"
                             value={
                               tempCustomizations[`${selectedElement.id}-${selectedElement.index}`] || 
                               committedValues[`${selectedElement.id}-${selectedElement.index}`] || 
                               selectedElement.currentValue
                             }
                             onChange={(e) => {
                               const newValue = e.target.value;
                               const key = `${selectedElement.id}-${selectedElement.index}`;
                               setTempCustomizations(prev => ({ ...prev, [key]: newValue }));
                               
                               // Apply solid color directly
                               if (selectedElement.element) {
                                 const el = selectedElement.element as HTMLElement;
                                 el.style.background = newValue;
                                 el.style.backgroundColor = newValue;
                                 el.style.backgroundImage = 'none';
                               }
                             }}
                             className="w-20 h-10 rounded border-2 border-gray-300 cursor-pointer"
                           />
                           <input
                             type="text"
                             value={
                               tempCustomizations[`${selectedElement.id}-${selectedElement.index}`] || 
                               committedValues[`${selectedElement.id}-${selectedElement.index}`] || 
                               selectedElement.currentValue
                             }
                             onChange={(e) => {
                               const newValue = e.target.value;
                               const key = `${selectedElement.id}-${selectedElement.index}`;
                               setTempCustomizations(prev => ({ ...prev, [key]: newValue }));
                               
                               // Apply solid color directly
                               if (selectedElement.element) {
                                 const el = selectedElement.element as HTMLElement;
                                 el.style.background = newValue;
                                 el.style.backgroundColor = newValue;
                                 el.style.backgroundImage = 'none';
                               }
                             }}
                             className="input-field flex-1"
                             placeholder="#000000 or rgb(0,0,0)"
                           />
                         </div>
                       </div>
                     )}

                     {/* Gradient */}
                     {(tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`]) === 'gradient' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Gradient Colors
                        </label>
                        <div className="space-y-2">
                           <div className="flex items-center space-x-2">
                             <span className="text-xs text-gray-600 w-16">Start:</span>
                             <input
                               type="color"
                               value={tempCustomizations[`${selectedElement.id}-gradient-start`] || committedValues[`${selectedElement.id}-gradient-start`] || '#667eea'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-gradient-start`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 const angle = tempCustomizations[`${selectedElement.id}-gradient-angle`] || committedValues[`${selectedElement.id}-gradient-angle`] || '135deg';
                                 const gradient = `linear-gradient(${angle}, ${e.target.value}, ${tempCustomizations[`${selectedElement.id}-gradient-end`] || committedValues[`${selectedElement.id}-gradient-end`] || '#764ba2'})`;
                                 
                                 // Apply gradient directly
                                 if (selectedElement.element) {
                                   const el = selectedElement.element as HTMLElement;
                                   el.style.background = gradient;
                                   el.style.backgroundImage = gradient;
                                 }
                               }}
                               className="w-16 h-8 rounded border-2 border-gray-300 cursor-pointer"
                             />
                             <input
                               type="text"
                               value={tempCustomizations[`${selectedElement.id}-gradient-start`] || committedValues[`${selectedElement.id}-gradient-start`] || '#667eea'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-gradient-start`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 const angle = tempCustomizations[`${selectedElement.id}-gradient-angle`] || committedValues[`${selectedElement.id}-gradient-angle`] || '135deg';
                                 const gradient = `linear-gradient(${angle}, ${e.target.value}, ${tempCustomizations[`${selectedElement.id}-gradient-end`] || committedValues[`${selectedElement.id}-gradient-end`] || '#764ba2'})`;
                                 
                                 if (selectedElement.element) {
                                   const el = selectedElement.element as HTMLElement;
                                   el.style.background = gradient;
                                   el.style.backgroundImage = gradient;
                                 }
                               }}
                               className="input-field flex-1 text-sm"
                               placeholder="#667eea"
                             />
                           </div>
                           <div className="flex items-center space-x-2">
                             <span className="text-xs text-gray-600 w-16">End:</span>
                             <input
                               type="color"
                               value={tempCustomizations[`${selectedElement.id}-gradient-end`] || committedValues[`${selectedElement.id}-gradient-end`] || '#764ba2'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-gradient-end`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 const angle = tempCustomizations[`${selectedElement.id}-gradient-angle`] || committedValues[`${selectedElement.id}-gradient-angle`] || '135deg';
                                 const gradient = `linear-gradient(${angle}, ${tempCustomizations[`${selectedElement.id}-gradient-start`] || committedValues[`${selectedElement.id}-gradient-start`] || '#667eea'}, ${e.target.value})`;
                                 
                                 if (selectedElement.element) {
                                   const el = selectedElement.element as HTMLElement;
                                   el.style.background = gradient;
                                   el.style.backgroundImage = gradient;
                                 }
                               }}
                               className="w-16 h-8 rounded border-2 border-gray-300 cursor-pointer"
                             />
                             <input
                               type="text"
                               value={tempCustomizations[`${selectedElement.id}-gradient-end`] || committedValues[`${selectedElement.id}-gradient-end`] || '#764ba2'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-gradient-end`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 const angle = tempCustomizations[`${selectedElement.id}-gradient-angle`] || committedValues[`${selectedElement.id}-gradient-angle`] || '135deg';
                                 const gradient = `linear-gradient(${angle}, ${tempCustomizations[`${selectedElement.id}-gradient-start`] || committedValues[`${selectedElement.id}-gradient-start`] || '#667eea'}, ${e.target.value})`;
                                 
                                 if (selectedElement.element) {
                                   const el = selectedElement.element as HTMLElement;
                                   el.style.background = gradient;
                                   el.style.backgroundImage = gradient;
                                 }
                               }}
                               className="input-field flex-1 text-sm"
                               placeholder="#764ba2"
                             />
                           </div>
                        </div>
                         <div>
                           <label className="block text-xs text-gray-600 mb-1">Direction</label>
                           <select
                             value={tempCustomizations[`${selectedElement.id}-gradient-angle`] || committedValues[`${selectedElement.id}-gradient-angle`] || '135deg'}
                             onChange={(e) => {
                               const key = `${selectedElement.id}-gradient-angle`;
                               setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                               const gradient = `linear-gradient(${e.target.value}, ${tempCustomizations[`${selectedElement.id}-gradient-start`] || committedValues[`${selectedElement.id}-gradient-start`] || '#667eea'}, ${tempCustomizations[`${selectedElement.id}-gradient-end`] || committedValues[`${selectedElement.id}-gradient-end`] || '#764ba2'})`;
                               
                               if (selectedElement.element) {
                                 const el = selectedElement.element as HTMLElement;
                                 el.style.background = gradient;
                                 el.style.backgroundImage = gradient;
                               }
                             }}
                             className="input-field text-sm"
                           >
                             <option value="to bottom">Top to Bottom</option>
                             <option value="to right">Left to Right</option>
                             <option value="135deg">Diagonal ↘</option>
                             <option value="45deg">Diagonal ↗</option>
                           </select>
                         </div>
                      </div>
                    )}

                     {/* Background Image */}
                     {(tempCustomizations[`${selectedElement.id}-bgType`] || committedValues[`${selectedElement.id}-bgType`]) === 'image' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Background Image
                          </label>
                           <input
                             type="file"
                             accept="image/*"
                             onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onload = (e) => {
                                   const imageUrl = e.target?.result as string;
                                   const key = `${selectedElement.id}-bg-image`;
                                   setTempCustomizations(prev => ({ ...prev, [key]: imageUrl }));
                                   
                                   // Apply background image with properties
                                   if (selectedElement.element) {
                                     const el = selectedElement.element as HTMLElement;
                                     el.style.backgroundImage = `url(${imageUrl})`;
                                     el.style.backgroundSize = tempCustomizations[`${selectedElement.id}-bg-size`] || committedValues[`${selectedElement.id}-bg-size`] || 'cover';
                                     el.style.backgroundPosition = tempCustomizations[`${selectedElement.id}-bg-position`] || committedValues[`${selectedElement.id}-bg-position`] || 'center';
                                     el.style.backgroundRepeat = 'no-repeat';
                                   }
                                 };
                                 reader.readAsDataURL(file);
                               }
                             }}
                             className="input-field"
                           />
                           {(tempCustomizations[`${selectedElement.id}-bg-image`] || committedValues[`${selectedElement.id}-bg-image`]) && (
                             <img 
                               src={tempCustomizations[`${selectedElement.id}-bg-image`] || committedValues[`${selectedElement.id}-bg-image`]} 
                               alt="Background preview" 
                               className="w-full h-32 object-cover rounded border mt-2"
                             />
                           )}
                        </div>

                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <label className="block text-xs text-gray-600 mb-1">Size</label>
                             <select
                               value={tempCustomizations[`${selectedElement.id}-bg-size`] || committedValues[`${selectedElement.id}-bg-size`] || 'cover'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-bg-size`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 if (selectedElement.element) {
                                   (selectedElement.element as HTMLElement).style.backgroundSize = e.target.value;
                                 }
                               }}
                               className="input-field text-sm"
                             >
                               <option value="cover">Cover</option>
                               <option value="contain">Contain</option>
                               <option value="auto">Auto</option>
                             </select>
                           </div>
                           <div>
                             <label className="block text-xs text-gray-600 mb-1">Position</label>
                             <select
                               value={tempCustomizations[`${selectedElement.id}-bg-position`] || committedValues[`${selectedElement.id}-bg-position`] || 'center'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-bg-position`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 if (selectedElement.element) {
                                   (selectedElement.element as HTMLElement).style.backgroundPosition = e.target.value;
                                 }
                               }}
                               className="input-field text-sm"
                             >
                               <option value="center">Center</option>
                               <option value="top">Top</option>
                               <option value="bottom">Bottom</option>
                               <option value="left">Left</option>
                               <option value="right">Right</option>
                             </select>
                           </div>
                         </div>

                         {/* Optional overlay */}
                         <div>
                           <label className="flex items-center space-x-2 text-sm">
                             <input
                               type="checkbox"
                               checked={(tempCustomizations[`${selectedElement.id}-bg-overlay`] || committedValues[`${selectedElement.id}-bg-overlay`]) === 'true'}
                               onChange={(e) => {
                                 const key = `${selectedElement.id}-bg-overlay`;
                                 setTempCustomizations(prev => ({ ...prev, [key]: e.target.checked ? 'true' : 'false' }));
                                 
                                 if (selectedElement.element) {
                                   const el = selectedElement.element as HTMLElement;
                                   if (e.target.checked) {
                                     el.style.position = 'relative';
                                     el.style.setProperty('--overlay-color', tempCustomizations[`${selectedElement.id}-overlay-color`] || committedValues[`${selectedElement.id}-overlay-color`] || 'rgba(0,0,0,0.5)');
                                   }
                                 }
                               }}
                               className="rounded"
                             />
                             <span>Add color overlay</span>
                           </label>
                           {(tempCustomizations[`${selectedElement.id}-bg-overlay`] || committedValues[`${selectedElement.id}-bg-overlay`]) === 'true' && (
                             <div className="mt-2 flex items-center space-x-2">
                               <input
                                 type="color"
                                 value={(tempCustomizations[`${selectedElement.id}-overlay-color`] || committedValues[`${selectedElement.id}-overlay-color`])?.split('(')[1]?.split(',')[0] || '#000000'}
                                 onChange={(e) => {
                                   const key = `${selectedElement.id}-overlay-color`;
                                   const opacity = tempCustomizations[`${selectedElement.id}-overlay-opacity`] || committedValues[`${selectedElement.id}-overlay-opacity`] || '0.5';
                                   const rgba = `rgba(${parseInt(e.target.value.slice(1,3), 16)}, ${parseInt(e.target.value.slice(3,5), 16)}, ${parseInt(e.target.value.slice(5,7), 16)}, ${opacity})`;
                                   setTempCustomizations(prev => ({ ...prev, [key]: rgba }));
                                 }}
                                 className="w-12 h-8 rounded border-2 border-gray-300 cursor-pointer"
                               />
                               <input
                                 type="range"
                                 min="0"
                                 max="1"
                                 step="0.1"
                                 value={tempCustomizations[`${selectedElement.id}-overlay-opacity`] || committedValues[`${selectedElement.id}-overlay-opacity`] || '0.5'}
                                 onChange={(e) => {
                                   const key = `${selectedElement.id}-overlay-opacity`;
                                   setTempCustomizations(prev => ({ ...prev, [key]: e.target.value }));
                                 }}
                                 className="flex-1"
                               />
                               <span className="text-xs text-gray-600 w-12">
                                 {Math.round((parseFloat(tempCustomizations[`${selectedElement.id}-overlay-opacity`] || committedValues[`${selectedElement.id}-overlay-opacity`] || '0.5') * 100))}%
                               </span>
                             </div>
                           )}
                         </div>
                      </div>
                    )}

                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      💡 Tip: You used <kbd className="px-1 py-0.5 bg-white rounded text-xs font-mono">Ctrl</kbd> + Click to select this background
                    </p>
                  </div>
                )}
                
                 {selectedElement.type === 'image' && (
                   <div className="space-y-3">
                     <input
                       type="file"
                       accept="image/*"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (e) => {
                             const newValue = e.target?.result as string;
                             const key = `${selectedElement.id}-${selectedElement.index}`;
                             setTempCustomizations(prev => ({
                               ...prev,
                               [key]: newValue
                             }));
                             applyCustomizations(selectedElement, newValue);
                           };
                           reader.readAsDataURL(file);
                         }
                       }}
                       className="input-field"
                     />
                     {(tempCustomizations[`${selectedElement.id}-${selectedElement.index}`] || committedValues[`${selectedElement.id}-${selectedElement.index}`]) && (
                       <img 
                         src={tempCustomizations[`${selectedElement.id}-${selectedElement.index}`] || committedValues[`${selectedElement.id}-${selectedElement.index}`]} 
                         alt="Preview" 
                         className="w-full h-32 object-cover rounded border"
                       />
                     )}
                   </div>
                 )}
              </div>
            </div>

             <div className="flex justify-end space-x-3 mt-6">
               <button
                 onClick={() => {
                   // Cancel - revert all temporary changes
                   const elementKey = `${selectedElement.id}-${selectedElement.index}`;
                   
                   // Revert to committed values
                   Object.keys(tempCustomizations).forEach(key => {
                     if (key.startsWith(elementKey)) {
                       const committedValue = committedValues[key];
                       if (committedValue) {
                         // Reapply the committed value
                         const property = key.split('-').pop();
                         if (property) {
                           applyCustomizations(selectedElement, committedValue, property);
                         }
                       }
                     }
                   });
                   
                   setTempCustomizations({});
                   setShowEditModal(false);
                   setModalPosition({ x: 0, y: 0 });
                 }}
                 className="btn-secondary"
               >
                 Cancel
               </button>
               <button
                 onClick={() => {
                   // Commit all temporary changes
                   setCommittedValues(prev => ({
                     ...prev,
                     ...tempCustomizations
                   }));
                   
                   // Also update main customizations for saving
                   setCustomizations(prev => ({
                     ...prev,
                     ...tempCustomizations
                   }));
                   
                   setTempCustomizations({});
                   setShowEditModal(false);
                   setModalPosition({ x: 0, y: 0 });
                 }}
                 className="btn-primary"
               >
                 ✓ Done
               </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Service Editor Modal */}
      {showServiceEditor && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <List className="h-6 w-6 mr-2 text-purple-600" />
                Edit Service
              </h2>
              <button
                onClick={() => {
                  setShowServiceEditor(false);
                  setSelectedService(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {selectedService.synced && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  ✓ This service is synced with PayFast. Changes to price will be display-only.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Service Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name
                </label>
                <input
                  type="text"
                  value={selectedService.name}
                  onChange={(e) => {
                    setSelectedService(prev => ({ ...prev, name: e.target.value }));
                    const titleElement = selectedService.element.querySelector('h3, .service-title, [class*="title"]');
                    if (titleElement) titleElement.textContent = e.target.value;
                  }}
                  className="input-field"
                  placeholder="e.g., Premium Haircut"
                />
              </div>
              
              {/* Service Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={selectedService.description}
                  onChange={(e) => {
                    setSelectedService(prev => ({ ...prev, description: e.target.value }));
                    const descElement = selectedService.element.querySelector('p, .service-description, [class*="description"]');
                    if (descElement) descElement.textContent = e.target.value;
                  }}
                  className="input-field"
                  rows={3}
                  placeholder="Describe your service..."
                />
              </div>
              
              {/* Service Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($)
                  {selectedService.synced && (
                    <span className="text-xs text-gray-500 ml-2">(Display only - synced with PayFast)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedService.price}
                  onChange={(e) => {
                    setSelectedService(prev => ({ ...prev, price: e.target.value }));
                    const priceElement = selectedService.element.querySelector('.price, [class*="price"], .cost');
                    if (priceElement) priceElement.textContent = `$${e.target.value}`;
                  }}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
              
              {/* PayFast Link Selection (if not synced) */}
              {!selectedService.synced && userServices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link to PayFast Service (Optional)
                  </label>
                  <select
                    value={selectedService.id || ''}
                    onChange={(e) => {
                      const serviceId = e.target.value;
                      const linkedService = userServices.find(s => s.id === serviceId);
                      
                      if (linkedService) {
                        setSelectedService(prev => ({ 
                          ...prev, 
                          id: serviceId,
                          synced: true
                        }));
                        
                        selectedService.element.setAttribute('data-service-id', serviceId);
                        selectedService.element.setAttribute('data-synced', 'true');
                        
                        const buttonElement = selectedService.element.querySelector('button, a.btn, .button');
                        if (buttonElement) {
                          buttonElement.setAttribute('data-payment-url', linkedService.paymentUrl);
                        }
                      }
                    }}
                    className="input-field"
                  >
                    <option value="">No PayFast link</option>
                    {userServices.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${service.price}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Link this card to a PayFast service for payment processing
                  </p>
                </div>
              )}
              
              {/* Delete Service Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this service card?')) {
                      selectedService.element.remove();
                      setShowServiceEditor(false);
                      setSelectedService(null);
                      
                      // Re-setup click handlers
                      setTimeout(() => {
                        addClickHandlersToPreview();
                      }, 500);
                    }
                  }}
                  className="btn-secondary w-full text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Service Card
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowServiceEditor(false);
                  setSelectedService(null);
                }}
                className="btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
