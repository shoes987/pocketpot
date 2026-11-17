import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as path from "path";
import * as fs from "fs";

/**
 * PocketPot Temporary Admin Provisioning Script
 * Sets custom user claims { role: "school_admin", tenantId: "sch_local_pilot" }
 * on the designated Firebase User UID.
 */

const TARGET_UID = "F4desFyEszSuSHvZpnZv5cSD1Hf1";
const CLAIMS = {
  role: "school_admin",
  tenantId: "sch_local_pilot",
};

async function main() {
  console.log("=== PocketPot Admin Provisioning ===");

  // Resolve service account key path
  const primaryKeyPath = path.resolve(process.cwd(), "./Keys/serviceAccountKey.json");
  const fallbackKeyPath = path.resolve(process.cwd(), "./Keys/serviceAccountKey.json.json");

  const resolvedKeyPath = fs.existsSync(primaryKeyPath)
    ? primaryKeyPath
    : fallbackKeyPath;

  if (!fs.existsSync(resolvedKeyPath)) {
    throw new Error(`Service account key not found at ${resolvedKeyPath}`);
  }

  console.log(`Using Service Account credentials from: ${resolvedKeyPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, "utf8"));

  // Initialize Firebase Admin SDK
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const auth = getAuth();

  console.log(`Setting custom user claims on UID: ${TARGET_UID}...`);
  console.log(`Claims payload:`, JSON.stringify(CLAIMS, null, 2));

  // Set custom user claims
  await auth.setCustomUserClaims(TARGET_UID, CLAIMS);
  console.log(`Custom user claims successfully applied!`);

  // Verify updated user record
  const user = await auth.getUser(TARGET_UID);
  console.log("\n--- Verification Summary ---");
  console.log(`User UID:       ${user.uid}`);
  console.log(`Email:          ${user.email || "N/A"}`);
  console.log(`Display Name:   ${user.displayName || "N/A"}`);
  console.log(`Custom Claims: `, JSON.stringify(user.customClaims, null, 2));
  console.log("=====================================");
}

main()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error setting custom claims:", err);
    process.exit(1);
  });
