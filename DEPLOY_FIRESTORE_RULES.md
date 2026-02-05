# Deploy Firestore Rules to Fix Template Upload Permission Error

## Problem
You're getting: `FirebaseError: Missing or insufficient permissions` when trying to upload templates.

## Solution

### Step 1: Find Your Email
1. Open browser console (F12)
2. Try uploading the template again
3. Look for: `👤 Current user email: your-email@gmail.com`
4. Copy that email address

### Step 2: Update firestore.rules
1. Open `firestore.rules`
2. Find the `adminEmails()` function
3. Add your email to the list:
```javascript
function adminEmails() {
  return [
    'tjayburger2004@gmail.com',
    'YOUR-EMAIL@gmail.com',  // Add your email here
  ];
}
```

### Step 3: Deploy the Rules

**Option A: Using Firebase CLI**
```bash
firebase deploy --only firestore:rules
```

**Option B: Using Vercel/Online**
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `pay-zip-sa`
3. Go to Firestore Database → Rules
4. Copy the updated rules from `firestore.rules`
5. Paste them into the Firebase Console
6. Click "Publish"

### Step 4: Verify
After deploying:
1. Wait 1-2 minutes for rules to propagate
2. Try uploading the template again
3. It should work now!

## Alternative: Temporary Fix (Not Recommended)
If you need it working immediately for testing, you can temporarily allow all authenticated users:

```javascript
match /templates/{templateId} {
  allow read: if true;
  allow write: if isSignedIn();  // ⚠️ Only for testing - change back after!
}
```

**⚠️ Warning:** This allows any logged-in user to upload templates. Change it back to `isAdmin()` after adding your email to the admin list.

