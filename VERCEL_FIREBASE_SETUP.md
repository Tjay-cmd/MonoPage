# Firebase Admin Setup for Vercel Deployment

## Problem
The deployed app on Vercel is failing with errors like:
- `Unable to detect a Project Id in the current environment`
- `/api/templates/list` returning 500 error
- `/api/services` returning 500 error
- `/api/subscription/current` returning 401 error

This is because Firebase Admin SDK requires explicit credentials on Vercel (serverless environment).

## Solution: Set Environment Variables in Vercel

You need to set the following environment variables in your Vercel project:

### Option 1: Individual Environment Variables (Recommended)

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Required Variables:

```
FIREBASE_ADMIN_PROJECT_ID=pay-zip-sa
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-email@pay-zip-sa.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----
```

#### Optional (if not using NEXT_PUBLIC_ variables):

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pay-zip-sa
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pay-zip-sa.firebasestorage.app
```

### Option 2: JSON Credentials (Alternative)

Instead of individual variables, you can provide the entire service account JSON as a single environment variable:

```
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account","project_id":"pay-zip-sa","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@pay-zip-sa.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token",...}
```

Or base64-encoded:
```
FIREBASE_ADMIN_CREDENTIALS=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiwi...
```

## How to Get Firebase Admin Credentials

### Step 1: Create a Service Account in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pay-zip-sa**
3. Go to **Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file

### Step 2: Extract Credentials from JSON

Open the downloaded JSON file and extract:

- **project_id** → `FIREBASE_ADMIN_PROJECT_ID`
- **client_email** → `FIREBASE_ADMIN_CLIENT_EMAIL`
- **private_key** → `FIREBASE_ADMIN_PRIVATE_KEY`

**Important**: When copying the `private_key`:
- It should include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Replace all actual `\n` characters with `\n` (the string literal `\n`, not actual newlines)
- Or use the entire JSON file for `FIREBASE_ADMIN_CREDENTIALS`

### Step 3: Set Permissions in Firestore

1. Go to **Firestore Database** in Firebase Console
2. Go to **Rules** tab
3. Ensure your service account has the necessary permissions (usually handled by Firebase Admin SDK)

## Setting Environment Variables in Vercel

### Via Vercel Dashboard:

1. Go to your project: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: `FIREBASE_ADMIN_PROJECT_ID`
   - **Value**: `pay-zip-sa`
   - **Environment**: Select `Production`, `Preview`, and `Development` (or just `Production` if you only deploy to production)
   - Click **Save**
5. Repeat for `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY`

### Via Vercel CLI:

```bash
vercel env add FIREBASE_ADMIN_PROJECT_ID production
# Enter value: pay-zip-sa

vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production
# Enter value: your-service-account-email@pay-zip-sa.iam.gserviceaccount.com

vercel env add FIREBASE_ADMIN_PRIVATE_KEY production
# Enter value: -----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----
```

## After Setting Environment Variables

1. **Redeploy your application** in Vercel (or push a new commit)
2. The environment variables will be available in the next deployment
3. Check the Vercel deployment logs to verify Firebase Admin is initializing correctly

## Verification

After redeploying, check the Vercel function logs for:
- `[firebase-admin] Initializing with explicit credentials.`
- `[firebase-admin] Successfully initialized with explicit credentials.`

If you see errors, check:
- Environment variables are set correctly
- Private key format is correct (including `\n` escape sequences)
- Service account has proper permissions in Firebase

## Troubleshooting

### Error: "Unable to detect a Project Id"
- Ensure `FIREBASE_ADMIN_PROJECT_ID` is set
- Or ensure `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is set

### Error: "Invalid credentials"
- Check that `FIREBASE_ADMIN_CLIENT_EMAIL` is correct
- Check that `FIREBASE_ADMIN_PRIVATE_KEY` includes the full key with headers
- Ensure private key uses `\n` escape sequences, not actual newlines

### Error: "Permission denied"
- Check Firestore security rules
- Ensure the service account has proper IAM permissions in Firebase Console

### 401 Unauthorized Errors
- Check that Firebase Auth is properly configured
- Verify that client-side Firebase config matches your project
- Check that user authentication tokens are being sent correctly

## Security Notes

- **Never commit** service account credentials to Git
- **Never expose** private keys in client-side code
- Use Vercel's environment variables for all secrets
- Consider using Vercel's environment variable encryption for sensitive data

