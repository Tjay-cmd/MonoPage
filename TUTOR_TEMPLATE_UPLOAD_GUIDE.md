# Tutor Template Upload Guide

## Overview
This guide will help you upload the tutor template to your SaaS platform so tutors can use it to create their websites.

## Template File
The template file is located at: `tutor-template.json`

## Upload Steps

### Option 1: Via Admin Panel (Recommended)

1. **Navigate to Admin Templates Page**
   - Go to `/admin/templates` (you must be logged in as admin)
   - Make sure you have admin access (email: tjayburger2004@gmail.com)

2. **Upload Template**
   - Click "Upload New Template" or similar button
   - Fill in the form:
     - **Name**: Tutor Professional
     - **Category**: tutor
     - **Description**: Professional template for tutors with class enrollment and resource management
   - In the "GrapesJS JSON" field, paste the entire contents of `tutor-template.json`
   - Upload a preview image (optional but recommended)
   - Click "Upload Template"

### Option 2: Direct Firestore Upload (Advanced)

If you prefer to upload directly to Firestore:

1. **Open Firebase Console**
   - Go to Firebase Console → Firestore Database
   - Navigate to the `templates` collection

2. **Create New Document**
   - Click "Add document"
   - Set document ID (e.g., `tutor-professional`)
   - Add the following fields:
     - `name`: "Tutor Professional"
     - `category`: "tutor"
     - `description`: "Professional template for tutors with class enrollment and resource management"
     - `status`: "active"
     - `grapesJsData`: (Paste the entire `grapesJsData` object from `tutor-template.json`)
     - `createdAt`: (Current timestamp)

3. **Add Preview Image** (Optional)
   - Upload a preview image to Firebase Storage
   - Add `previewImageUrl` field with the image URL

## Testing the Template

After uploading:

1. **Login as a Tutor**
   - Make sure your user account has `businessType: 'tutor'` in Firestore
   - Ensure you have Business tier subscription

2. **Access Tutor Dashboard**
   - Go to `/dashboard/business/tutor`
   - You should see the tutor dashboard with:
     - Calendar & Lessons
     - Resources
     - Classes & Groups
     - Website Integration

3. **Create Classes and Resources**
   - Go to "Resources" and upload some files/folders
   - Go to "Classes & Groups" and create classes
   - Link resources to classes

4. **Create Website**
   - Go to `/dashboard/templates`
   - Find "Tutor Professional" template
   - Click "Edit" or "Use Template"
   - In the editor, you should see the "Classes Orbit Animation" block in the Tutor category
   - Drag the block onto your page
   - Configure which classes to display
   - Save and publish

5. **Test Student Flow**
   - Visit your published website
   - Click "Get Access" on the locked classes
   - Complete registration and payment flow
   - Select a class
   - Verify animation speeds up and stops on selected class
   - Login as student and access resources

## Template Features

The tutor template includes:

- **Hero Section**: Welcome message with gradient background
- **Classes Orbit Animation**: Animated carousel of classes (locked until enrollment)
- **About Section**: Space for tutor bio
- **Footer**: Simple footer with copyright

## Customization

Tutors can customize:
- Colors and styling
- Text content
- Add/remove sections
- Configure which classes appear in the orbit animation
- Set animation speed (slow/normal/fast)
- Customize "Get Access" button color

## Troubleshooting

### Template Not Showing
- Check that `status` is set to `"active"` in Firestore
- Verify `category` is `"tutor"`
- Check admin permissions

### Classes Orbit Block Not Appearing
- Ensure user has `businessType: 'tutor'` in their profile
- Check browser console for errors
- Verify classes are created before adding the block

### Animation Not Working
- Check that classes are properly linked to resources
- Verify JavaScript is enabled
- Check browser console for errors

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firestore rules allow read access to templates
3. Ensure all API routes are properly deployed
4. Check that storage rules allow tutor resource access

