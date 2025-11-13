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

if (!getApps().length) {
  const explicitConfig = getAdminConfig();

  try {
    if (explicitConfig) {
      initializeApp({
        credential: cert(explicitConfig),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      console.warn(
        '[firebase-admin] Using application default credentials. ' +
          'Configure FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY (or FIREBASE_ADMIN_CREDENTIALS) for explicit credentials.',
      );
      initializeApp({
        credential: applicationDefault(),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    const hint =
      'Provide Firebase Admin credentials via FIREBASE_ADMIN_CREDENTIALS (JSON or base64), or FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY / FIREBASE_ADMIN_PROJECT_ID.';
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(`${(error as Error)?.message ?? error}\n${hint}`);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();


