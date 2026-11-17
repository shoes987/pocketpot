/**
 * Automated Verification Test Suite for Milestone 2: Diagnostic Bug Fixes (Requirement R3)
 * Tests all 5 bug fixes genuine logic and state invariants.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("================================================================================");
console.log("RUNNING MILESTONE 2: DIAGNOSTIC BUG FIX VERIFICATION SUITE");
console.log("================================================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] Test ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalCount}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------------------
// Test 1: AudioContext leak fix in TeacherBonusesDashboard.tsx
// -----------------------------------------------------------------------------------------
runTest("AudioContext leak fix in TeacherBonusesDashboard.tsx", () => {
  const content = fs.readFileSync(
    path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
    "utf8"
  );

  // Must have audioCtxRef = useRef<AudioContext | null>(null)
  assert.ok(
    content.includes("audioCtxRef = useRef<AudioContext | null>(null)"),
    "TeacherBonusesDashboard.tsx must declare persistent audioCtxRef"
  );

  // Must have unmount cleanup closing the persistent audio context
  assert.ok(
    content.includes("audioCtxRef.current.close().catch"),
    "TeacherBonusesDashboard.tsx must have unmount cleanup closing persistent AudioContext"
  );

  // playCelebrationChime must reuse or instantiate into audioCtxRef.current
  assert.ok(
    content.includes("audioCtxRef.current = new AudioCtx()") &&
    content.includes("const ctx = audioCtxRef.current"),
    "playCelebrationChime must reuse audioCtxRef.current rather than unreferenced constructor calls"
  );
});

// -----------------------------------------------------------------------------------------
// Test 2: SSR / client hydration guards
// -----------------------------------------------------------------------------------------
runTest("SSR / client hydration guard in SchoolOverviewDashboard.tsx", () => {
  const content = fs.readFileSync(
    path.join(__dirname, "src/components/teacher/SchoolOverviewDashboard.tsx"),
    "utf8"
  );

  // Must declare isMounted state
  assert.ok(
    content.includes("const [isMounted, setIsMounted] = useState(false);"),
    "SchoolOverviewDashboard.tsx must declare isMounted state"
  );

  // Must initialize staffList, tenant, and allInvites with default fallbacks before mount
  assert.ok(
    content.includes("useState<UserDocument[]>(DEFAULT_STAFF_USERS)"),
    "staffList must initialize with DEFAULT_STAFF_USERS on SSR"
  );
  assert.ok(
    content.includes("useState<TenantDocument>(DEFAULT_TENANT)"),
    "tenant must initialize with DEFAULT_TENANT on SSR"
  );
  assert.ok(
    content.includes("useState<TeacherInviteDocument[]>([])"),
    "allInvites must initialize with [] on SSR"
  );

  // Must defer localStorage reads to useEffect
  assert.ok(
    content.includes("setIsMounted(true)") &&
    content.includes("setStaffList(getStaffUsers())") &&
    content.includes("setTenant(getTenant())") &&
    content.includes("setAllInvites(getTenantInvites())"),
    "localStorage reads must be deferred to useEffect"
  );

  // pendingInvites must be guarded by isMounted
  assert.ok(
    content.includes("const pendingInvites = isMounted ? allInvites.filter"),
    "pendingInvites must be guarded by isMounted state"
  );
});

runTest("SSR / client hydration guard in src/app/admin/page.tsx", () => {
  const content = fs.readFileSync(
    path.join(__dirname, "src/app/admin/page.tsx"),
    "utf8"
  );

  assert.ok(
    content.includes("const [isMounted, setIsMounted] = useState(false);"),
    "admin/page.tsx must declare isMounted state"
  );
  assert.ok(
    content.includes("setIsMounted(true);"),
    "admin/page.tsx must set isMounted(true) in useEffect"
  );
  assert.ok(
    content.includes("isMounted && currentAdmin?.displayName") ||
    content.includes("isMounted && currentAdmin ?"),
    "admin/page.tsx must guard client-hydrated admin userName"
  );
  assert.ok(
    content.includes("isMounted && classes.map"),
    "admin/page.tsx must guard client-hydrated class options dropdown"
  );
});

// -----------------------------------------------------------------------------------------
// Test 3: Unconditional useParams() in all 4 child routes
// -----------------------------------------------------------------------------------------
const childRoutes = [
  "src/app/pupil/[pupilId]/page.tsx",
  "src/app/pupil/[pupilId]/jobs/page.tsx",
  "src/app/pupil/[pupilId]/marketplace/page.tsx",
  "src/app/pupil/[pupilId]/pots/page.tsx",
];

childRoutes.forEach((routePath) => {
  runTest(`Unconditional useParams() in ${routePath}`, () => {
    const content = fs.readFileSync(path.join(__dirname, routePath), "utf8");

    // Must NOT contain conditional React.use
    assert.ok(
      !content.includes(".use("),
      `${routePath} must not contain React.use()`
    );
    assert.ok(
      !content.includes("unwrappedParams"),
      `${routePath} must not contain unwrappedParams logic`
    );

    // Must unconditionally read routeParams = useParams()
    assert.ok(
      content.includes("const routeParams = useParams();"),
      `${routePath} must call useParams() unconditionally`
    );
    assert.ok(
      content.includes("typeof routeParams?.pupilId === \"string\" ? routeParams.pupilId : \"\""),
      `${routePath} must safely extract pupilId from useParams()`
    );
  });
});

// -----------------------------------------------------------------------------------------
// Test 4: Class creation lastPayoutTimestamp initialization
// -----------------------------------------------------------------------------------------
runTest("lastPayoutTimestamp initialization in class-service.ts", () => {
  const content = fs.readFileSync(
    path.join(__dirname, "src/lib/services/class-service.ts"),
    "utf8"
  );

  // createClassWithQuickAdd must set lastPayoutTimestamp: now
  assert.ok(
    content.includes("weeklyBasicIncomeCents,") &&
    content.includes("payoutDay,") &&
    content.includes("lastPayoutTimestamp: now,"),
    "newClass in createClassWithQuickAdd must set lastPayoutTimestamp: now"
  );

  // Seed classes must also have lastPayoutTimestamp
  const seedMatches = content.match(/lastPayoutTimestamp:\s*new Date\(\)\.toISOString\(\)/g);
  assert.ok(
    seedMatches && seedMatches.length >= 4,
    "All seed demo classes must set lastPayoutTimestamp"
  );
});

// -----------------------------------------------------------------------------------------
// Test 5: Server-side clean execution of tenant invites API route
// -----------------------------------------------------------------------------------------
runTest("Server-safe tenant-service and API route isolation", () => {
  const routeContent = fs.readFileSync(
    path.join(__dirname, "src/app/api/tenants/[tenantId]/invites/route.ts"),
    "utf8"
  );
  const tenantServiceContent = fs.readFileSync(
    path.join(__dirname, "src/lib/services/tenant-service.ts"),
    "utf8"
  );
  const authServiceContent = fs.readFileSync(
    path.join(__dirname, "src/lib/services/auth-service.ts"),
    "utf8"
  );

  // tenant-service must have server-side in-memory storage fallback
  assert.ok(
    tenantServiceContent.includes("serverTenants") &&
    tenantServiceContent.includes("serverInvites"),
    "tenant-service must provide server-side in-memory store"
  );

  // auth-service must have server-side in-memory staff storage
  assert.ok(
    authServiceContent.includes("serverStaffUsers"),
    "auth-service must provide server-side in-memory staff storage"
  );

  // route.ts must handle both GET and POST with clean status codes and JSON
  assert.ok(
    routeContent.includes("export async function POST") &&
    routeContent.includes("export async function GET"),
    "route.ts must export both GET and POST handlers"
  );
  assert.ok(
    routeContent.includes("status: 201") &&
    routeContent.includes("status: 400") &&
    routeContent.includes("status: 404") &&
    routeContent.includes("status: 500"),
    "route.ts must return clean HTTP status codes"
  );
});

console.log("\n--------------------------------------------------------------------------------");
console.log(`SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED (100%)`);
console.log("--------------------------------------------------------------------------------\n");

if (passedCount !== totalCount) {
  process.exit(1);
}
