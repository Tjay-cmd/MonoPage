import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA5luFkARnWbKO4IByuDy8qBa8KzuwHmfA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pay-zip-sa.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pay-zip-sa",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pay-zip-sa.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "283671393369",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:283671393369:web:71cf01361f4feb599a2d48",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore with persistent cache (new API)
let db: ReturnType<typeof getFirestore>;

if (typeof window !== 'undefined') {
  try {
    // Use the new cache API with multi-tab support
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (error) {
    // If already initialized or error, fall back to getFirestore
    console.warn('Firestore already initialized or error:', error);
    db = getFirestore(app);
  }
} else {
  // Server-side: use default Firestore without cache
  db = getFirestore(app);
}

export { db };

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
