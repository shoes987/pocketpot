import { initializeApp, cert, getApps, getApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";

/**
 * PocketPot Server-Side Firebase Admin Initialization
 * 
 * Safely initializes Firebase Admin SDK in Node.js server runtimes using credentials
 * from ./Keys/serviceAccountKey.json or process environment.
 */

let adminApp: App;

if (getApps().length > 0) {
  adminApp = getApp();
} else {
  const primaryKeyPath = path.resolve(process.cwd(), "./Keys/serviceAccountKey.json");
  const fallbackKeyPath = path.resolve(process.cwd(), "./Keys/serviceAccountKey.json.json");
  const resolvedKeyPath = fs.existsSync(primaryKeyPath) ? primaryKeyPath : fallbackKeyPath;

  if (fs.existsSync(resolvedKeyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, "utf8"));
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Fallback to application default credentials (e.g. Cloud Run, Firebase Functions)
    adminApp = initializeApp();
  }
}

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export { adminApp };
