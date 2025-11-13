# 🔧 Troubleshooting: Website Loading Issues - FIXED

## Overview

This document explains the loading sequence issues that were encountered and how they were resolved in the template editor system.

---

## 🚨 Problems Identified

### **1. Website Override Issue**
**Problem:** When opening an existing saved website, it would briefly show correctly, then immediately be replaced with the original template.

**Root Cause:**
- Multiple `useEffect` hooks triggering in wrong order
- Template loading logic executing even when loading an existing website
- No safeguards to prevent template override

**Symptoms:**
```
✅ Existing website loaded correctly
❌ Template loading triggered
❌ Saved content replaced with base template
❌ User edits appeared lost
```

---

### **2. CSS Injection Infinite Loop**
**Problem:** CSS was being injected repeatedly, causing console spam and performance issues.

**Root Cause:**
- `MutationObserver` watching the canvas head for changes
- CSS injection triggered the observer
- Observer triggered another CSS injection
- Created infinite loop

**Symptoms:**
```
🎨 Injecting CSS...
🎨 Injecting CSS...
🎨 Injecting CSS...
(repeated thousands of times)
```

---

### **3. Broken Image References**
**Problem:** Template images showing as broken/404 errors.

**Root Cause:**
- Template HTML had hardcoded paths like `images/portrait-1.jpg`
- These files weren't included in the template ZIP
- No fallback placeholder for missing images
- Image replacement patterns didn't catch all path variations

**Symptoms:**
```
❌ GET /images/portrait-1.jpg 404 (Not Found)
❌ GET /images/hero-bg.jpg 404 (Not Found)
🖼️ Broken image icons in editor
```

---

### **4. Duplicate Loading Calls**
**Problem:** Multiple parts of the system trying to load content simultaneously.

**Root Cause:**
- URL parameter check in multiple places
- Template loading and website loading conflicting
- No coordination between different loading paths

**Symptoms:**
```
📥 Loading template...
📂 Loading website...
📥 Loading template again...
❌ Content conflict and override
```

---

## ✅ Solutions Implemented

### **Fix 1: Loading Sequence Control**

**Added safeguards to prevent template override:**

```typescript
// BEFORE (problematic)
useEffect(() => {
  if (editor && templateId) {
    // Always loads template, even for existing websites
    loadTemplate(userId, true);
  }
}, [editor, templateId]);

// AFTER (fixed)
useEffect(() => {
  if (!editor || !templateId) return;
  
  const existingWebsiteId = new URLSearchParams(window.location.search).get('websiteId');
  
  if (existingWebsiteId) {
    // Load template data ONLY (not into editor)
    loadTemplate(undefined, false);
    return;
  }
  
  // Only load template into editor for NEW websites
  if (isNewWebsite) {
    loadTemplate(userId, true);
  }
}, [editor, templateId, isNewWebsite]);
```

**Added safeguard in loadTemplate function:**

```typescript
const loadTemplate = async (uid: string | undefined, loadIntoEditor: boolean = true) => {
  // SAFEGUARD: Don't override existing website
  if (websiteId && !isNewWebsite && loadIntoEditor) {
    console.warn('⚠️ Blocked template load - existing website already loaded');
    return;
  }
  
  // Continue with template load...
};
```

---

### **Fix 2: CSS Injection Control**

**Removed MutationObserver and added injection tracking:**

```typescript
// Added refs to track injection state
const hasInjectedCSSRef = useRef(false);

// Inject CSS only once
const injectCSS = () => {
  if (hasInjectedCSSRef.current) {
    console.log('⚠️ CSS already injected, skipping');
    return;
  }
  
  const canvas = editor.Canvas.getDocument();
  if (canvas) {
    const styleElement = canvas.createElement('style');
    styleElement.id = 'template-external-styles';
    styleElement.setAttribute('data-gjs', 'external');
    styleElement.textContent = fullCss;
    
    canvas.head.insertBefore(styleElement, canvas.head.firstChild);
    
    hasInjectedCSSRef.current = true; // Mark as injected
    console.log('✅ CSS injected once');
  }
};
```

---

### **Fix 3: Comprehensive Image Handling**

**Enhanced image replacement with multiple path variations:**

```typescript
// Store images with all path variations
imageFiles[justFileName] = dataUrl;
imageFiles[fullPath] = dataUrl;
imageFiles[fileName.replace(/^\.\//, '')] = dataUrl;

// Comprehensive replacement patterns
const patterns = [
  new RegExp(`src=["']images/${escapedFilename}["']`, 'gi'),
  new RegExp(`src=["']\.\/images/${escapedFilename}["']`, 'gi'),
  new RegExp(`src=["']\.\./images/${escapedFilename}["']`, 'gi'),
  new RegExp(`src=["']/${escapedFilename}["']`, 'gi'),
  new RegExp(`src=["']${escapedFilename}["']`, 'gi'),
  // CSS patterns
  new RegExp(`url\\(["']?images/${escapedFilename}["']?\\)`, 'gi'),
  new RegExp(`url\\(["']?\.\/images/${escapedFilename}["']?\\)`, 'gi'),
  // ... more patterns
];
```

**Added placeholder fallback for missing images:**

```typescript
// Detect broken images
const brokenImageMatches = processedHtml.match(/src=["'][^"']*?(images\/[^"']+)["']/gi);

if (brokenImageMatches && brokenImageMatches.length > 0) {
  console.warn(`⚠️ Found ${brokenImageMatches.length} broken images`);
  
  // Replace with SVG placeholder
  const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3EImage Not Found%3C/text%3E%3C/svg%3E';
  
  processedHtml = processedHtml.replace(/src=["']images\/[^"']+["']/gi, `src="${placeholder}"`);
}
```

**Added CSS background image handling:**

```typescript
// Replace image references in CSS
if (cssContent && Object.keys(uniqueFiles).length > 0) {
  for (const [filename, dataUrl] of Object.entries(uniqueFiles)) {
    const cssPatterns = [
      new RegExp(`url\\(["']?images/${escapedFilename}["']?\\)`, 'gi'),
      new RegExp(`url\\(["']?\.\/images/${escapedFilename}["']?\\)`, 'gi'),
      // ... more patterns
    ];
    
    cssPatterns.forEach(pattern => {
      cssContent = cssContent.replace(pattern, `url('${dataUrl}')`);
    });
  }
  
  // Replace broken CSS images with placeholder
  const cssPlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3C/svg%3E';
  cssContent = cssContent.replace(/url\(["']?(?:\.\.?\/)?images\/[^)"']+["']?\)/gi, `url('${cssPlaceholder}')`);
}
```

---

### **Fix 4: Loading Coordination**

**Added tracking refs to prevent duplicate loads:**

```typescript
const hasLoadedWebsiteRef = useRef(false);
const hasInjectedCSSRef = useRef(false);

// Check before loading
useEffect(() => {
  if (editor && websiteId && !isNewWebsite && templateData && !hasLoadedWebsiteRef.current) {
    hasLoadedWebsiteRef.current = true;
    loadExistingWebsite(websiteId);
  }
}, [editor, websiteId, isNewWebsite, templateData]);
```

**Clear logging for debugging:**

```typescript
console.log('📥 Load template useEffect called', {
  editor: !!editor,
  templateId,
  isNewWebsite,
  websiteId
});
```

---

## 🎯 How It Works Now

### **Loading Flow for NEW Website:**

```
1. User clicks "Use Template"
2. Editor initializes (GrapesJS)
3. Template ID extracted from URL
4. isNewWebsite = true
5. Load template data from Firestore
6. Extract ZIP contents (HTML, CSS, JS, images)
7. Convert images to base64
8. Replace all image paths
9. Inject CSS into canvas
10. Load HTML components
11. User can edit ✅
```

### **Loading Flow for EXISTING Website:**

```
1. User clicks "Edit Website"
2. Editor initializes (GrapesJS)
3. Website ID extracted from URL
4. isNewWebsite = false
5. Load template data (for CSS/JS) - NOT into editor
6. Load saved website from Firestore
7. Inject COMBINED CSS (template + user)
8. Load saved HTML components
9. User sees their edited version ✅
```

### **Key Differences:**

| Aspect | New Website | Existing Website |
|--------|-------------|------------------|
| Template Load | ✅ Yes, into editor | ❌ Data only, not into editor |
| Website Load | ❌ No | ✅ Yes, from Firestore |
| CSS Source | Template CSS only | Template CSS + User CSS |
| HTML Source | Template HTML | Saved HTML |

---

## 🧪 Testing the Fixes

### **Test Case 1: Load New Template**
```
1. Go to /dashboard/templates
2. Click "Edit" on a template
3. No websiteId in URL
4. Should load template into editor ✅
5. Should show all images (or placeholders) ✅
6. Should inject CSS once ✅
```

**Expected Console Output:**
```
🎨 Initializing GrapesJS editor...
✅ GrapesJS editor initialized
📥 Load template useEffect called
📥 Starting auth state listener for NEW website...
📋 Loading template data into editor for NEW website...
📦 All files in ZIP: [...]
📷 Converted image: photo1.jpg (stored as multiple paths)
✅ Total image files extracted: 8 (with variations)
🔄 Processing 8 unique images for replacement
✅ Replaced 12 occurrence(s) of hero-bg.jpg
⚠️ Found 3 broken image references
🔄 Replaced broken images with placeholder
✅ Injected CSS as EXTERNAL stylesheet
✅ Template loading complete
```

---

### **Test Case 2: Load Existing Website**
```
1. Go to /dashboard/websites
2. Click "Edit" on saved website
3. websiteId present in URL
4. Should load saved website ✅
5. Should NOT override with template ✅
6. Should show user's edits ✅
```

**Expected Console Output:**
```
🎨 Initializing GrapesJS editor...
✅ GrapesJS editor initialized
📥 Load template useEffect called
📂 Found existing website in URL, loading template data only (NOT into editor)
📥 Loading template... loadIntoEditor: false
📂 Loading website: website_abc123
✅ Website loaded: My Custom Site
🎨 Loading website into editor...
📐 Saved CSS length: 15000
📄 Saved HTML length: 8500
📄 Loading HTML components...
✅ HTML loaded into editor
🎨 Injecting CSS directly into canvas...
✅ CSS injected directly into canvas
⚠️ CSS already injected, skipping duplicate injection
✅ Website loading initiated with CSS injection
```

---

### **Test Case 3: Save and Reload**
```
1. Load template
2. Make edits (change text, upload image)
3. Click "Save Website"
4. Reload page
5. Should show edits, not original template ✅
```

---

## 📊 Performance Improvements

### **Before Fixes:**
- ❌ 1000+ CSS injection logs
- ❌ Multiple template loads per session
- ❌ Broken images causing 404 spam
- ❌ User edits lost on reload

### **After Fixes:**
- ✅ Single CSS injection
- ✅ One template load per session
- ✅ Images replaced or placeholders shown
- ✅ User edits persist correctly

---

## 🔍 Debugging Tips

### **Check Loading State:**
```javascript
// In browser console
console.log({
  websiteId: websiteId,
  isNewWebsite: isNewWebsite,
  hasLoadedWebsite: hasLoadedWebsiteRef.current,
  hasInjectedCSS: hasInjectedCSSRef.current,
  templateData: !!templateData,
  editor: !!editor
});
```

### **Verify Image Replacement:**
```javascript
// In browser console, after load
const canvas = editor.Canvas.getDocument();
const images = canvas.querySelectorAll('img');
console.log('Total images:', images.length);
images.forEach((img, i) => {
  const isBase64 = img.src.startsWith('data:image');
  console.log(`Image ${i}:`, {
    src: img.src.substring(0, 50),
    isBase64,
    loaded: img.complete
  });
});
```

### **Check CSS Injection:**
```javascript
// In browser console
const canvas = editor.Canvas.getDocument();
const styles = canvas.querySelectorAll('style');
console.log('Style tags:', styles.length);
styles.forEach((style, i) => {
  console.log(`Style ${i}:`, {
    id: style.id,
    length: style.textContent.length,
    external: style.getAttribute('data-gjs')
  });
});
```

---

## 🚀 Future Improvements

### **Potential Enhancements:**

1. **Image Caching**
   - Cache converted base64 images in IndexedDB
   - Avoid re-conversion on every load
   - Faster subsequent loads

2. **Progressive Image Loading**
   - Load low-res placeholders first
   - Upgrade to full resolution
   - Better perceived performance

3. **Template Validation**
   - Pre-check template ZIP structure
   - Validate all images exist
   - Warn about issues before upload

4. **Smart Image Replacement**
   - AI-powered image suggestions
   - Automatic similar image detection
   - Replace missing images intelligently

5. **Version Control**
   - Track website edit history
   - Ability to revert to previous versions
   - Compare changes over time

---

## ✅ Summary

### **What Was Fixed:**
1. ✅ Website override prevented with safeguards
2. ✅ CSS injection limited to single execution
3. ✅ Comprehensive image path replacement
4. ✅ Placeholder fallback for missing images
5. ✅ Loading coordination with tracking refs
6. ✅ Clear console logging for debugging

### **What Still Needs Attention:**
1. ⚠️ Template packaging guidelines for users
2. ⚠️ Automated template validation
3. ⚠️ Image optimization during upload
4. ⚠️ Better error messages for end users

### **Key Takeaways:**
- **Refs are critical** for tracking state across renders
- **Safeguards prevent** race conditions and conflicts
- **Comprehensive patterns** catch edge cases
- **Fallbacks provide** better user experience
- **Clear logging** makes debugging possible

---

## 📚 Related Documentation

- `TEMPLATE_PACKAGING_GUIDE.md` - How to create proper templates
- `PREVIEW_MODE_FIX.md` - Preview vs Edit mode implementation
- `SERVICE_EDITING_GUIDE.md` - Service management system
- `TEMPLATE_GUIDE.md` - Complete template documentation

---

**Status:** All critical issues RESOLVED ✅

**Last Updated:** 2024
**Version:** 2.0 (Post-Fix)

