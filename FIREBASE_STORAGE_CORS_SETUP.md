# Firebase Storage CORS Configuration

If images are still not loading after removing the `crossOrigin` attribute, you need to configure CORS for Firebase Storage.

## Option 1: Configure CORS via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pay-zip-sa`
3. Go to **Storage** → **Rules** tab
4. The CORS configuration should be handled automatically, but if needed, you can set bucket policies

## Option 2: Configure CORS via gsutil (Command Line)

Create a `cors.json` file:

```json
[
  {
    "origin": ["http://localhost:3000", "https://yourdomain.com"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Then run:
```bash
gsutil cors set cors.json gs://pay-zip-sa.firebasestorage.app
```

## Option 3: Make Files Public (Simplest)

In Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /website-previews/{allPaths=**} {
      allow read: if true; // Public read
      allow write: if request.auth != null;
    }
  }
}
```

This allows anyone to read preview images, which is fine for preview images.

