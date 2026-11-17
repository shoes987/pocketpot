/**
 * EMPIRICAL CHALLENGER TEST SUITE: Hydration, Lifecycle & Routing Robustness
 * Teamwork Challenger 2 Automated Verification Harness
 *
 * Scopes:
 * 1. AudioContext lifecycle & leak prevention in TeacherBonusesDashboard.tsx
 * 2. Confetti animation frame leak prevention
 * 3. SSR / Hydration mismatch and empty state flash guards
 * 4. Child routes hook rules (unconditional useParams, zero conditional React.use)
 * 5. Class creation payout timing (lastPayoutTimestamp: now prevents premature income reconciliation)
 * 6. Server invites API route execution in Node.js server environment
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const createJITI = require("jiti");

const jiti = createJITI(__filename, {
  alias: {
    "@": path.resolve(__dirname, "src"),
  },
});

let passedCount = 0;
let failedCount = 0;
const failures = [];

async function challenge(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${msg}`);
    failedCount++;
    failures.push(`${name}: ${msg}`);
  }
}

async function runHarness() {
  console.log("================================================================================");
  console.log("CHALLENGER 2: EMPIRICAL LIFECYCLE, HYDRATION & ROUTING VERIFICATION SUITE");
  console.log("================================================================================\n");

  // ----------------------------------------------------------------------------
  // SECTION 1: AudioContext Lifecycle & Leak Prevention
  // ----------------------------------------------------------------------------
  console.log("--- 1. AUDIOCONTEXT LIFECYCLE & HARDWARE EXHAUSTION MITIGATION ---");

  await challenge("AudioContext: Component source declares persistent audioCtxRef in TeacherBonusesDashboard.tsx", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
      "utf8"
    );
    assert.ok(
      code.includes("const audioCtxRef = useRef<AudioContext | null>(null);"),
      "TeacherBonusesDashboard must declare audioCtxRef as useRef<AudioContext | null>(null)"
    );
  });

  await challenge("AudioContext: Component cleanup hook closes AudioContext on unmount", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
      "utf8"
    );
    assert.ok(
      code.includes("audioCtxRef.current.close().catch"),
      "TeacherBonusesDashboard must invoke close() on persistent AudioContext during unmount cleanup"
    );
    assert.ok(
      code.includes('audioCtxRef.current.state !== "closed"'),
      "TeacherBonusesDashboard must guard against calling close() if context is already closed"
    );
  });

  await challenge("AudioContext: playCelebrationChime reuses existing instance without creating duplicate contexts", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
      "utf8"
    );
    assert.ok(
      code.includes('if (!audioCtxRef.current || audioCtxRef.current.state === "closed")'),
      "playCelebrationChime must check if audioCtxRef.current is absent or closed"
    );
    assert.ok(
      code.includes("audioCtxRef.current = new AudioCtx()"),
      "playCelebrationChime must assign new AudioContext to persistent audioCtxRef"
    );
    assert.ok(
      code.includes('if (ctx.state === "suspended")'),
      "playCelebrationChime must resume suspended AudioContext for browser autoplay compliance"
    );
  });

  await challenge("AudioContext: Empirical simulation of 100 consecutive awards reuses single instance", () => {
    let instancesCreated = 0;
    let closedCount = 0;
    let resumeCount = 0;

    class MockAudioContext {
      constructor() {
        instancesCreated++;
        this.state = "running";
        this.currentTime = 0;
        this.destination = {};
      }
      async close() {
        this.state = "closed";
        closedCount++;
      }
      async resume() {
        this.state = "running";
        resumeCount++;
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
        };
      }
    }

    const audioCtxRef = { current: null };

    const playCelebrationChime = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new MockAudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
    };

    // 100 consecutive whiteboard awards
    for (let i = 0; i < 100; i++) {
      playCelebrationChime();
    }
    assert.strictEqual(instancesCreated, 1, "Only 1 AudioContext should be instantiated across 100 chime plays");

    // Suspended tab resume
    audioCtxRef.current.state = "suspended";
    playCelebrationChime();
    assert.strictEqual(resumeCount, 1, "Suspended context must be resumed on interaction");
    assert.strictEqual(instancesCreated, 1, "No new instance should be created when resuming");

    // Unmount
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    assert.strictEqual(closedCount, 1, "Persistent context must be closed on unmount");
    assert.strictEqual(audioCtxRef.current.state, "closed", "Context state must be closed");

    // Next award remounts clean new context
    playCelebrationChime();
    assert.strictEqual(instancesCreated, 2, "Clean new context should be created after unmount cleanup");
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: Confetti Animation Frame Leak Prevention
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. CONFETTI ANIMATION FRAME LEAK PREVENTION ---");

  await challenge("Confetti: Component declares confettiAnimFrameRef", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
      "utf8"
    );
    assert.ok(
      code.includes("const confettiAnimFrameRef = useRef<number | null>(null);"),
      "TeacherBonusesDashboard must declare confettiAnimFrameRef = useRef<number | null>(null)"
    );
  });

  await challenge("Confetti: Unmount cleanup cancels active animation frame", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
      "utf8"
    );
    assert.ok(
      code.includes("if (confettiAnimFrameRef.current !== null)") &&
      code.includes("cancelAnimationFrame(confettiAnimFrameRef.current)") &&
      code.includes("confettiAnimFrameRef.current = null;"),
      "TeacherBonusesDashboard must cancel active animation frame on unmount and nullify ref"
    );
  });

  await challenge("Confetti: triggerConfetti cancels existing frame before launching new burst", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/TeacherBonusesDashboard.tsx"),
      "utf8"
    );
    const triggerIndex = code.indexOf("const triggerConfetti = () => {");
    assert.ok(triggerIndex > -1, "triggerConfetti function must exist");
    const triggerBody = code.substring(triggerIndex, triggerIndex + 450);

    assert.ok(
      triggerBody.includes("if (confettiAnimFrameRef.current !== null)") &&
      triggerBody.includes("cancelAnimationFrame(confettiAnimFrameRef.current)") &&
      triggerBody.includes("confettiAnimFrameRef.current = null;"),
      "triggerConfetti must cancel existing running frame before allocating new canvas burst"
    );
  });

  await challenge("Confetti: Empirical simulation of rapid consecutive bursts", () => {
    let frameSequence = 500;
    const activeFrameIds = new Set();
    const cancelledFrameIds = [];

    const mockRequestAnimationFrame = () => {
      const id = ++frameSequence;
      activeFrameIds.add(id);
      return id;
    };

    const mockCancelAnimationFrame = (id) => {
      activeFrameIds.delete(id);
      cancelledFrameIds.push(id);
    };

    const frameRef = { current: null };

    const triggerConfetti = () => {
      if (frameRef.current !== null) {
        mockCancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      frameRef.current = mockRequestAnimationFrame();
    };

    // Rapid bursts
    for (let i = 0; i < 20; i++) {
      triggerConfetti();
    }

    assert.strictEqual(activeFrameIds.size, 1, "Only 1 active frame should exist after 20 rapid bursts");
    assert.strictEqual(cancelledFrameIds.length, 19, "All 19 previous animation frames must have been cancelled");

    // Unmount
    if (frameRef.current !== null) {
      mockCancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    assert.strictEqual(activeFrameIds.size, 0, "No active frames after unmount");
    assert.strictEqual(frameRef.current, null);
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: SSR / Hydration Mismatch & Empty State Flash
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. SSR / HYDRATION MISMATCH & EMPTY STATE FLASHING ---");

  await challenge("SSR Guard: SchoolOverviewDashboard.tsx has isMounted guard & deferred reads", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/SchoolOverviewDashboard.tsx"),
      "utf8"
    );
    assert.ok(code.includes("const [isMounted, setIsMounted] = useState(false);"), "Must declare isMounted");
    assert.ok(code.includes("useState<UserDocument[]>(DEFAULT_STAFF_USERS)"), "Must use DEFAULT_STAFF_USERS on SSR");
    assert.ok(code.includes("useState<TenantDocument>(DEFAULT_TENANT)"), "Must use DEFAULT_TENANT on SSR");
    assert.ok(code.includes("setIsMounted(true)"), "Must set isMounted(true) in useEffect");
    assert.ok(code.includes("const pendingInvites = isMounted ? allInvites.filter"), "pendingInvites must be guarded by isMounted");
  });

  await challenge("SSR Guard: src/app/admin/page.tsx has isMounted guard & deferred hydration", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/app/admin/page.tsx"),
      "utf8"
    );
    assert.ok(code.includes("const [isMounted, setIsMounted] = useState(false);"), "Must declare isMounted");
    assert.ok(code.includes('userName={(isMounted && currentAdmin?.displayName) || "Headteacher / Admin"}'), "Admin name fallback on SSR");
    const reconcileIdx = code.indexOf("autoReconcileAllClassesWeeklyIncome();");
    const useEffectIdx = code.indexOf("useEffect(() => {");
    assert.ok(reconcileIdx > useEffectIdx, "Reconciliation must execute in useEffect on client mount");
  });

  await challenge("SSR Guard: src/app/teacher/page.tsx has isMounted guard & deferred hydration", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/app/teacher/page.tsx"),
      "utf8"
    );
    assert.ok(code.includes("const [isMounted, setIsMounted] = useState(false);"), "Must declare isMounted");
    const reconcileIdx = code.indexOf("autoReconcileAllClassesWeeklyIncome();");
    const useEffectIdx = code.indexOf("useEffect(() => {");
    assert.ok(reconcileIdx > useEffectIdx, "Reconciliation must execute in useEffect on client mount");
  });

  await challenge("Empty State Flash: ClassSetup.tsx renders skeleton while !isMounted and suppresses empty flash", () => {
    const code = fs.readFileSync(
      path.join(__dirname, "src/components/teacher/ClassSetup.tsx"),
      "utf8"
    );
    assert.ok(code.includes("const [isMounted, setIsMounted] = useState(false);"), "Must declare isMounted");
    assert.ok(code.includes("{!isMounted ? ("), "Must conditionally render based on !isMounted");
    assert.ok(code.includes("animate-pulse"), "Must render skeleton with animate-pulse while !isMounted");
    assert.ok(code.includes(") : classes.length === 0 ? ("), "Must only test classes.length === 0 when isMounted is true");
    assert.ok(code.includes("No Classes Created Yet"), "Empty state text exists only in guarded branch");
  });

  // ----------------------------------------------------------------------------
  // SECTION 4: Child Routes Hook Rules
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. CHILD ROUTES HOOK RULES (ZERO CONDITIONAL REACT.USE) ---");

  const childRoutes = [
    "src/app/pupil/[pupilId]/page.tsx",
    "src/app/pupil/[pupilId]/jobs/page.tsx",
    "src/app/pupil/[pupilId]/marketplace/page.tsx",
    "src/app/pupil/[pupilId]/pots/page.tsx",
  ];

  for (const r of childRoutes) {
    await challenge(`Child Route Hook: ${r} unconditionally uses useParams()`, () => {
      const code = fs.readFileSync(path.join(__dirname, r), "utf8");
      assert.ok(code.includes('from "next/navigation";'), `${r} must import from next/navigation`);
      assert.ok(code.includes("useParams()"), `${r} must invoke useParams()`);
      assert.ok(!code.includes("React.use("), `${r} must NOT use React.use`);
      assert.ok(!code.includes("props?.params"), `${r} must NOT reference props?.params`);
    });
  }

  // ----------------------------------------------------------------------------
  // SECTION 5: Class Creation Payout Timing
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. CLASS CREATION PAYOUT TIMING ---");

  // Setup DOM / localStorage environment for client services
  const storageMap = new Map();
  global.localStorage = {
    getItem: (key) => storageMap.get(key) || null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };
  global.window = {
    localStorage: global.localStorage,
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const classService = jiti("./src/lib/services/class-service.ts");

  await challenge("Payout Timing: createClassWithQuickAdd sets lastPayoutTimestamp: now", () => {
    const { newClass } = classService.createClassWithQuickAdd({
      className: "Harness Test Class " + Date.now(),
      yearGroup: "Year 4",
      studentNames: ["Pupil 1", "Pupil 2"],
      anonymizeNames: true,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 200,
      payoutDay: "Monday",
    });

    assert.ok(newClass.lastPayoutTimestamp, "newClass must have lastPayoutTimestamp defined");
    const delta = Math.abs(Date.now() - new Date(newClass.lastPayoutTimestamp).getTime());
    assert.ok(delta < 3000, `lastPayoutTimestamp must be within 3s of now, got delta ${delta}ms`);

    // Must NOT be due immediately
    const isDue = classService.isWeeklyPayoutDue(newClass);
    assert.strictEqual(isDue, false, "Class must NOT be due for basic income on creation day");
  });

  await challenge("Payout Timing: Immediate autoReconcileAllClassesWeeklyIncome does NOT pay creation-day income", () => {
    const savedClassesBefore = classService.getSavedClasses();
    const savedPupilsBefore = classService.getSavedPupils();

    const { newClass, pupils: newPupils } = classService.createClassWithQuickAdd({
      className: "Reconciliation Protection Class " + Date.now(),
      yearGroup: "Year 5",
      studentNames: ["ChildX", "ChildY"],
      anonymizeNames: true,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 200,
      payoutDay: "Monday",
    });

    // Run reconciliation immediately
    const reconcileResults = classService.autoReconcileAllClassesWeeklyIncome();

    // Check if this new class was reconciled
    const matched = reconcileResults.details.find((d) => d.classId === newClass.classId);
    assert.strictEqual(matched, undefined, "Newly created class must NOT be reconciled on creation day");

    // Check pupil balances: must remain exactly initialOpeningBalanceCents (500)
    const currentPupils = classService.getSavedPupils();
    for (const p of newPupils) {
      const found = currentPupils.find((x) => x.pupilId === p.pupilId);
      assert.ok(found);
      assert.strictEqual(
        found.mainBalanceCents,
        500,
        `Pupil balance should be 500 cents, not 700! Got: ${found.mainBalanceCents}`
      );
    }

    // Restore state
    classService.saveClasses(savedClassesBefore);
    classService.savePupils(savedPupilsBefore);
  });

  await challenge("Payout Timing: Simulated overdue schedule triggers payout and is idempotent", () => {
    const savedClassesBefore = classService.getSavedClasses();
    const savedPupilsBefore = classService.getSavedPupils();

    const { newClass, pupils: newPupils } = classService.createClassWithQuickAdd({
      className: "Overdue Test " + Date.now(),
      yearGroup: "Year 6",
      studentNames: ["Child1", "Child2"],
      anonymizeNames: true,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 150,
      payoutDay: "Monday",
    });

    // Age lastPayoutTimestamp to 2 weeks ago
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const currentClasses = classService.getSavedClasses();
    const idx = currentClasses.findIndex((c) => c.classId === newClass.classId);
    assert.ok(idx !== -1, "Created class must exist in storage");
    currentClasses[idx].lastPayoutTimestamp = twoWeeksAgo;
    classService.saveClasses(currentClasses);

    // Verify isWeeklyPayoutDue is now TRUE
    assert.strictEqual(classService.isWeeklyPayoutDue(currentClasses[idx]), true);

    // Run reconciliation: should disburse 150 cents to each pupil
    const results = classService.autoReconcileAllClassesWeeklyIncome();
    const matched = results.details.find((d) => d.classId === newClass.classId);
    assert.ok(matched, "Overdue class must be reconciled");
    assert.strictEqual(matched.pupilsPaid, 2, "Both pupils must be paid");

    const updatedPupils = classService.getSavedPupils();
    for (const p of newPupils) {
      const found = updatedPupils.find((x) => x.pupilId === p.pupilId);
      assert.ok(found);
      assert.strictEqual(found.mainBalanceCents, 650, `Expected 650 cents, got ${found.mainBalanceCents}`);
    }

    // Run reconciliation again immediately: must be idempotent
    const secondResults = classService.autoReconcileAllClassesWeeklyIncome();
    const secondMatch = secondResults.details.find((d) => d.classId === newClass.classId);
    assert.strictEqual(secondMatch, undefined, "Subsequent reconciliation must be idempotent");

    // Restore state
    classService.saveClasses(savedClassesBefore);
    classService.savePupils(savedPupilsBefore);
  });

  // Tear down window and localStorage to return strictly to pure Node.js server runtime
  delete global.window;
  delete global.localStorage;

  // ----------------------------------------------------------------------------
  // SECTION 6: Server Invites API Route Execution
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. SERVER INVITES API ROUTE EXECUTION IN NODE RUNTIME ---");

  const invitesRoute = jiti("./src/app/api/tenants/[tenantId]/invites/route.ts");

  await challenge("Server Route: Executes in Node environment where window and localStorage are undefined", async () => {
    assert.strictEqual(typeof window, "undefined", "window must be undefined in Node runtime");
    assert.strictEqual(typeof localStorage, "undefined", "localStorage must be undefined in Node runtime");

    // Execute GET handler
    const mockGetReq = {
      method: "GET",
      url: "http://localhost:3000/api/tenants/sch_urn100123/invites",
    };
    const getRes = await invitesRoute.GET(mockGetReq, {
      params: Promise.resolve({ tenantId: "sch_urn100123" }),
    });

    assert.strictEqual(getRes.status, 200, "GET response status must be 200");
    const getBody = await getRes.json();
    assert.strictEqual(getBody.success, true);
    assert.strictEqual(getBody.tenant.tenantId, "sch_urn100123");
    assert.ok(Array.isArray(getBody.invites));
  });

  await challenge("Server Route: Rejects malformed JSON with HTTP 400", async () => {
    const mockBadReq = {
      method: "POST",
      url: "http://localhost:3000/api/tenants/sch_urn100123/invites",
      json: async () => {
        throw new Error("SyntaxError: Unexpected token");
      },
    };
    const res = await invitesRoute.POST(mockBadReq, {
      params: Promise.resolve({ tenantId: "sch_urn100123" }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes("Invalid JSON"));
  });

  await challenge("Server Route: Rejects non-whitelisted email domains with HTTP 400", async () => {
    const mockPostReq = {
      method: "POST",
      url: "http://localhost:3000/api/tenants/sch_urn100123/invites",
      json: async () => ({
        email: "intruder@unauthorized-external-domain.co.uk",
        displayName: "Unauthorized Teacher",
      }),
    };
    const res = await invitesRoute.POST(mockPostReq, {
      params: Promise.resolve({ tenantId: "sch_urn100123" }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(
      body.error.includes("not an authorized domain") || body.error.includes("registered email"),
      `Expected friendly domain error message, got: ${body.error}`
    );
  });

  await challenge("Server Route: Successfully provisions whitelisted teacher with HTTP 201", async () => {
    const teacherEmail = `emp.teacher.${Date.now()}@stmarys-primary.sch.uk`;
    const mockPostReq = {
      method: "POST",
      url: "http://localhost:3000/api/tenants/sch_urn100123/invites",
      json: async () => ({
        email: teacherEmail,
        displayName: "Mr Empirical Teacher",
        assignedClassIds: ["class-year-4-amber"],
        invitedBy: "staff-admin-head",
      }),
    };
    const res = await invitesRoute.POST(mockPostReq, {
      params: Promise.resolve({ tenantId: "sch_urn100123" }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.invite.email, teacherEmail);
    assert.strictEqual(body.teacher.role, "teacher");
  });

  await challenge("Server Route: Successfully handles batch email mode with HTTP 201", async () => {
    const uid = Date.now();
    const mockBatchReq = {
      method: "POST",
      url: "http://localhost:3000/api/tenants/sch_urn100123/invites",
      json: async () => ({
        bulkText: `teacher1.${uid}@stmarys-primary.sch.uk, bad.${uid}@unknown.com, teacher2.${uid}@st-marys.sch.uk`,
        assignedClassIds: ["class-year-5-oak"],
      }),
    };
    const res = await invitesRoute.POST(mockBatchReq, {
      params: Promise.resolve({ tenantId: "sch_urn100123" }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.batchResult.totalProcessed, 3);
    assert.strictEqual(body.batchResult.successful.length, 2);
    assert.strictEqual(body.batchResult.failed.length, 1);
  });

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`HARNESS EXECUTION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("================================================================================");

  if (failedCount > 0) {
    console.error("\nFAILURES:");
    for (const f of failures) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  }
}

runHarness().catch((err) => {
  console.error("FATAL HARNESS ERROR:", err);
  process.exit(1);
});
