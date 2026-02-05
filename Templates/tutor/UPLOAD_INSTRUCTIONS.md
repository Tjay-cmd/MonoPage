# How to Upload Tutor Template as JSON

Since Firebase Storage upload is failing, you can upload the template as **GrapesJS JSON** instead, which doesn't require Storage permissions.

## Option 1: Use the Converter Tool (Easiest)

1. **Open the converter:**
   - Navigate to `Templates/tutor/` folder
   - Open `convert-to-json-standalone.html` in your browser
   - (You may need to serve it via a local server if browser blocks file access)

2. **Convert the template:**
   - Click "Convert Template" button
   - Wait for conversion (10-20 seconds)
   - Click "Copy JSON" to copy the output

3. **Upload to Admin Panel:**
   - Go to `/admin/templates`
   - Click "Upload Template"
   - Select **"GrapesJS JSON"** format (NOT ZIP)
   - Paste the JSON into the "GrapesJS Project JSON" field
   - Fill in template name, category (Tutor), description
   - Upload preview image (optional)
   - Click "Upload Template"

## Option 2: Manual Conversion via Admin Panel

The admin panel can convert HTML to JSON automatically:

1. **Create a ZIP file** with just the HTML:
   - Create a ZIP containing only `tutor-modern.html`
   - Name it `tutor-template.zip`

2. **Upload via Admin Panel:**
   - Go to `/admin/templates`
   - Click "Upload Template"
   - Select **"ZIP File"** format
   - Upload the ZIP file
   - The admin panel will automatically convert it to GrapesJS JSON
   - **Note:** This will still try to upload to Storage, but the conversion happens first, so you can copy the JSON before it fails

3. **If Storage upload fails:**
   - Check the browser console for the converted JSON
   - Copy it and use Option 1 to upload as JSON directly

## Option 3: Use Browser Console (Advanced)

1. Open `tutor-modern.html` in browser
2. Open browser console (F12)
3. Run this code to get the HTML content:
   ```javascript
   document.documentElement.outerHTML
   ```
4. Copy the HTML
5. Go to admin template upload page
6. The page has built-in conversion - check the code flow

## Quick Fix: Deploy Storage Rules

The root cause is Storage permissions. To fix permanently:

1. Go to Firebase Console → Storage → Rules
2. Copy the rules from `storage.rules` file
3. Update the `templates/` rule to:
   ```
   match /templates/{templateId}/{fileName} {
     allow read: if true;
     allow write: if isAdmin();
   }
   ```
4. Click "Publish"
5. Then ZIP uploads will work

## Recommended Approach

**Use Option 1** - it's the cleanest and doesn't require Storage at all. The JSON format is preferred anyway as it's more efficient.

