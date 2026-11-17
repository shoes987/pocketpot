import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from "firebase/firestore";

/**
 * PocketPot Firebase Configuration
 * Populated from NEXT_PUBLIC_FIREBASE_* environment variables defined in .env.local
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * 1. Safely initialize the Firebase App
 * Prevents multiple app initialization during Next.js Hot Module Replacement (HMR).
 */
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * 2 & 3. Firestore initialization with offline IndexedDB persistence.
 * Enables persistent local caching with multi-tab management so pupils on classroom
 * iPads and Chromebooks retain access and uninterrupted state during temporary school Wi-Fi drops.
 */
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // If already initialized (e.g. Next.js Fast Refresh) or in fallback environments
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

/**
 * 2. Export Firebase Auth
 */
export const auth: Auth = getAuth(app);

/**
 * 4. STRICT ZERO-PII SAFEGUARD NOTICE:
 * Firebase Analytics (getAnalytics) is EXPLICITLY OMITTED and MUST NOT be initialized.
 * In accordance with UK Key Stage 2 educational safeguarding requirements and GDPR/DPA 2018,
 * PocketPot prohibits behavioral tracking, ad IDs, client telemetry, and telemetry analytics for young learners.
 */
