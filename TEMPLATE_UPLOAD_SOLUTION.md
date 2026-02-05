# Template Upload Size Issue - Solution

## Problem
- Template is 24KB on disk
- When uploaded as JSON, it becomes 11.5MB (exceeds Firebase Firestore 1MB field limit)
- Firebase Firestore limit: **1MB per field**
- Firebase Storage limit: **32MB per file**

## Solution: Use ZIP Upload Instead

### Why ZIP Upload is Better:
1. ✅ Stores in **Firebase Storage** (32MB limit) - not Firestore
2. ✅ More reliable - designed for file storage
3. ✅ Supports multiple files (HTML, CSS, JS, images)
4. ✅ Better compression
5. ✅ No size conversion issues

### How to Use ZIP Upload:

1. **Create a ZIP file** containing your template:
   ```
   barber-classic.zip
   └── index.html (your template file)
   ```

2. **In Admin Panel:**
   - Select "ZIP Upload" (not "JSON Upload")
   - Upload your `barber-classic.zip` file
   - Fill in template details (name, category, etc.)
   - Click Upload

### Converting HTML Template to ZIP:

**On Windows (PowerShell):**
```powershell
Compress-Archive -Path Templates\barber\barber-classic.html -DestinationPath Templates\barber\barber-classic.zip
```

**Or manually:**
1. Right-click `barber-classic.html`
2. Send to → Compressed (zipped) folder
3. Rename if needed

## Alternative: If You MUST Use JSON Upload

You need to convert your HTML to proper GrapesJS JSON format first:

1. Open your template in GrapesJS editor
2. Export the GrapesJS project data:
   ```javascript
   const editor = grapesjs.init({...});
   // Load your HTML
   // Then export:
   const projectData = editor.getProjectData();
   console.log(JSON.stringify(projectData));
   ```
3. Use that JSON output (not the raw HTML)

## Recommendation

**Use ZIP Upload** - It's what the system is designed for and avoids all size limit issues!

