import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

type RequiredAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(value: string | undefined | null) {
  return value?.replace(/\\n/g, '\n');
}

function readJsonCredential(): RequiredAdminConfig | null {
  const rawJson =
    process.env.FIREBASE_ADMIN_CREDENTIALS ||
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    null;

  if (!rawJson) {
    return null;
  }

  let jsonString = rawJson;
  try {
    // Support base64-encoded values
    if (!rawJson.trim().startsWith('{')) {
      jsonString = Buffer.from(rawJson, 'base64').toString('utf8');
    }

    const parsed = JSON.parse(jsonString) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };

    const projectId =
      parsed.project_id ||
      parsed.projectId ||
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID;
    const clientEmail =
      parsed.client_email ||
      parsed.clientEmail ||
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey =
      normalizePrivateKey(parsed.private_key || parsed.privateKey) ||
      normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

    if (projectId && clientEmail && privateKey) {
      return { projectId, clientEmail, privateKey };
    }

    console.warn(
      '[firebase-admin] Service account JSON found but missing one of projectId/clientEmail/privateKey.',
    );
    return null;
  } catch (error) {
    console.error('[firebase-admin] Failed to parse admin credentials JSON.', error);
    return null;
  }
}

function readEnvCredential(): RequiredAdminConfig | null {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

function getAdminConfig(): RequiredAdminConfig | null {
  return readJsonCredential() ?? readEnvCredential();
}

// Helper to check if we're in build time (check dynamically, not just once)
function isBuildTimeCheck(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV && !process.env.VERCEL_URL) ||
    process.argv.includes('build')
  );
}

// Lazy initialization - only initialize when actually needed (runtime), not during build
let adminAppInitialized = false;

function initializeAdminApp() {
  if (adminAppInitialized || getApps().length > 0) {
    return;
  }

  // During build time, skip initialization (credentials might not be available)
  // Check multiple build indicators dynamically
  const isBuildTime = isBuildTimeCheck();
  
  if (isBuildTime) {
    console.log('[firebase-admin] Skipping initialization during build time.');
    return;
  }

  const explicitConfig = getAdminConfig();

  try {
    if (explicitConfig) {
      console.log('[firebase-admin] Initializing with explicit credentials.', {
        projectId: explicitConfig.projectId,
        clientEmail: explicitConfig.clientEmail,
        hasPrivateKey: !!explicitConfig.privateKey,
      });
      initializeApp({
        credential: cert(explicitConfig),
        projectId: explicitConfig.projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log('[firebase-admin] Successfully initialized with explicit credentials.');
      adminAppInitialized = true;
    } else {
      // In production (Vercel), we require explicit credentials
      const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        // Only throw at runtime, not during build
        if (!isBuildTime) {
          const errorMessage =
            'Firebase Admin SDK requires explicit credentials in production. ' +
            'Please set FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, and FIREBASE_ADMIN_PROJECT_ID ' +
            'environment variables in Vercel, or provide FIREBASE_ADMIN_CREDENTIALS as a JSON string or base64-encoded JSON.';
          console.error('[firebase-admin]', errorMessage);
          throw new Error(errorMessage);
        } else {
          console.warn('[firebase-admin] Skipping initialization during build - credentials will be required at runtime.');
          return;
        }
      }

      console.warn(
        '[firebase-admin] Using application default credentials. ' +
          'Configure FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY (or FIREBASE_ADMIN_CREDENTIALS) for explicit credentials.',
      );
      initializeApp({
        credential: applicationDefault(),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      adminAppInitialized = true;
    }
  } catch (error) {
    const hint =
      'Provide Firebase Admin credentials via FIREBASE_ADMIN_CREDENTIALS (JSON or base64), or FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY / FIREBASE_ADMIN_PROJECT_ID.';
    console.error('[firebase-admin] Failed to initialize Firebase Admin SDK:', error);
    // Only throw at runtime, not during build
    if (!isBuildTime) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Firebase Admin initialization failed: ${errorMessage}\n${hint}`);
    }
  }
}

// Lazy getters - only initialize when actually accessed at runtime
let _adminDb: ReturnType<typeof getFirestore> | null = null;
let _adminAuth: ReturnType<typeof getAuth> | null = null;

function getAdminDbLazy(): ReturnType<typeof getFirestore> {
  // During build, return early without initializing
  if (isBuildTimeCheck()) {
    // Return a minimal object that satisfies the type but won't be used
    // This prevents build errors while ensuring runtime works correctly
    return {} as ReturnType<typeof getFirestore>;
  }
  
  // At runtime, initialize if not already done
  if (!_adminDb) {
    initializeAdminApp();
    _adminDb = getFirestore();
  }
  return _adminDb;
}

function getAdminAuthLazy(): ReturnType<typeof getAuth> {
  // During build, return early without initializing
  if (isBuildTimeCheck()) {
    // Return a minimal object that satisfies the type but won't be used
    return {} as ReturnType<typeof getAuth>;
  }
  
  // At runtime, initialize if not already done
  if (!_adminAuth) {
    initializeAdminApp();
    _adminAuth = getAuth();
  }
  return _adminAuth;
}

// Export with lazy initialization - only initializes when actually accessed
// During build, this returns empty objects (won't be used anyway)
// At runtime, this properly initializes Firebase Admin
export const adminDb = getAdminDbLazy();
export const adminAuth = getAdminAuthLazy();


