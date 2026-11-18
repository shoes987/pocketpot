import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";

/**
 * PocketPot CEO / Super-Admin Tenant Provisioning Script
 * 
 * Reusable CLI utility to create or update institutional school tenants in Cloud Firestore.
 * Locks licensing parameters (tenantId, allowedDomains, status) to CEO / Super-Admin execution only.
 * 
 * Usage:
 *   npx tsx scripts/provision-tenant.ts [tenantId] [schoolName] [domain1,domain2] [status]
 * 
 * Defaults:
 *   tenantId: "sch_local_pilot"
 *   schoolName: "Pilot Primary School"
 *   allowedDomains: ["@gbshp"]
 *   status: "Production Live"
 */

// Parse CLI Arguments or apply pilot defaults
const args = process.argv.slice(2);
const targetTenantId = args[0] || "sch_local_pilot";
const targetSchoolName = args[1] || "Pilot Primary School";
const rawDomainsInput = args[2] || "@gbshp";
const targetStatus = args[3] || "Production Live";

// Normalize allowedDomains exactly as passed (e.g. ["@gbshp"])
const allowedDomains = rawDomainsInput
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  console.log("=================================================");
  console.log("   PocketPot CEO / Super-Admin Tenant Provisioning");
  console.log("=================================================");

  // Locate service account credentials
  const primaryKeyPath = path.resolve(process.cwd(), "./Keys/serviceAccountKey.json");
  const fallbackKeyPath = path.resolve(process.cwd(), "./Keys/serviceAccountKey.json.json");
  const resolvedKeyPath = fs.existsSync(primaryKeyPath) ? primaryKeyPath : fallbackKeyPath;

  if (!fs.existsSync(resolvedKeyPath)) {
    throw new Error(`Service account key not found at ${resolvedKeyPath}`);
  }

  console.log(`Using credentials from: ${resolvedKeyPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(resolvedKeyPath, "utf8"));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc(targetTenantId);
  const existingDoc = await tenantRef.get();

  const isExisting = existingDoc.exists;
  const existingData = isExisting ? existingDoc.data() : null;

  console.log(`\nTarget Tenant ID:   ${targetTenantId}`);
  console.log(`Target School Name: ${targetSchoolName}`);
  console.log(`Allowed Domains:    ${JSON.stringify(allowedDomains)}`);
  console.log(`Status:             ${targetStatus}`);
  console.log(`Mode:               ${isExisting ? "UPDATE EXISTING TENANT" : "CREATE NEW TENANT"}`);

  const payload: Record<string, unknown> = {
    tenantId: targetTenantId,
    schoolName: targetSchoolName,
    schoolUrn: existingData?.schoolUrn || "100123",
    allowedDomains: allowedDomains,
    status: targetStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!isExisting) {
    payload.createdAt = FieldValue.serverTimestamp();
    payload.activeTeacherCount = 0;
    payload.pendingInviteCount = 0;
  }

  await tenantRef.set(payload, { merge: true });

  console.log(`\n✓ Successfully provisioned /tenants/${targetTenantId} in Cloud Firestore!`);
  const finalDoc = await tenantRef.get();
  console.log("Verified Firestore Data:", JSON.stringify(finalDoc.data(), null, 2));
}

main().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
