/**
 * PocketPot Class, Fintech Banking, & Pupil State Service (Zero-PII Compliant)
 * 
 * Provides reactive data management for class creation, pupil onboarding,
 * card balance tracking, recent transactions, and Savings Pots deposit/withdrawal.
 */

import {
  ClassDocument,
  PupilDocument,
  SavingsPotDocument,
  PotLedgerEntry,
  PotAccentTheme,
} from "../firebase/types";
import {
  generateClassJoinCode,
  createAnonymousPupilProfile,
  createStarterPots,
  createStarterTransactions,
  assertZeroPII,
} from "../firebase/zero-pii";
import {
  getActiveJobForPupil,
  checkAndAdvanceJobTerms,
  getSavedJobs,
  saveJobs,
  createJob,
} from "./jobs-service";
import { saveBehaviours } from "./bonus-service";
import { getStaffUsers, saveStaffUsers, createStaffUser } from "./auth-service";
import { recordClassTeacherInvitation } from "./tenant-service";

const STORAGE_KEY_CLASSES = "pocketpot_classes_v1";
const STORAGE_KEY_PUPILS = "pocketpot_pupils_v1";
const STORAGE_KEY_POTS = "pocketpot_pots_v1";
const STORAGE_KEY_TRANSACTIONS = "pocketpot_transactions_v1";

export const BALANCE_SYNC_EVENT = "pocketpot_balance_updated";

/**
 * Dispatches a reactive in-tab event whenever balances or ledger records change,
 * allowing Pupil, Teacher, and Admin views to update immediately in real time.
 */
export function notifyBalanceSync(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(BALANCE_SYNC_EVENT, { detail: { timestamp: Date.now() } })
    );
  } catch {
    // Graceful fallback for non-browser or mock environments
  }
}

export interface CreateClassPayload {
  className: string;
  yearGroup: "Year 3" | "Year 4" | "Year 5" | "Year 6";
  studentNames: string[];       // Separate box inputs for each child
  anonymizeNames?: boolean;     // true = full animal codename; false = use first name locally
  initialOpeningBalanceCents?: number; // Teacher chosen starting balance (e.g. 500 = £5.00)
  weeklyBasicIncomeCents?: number;     // Minimum basic income weekly allowance (e.g. 200 = £2.00)
  payoutDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"; // Weekly payout day
}

export interface QuickAddResult {
  newClass: ClassDocument;
  pupils: PupilDocument[];
  pots: SavingsPotDocument[];
}

/**
 * Loads cached classes from storage or seeds standard demo class.
 */
export function getSavedClasses(): ClassDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_CLASSES);
  if (stored) {
    try {
      const parsed: ClassDocument[] = JSON.parse(stored);
      // Ensure existing classes have opening balance and weekly income defaults
      return parsed.map((c) => ({
        ...c,
        schoolId: c.schoolId || "st-marys-primary",
        leadTeacherId: c.leadTeacherId || c.teacherId || "staff-teacher-davis",
        assignedTeacherIds:
          c.assignedTeacherIds && c.assignedTeacherIds.length > 0
            ? c.assignedTeacherIds
            : [c.leadTeacherId || c.teacherId || "staff-teacher-davis"],
        initialOpeningBalanceCents: c.initialOpeningBalanceCents ?? 500,
        weeklyBasicIncomeCents: c.weeklyBasicIncomeCents ?? 200,
        payoutDay: c.payoutDay ?? "Monday",
      }));
    } catch {
      // Fallback
    }
  }

  // Seed default demonstration classes across Key Stage 2
  const seedClasses: ClassDocument[] = [
    {
      classId: "class-year-4-teal",
      className: "Year 4 Teal",
      schoolId: "st-marys-primary",
      teacherId: "staff-teacher-davis",
      leadTeacherId: "staff-teacher-davis",
      assignedTeacherIds: ["staff-teacher-davis"],
      classJoinCode: "749281",
      yearGroup: "Year 4",
      pupilCount: 4,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 200,
      payoutDay: "Friday",
      aggregateMetrics: {
        totalPotsActive: 8,
        totalSavingsCents: 10600,
        pausedPotsCount: 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      classId: "class-year-4-amber",
      className: "Year 4 Amber",
      schoolId: "st-marys-primary",
      teacherId: "staff-teacher-davis",
      leadTeacherId: "staff-teacher-davis",
      assignedTeacherIds: ["staff-teacher-davis"],
      classJoinCode: "831902",
      yearGroup: "Year 4",
      pupilCount: 4,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 200,
      payoutDay: "Friday",
      aggregateMetrics: {
        totalPotsActive: 8,
        totalSavingsCents: 8500,
        pausedPotsCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      classId: "class-year-5-oak",
      className: "Year 5 Oak",
      schoolId: "st-marys-primary",
      teacherId: "staff-teacher-wilson",
      leadTeacherId: "staff-teacher-wilson",
      assignedTeacherIds: ["staff-teacher-wilson"],
      classJoinCode: "920415",
      yearGroup: "Year 5",
      pupilCount: 4,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 250,
      payoutDay: "Friday",
      aggregateMetrics: {
        totalPotsActive: 8,
        totalSavingsCents: 12000,
        pausedPotsCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      classId: "class-year-6-willow",
      className: "Year 6 Willow",
      schoolId: "st-marys-primary",
      teacherId: "staff-teacher-taylor",
      leadTeacherId: "staff-teacher-taylor",
      assignedTeacherIds: ["staff-teacher-taylor"],
      classJoinCode: "614839",
      yearGroup: "Year 6",
      pupilCount: 4,
      initialOpeningBalanceCents: 500,
      weeklyBasicIncomeCents: 300,
      payoutDay: "Friday",
      aggregateMetrics: {
        totalPotsActive: 8,
        totalSavingsCents: 15400,
        pausedPotsCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  saveClasses(seedClasses);
  seedInitialPupils(seedClasses[0].classId);
  return seedClasses;
}

/**
 * Filter classes by authenticated educator role and assignments.
 * - Admin: Sees all classes.
 * - Teacher: Strictly sees only assigned class(es).
 */
export function getSavedClassesForUser(user?: { role: string; userId: string; assignedClassIds?: string[] }): ClassDocument[] {
  const all = getSavedClasses();
  if (!user || user.role === "admin") return all;

  return all.filter((cls) => {
    const isLead = cls.leadTeacherId === user.userId;
    const isAssigned = cls.assignedTeacherIds && cls.assignedTeacherIds.includes(user.userId);
    const userHasClassId = user.assignedClassIds && user.assignedClassIds.includes(cls.classId);
    return isLead || isAssigned || userHasClassId;
  });
}

/**
 * Assign / reassign teacher ownership for a class (Admin action).
 */
export function assignTeachersToClass(
  classId: string,
  leadTeacherId: string,
  assignedTeacherIds: string[]
): ClassDocument {
  const classes = getSavedClasses();
  const idx = classes.findIndex((c) => c.classId === classId);
  if (idx === -1) throw new Error("Class not found");

  const updated: ClassDocument = {
    ...classes[idx],
    leadTeacherId,
    teacherId: leadTeacherId,
    assignedTeacherIds: assignedTeacherIds.length > 0 ? assignedTeacherIds : [leadTeacherId],
    updatedAt: new Date().toISOString(),
  };

  classes[idx] = updated;
  saveClasses(classes);
  return updated;
}

export function saveClasses(classes: ClassDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes));
  notifyBalanceSync();
}

export function getSavedPupils(): PupilDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_PUPILS);
  if (stored) {
    try {
      const parsed: PupilDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => ({
          ...p,
          pinNumber: p.pinNumber || p.cardLastFour || "1234",
        }));
      }
    } catch {
      // Fallback
    }
  }

  // Ensure initial demo pupils and classes exist
  getSavedClasses();
  const seeded = localStorage.getItem(STORAGE_KEY_PUPILS);
  if (seeded) {
    try {
      const parsed: PupilDocument[] = JSON.parse(seeded);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => ({
          ...p,
          pinNumber: p.pinNumber || p.cardLastFour || "1234",
        }));
      }
    } catch {
      // Fallback
    }
  }
  return [];
}

export function savePupils(pupils: PupilDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PUPILS, JSON.stringify(pupils));
  notifyBalanceSync();
}

export function getSavedPots(): SavingsPotDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_POTS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback
    }
  }
  return [];
}

export function savePots(pots: SavingsPotDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_POTS, JSON.stringify(pots));
  notifyBalanceSync();
}

export function getSavedTransactions(): PotLedgerEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveTransactions(txs: PotLedgerEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txs));
  notifyBalanceSync();
}

/**
 * Seeds initial demo pupils, pots, and transactions
 */
function seedInitialPupils(classId: string): void {
  const existingPupils = getSavedPupils();
  if (existingPupils.length > 0) return;

  const mockPupils: PupilDocument[] = [];
  const mockPots: SavingsPotDocument[] = [];
  const mockTxs: PotLedgerEntry[] = [];
  const now = new Date().toISOString();

  for (let i = 1; i <= 4; i++) {
    const pupil = createAnonymousPupilProfile(classId, i, {
      anonymize: true,
      initialBalanceCents: 500, // £5.00 default Account Opening Balance
    });
    mockPupils.push(pupil);
    const pots = createStarterPots(pupil.pupilId, classId);
    mockPots.push(...pots);

    // Initial Account Opening Balance ledger transaction
    const openingTx: PotLedgerEntry = {
      transactionId: crypto.randomUUID(),
      pupilId: pupil.pupilId,
      classId,
      title: "Account Opening Balance",
      deltaCents: 500,
      type: "reward",
      category: "income",
      nonPunitiveNote: "Welcome deposit credited to your card balance",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    };

    const txs = createStarterTransactions(pupil.pupilId, classId);
    mockTxs.push(openingTx, ...txs);
  }

  savePupils(mockPupils);
  savePots(mockPots);
  saveTransactions(mockTxs);
}

/**
 * Validates whether a class name already exists (case-insensitive).
 */
export function isClassNameDuplicate(className: string): boolean {
  const trimmed = className.trim().toLowerCase();
  if (!trimmed) return false;
  const classes = getSavedClasses();
  return classes.some((c) => c.className.trim().toLowerCase() === trimmed);
}

/**
 * Creates a brand new Class and provisions pupil accounts with starter fintech card balances.
 */
export function createClassWithQuickAdd(
  payload: CreateClassPayload
): QuickAddResult {
  const trimmedClassName = payload.className.trim();
  if (!trimmedClassName) {
    throw new Error("Class name cannot be empty.");
  }

  // Enforce unique class names
  const currentClasses = getSavedClasses();
  const duplicate = currentClasses.some(
    (c) => c.className.trim().toLowerCase() === trimmedClassName.toLowerCase()
  );
  if (duplicate) {
    throw new Error(
      `A class named "${trimmedClassName}" already exists. Please choose a unique class name.`
    );
  }

  const classId = `class-${crypto.randomUUID().slice(0, 8)}`;
  const classJoinCode = generateClassJoinCode();
  const now = new Date().toISOString();

  const enteredNames = payload.studentNames
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const effectiveNames = enteredNames.length > 0 ? enteredNames : ["", "", "", "", ""];
  const pupilCount = effectiveNames.length;
  const anonymize = payload.anonymizeNames ?? true;

  const initialOpeningBalanceCents = Math.max(0, payload.initialOpeningBalanceCents ?? 500);
  const weeklyBasicIncomeCents = Math.max(0, payload.weeklyBasicIncomeCents ?? 200);
  const payoutDay = payload.payoutDay ?? "Monday";

  const newPupils: PupilDocument[] = [];
  const newPots: SavingsPotDocument[] = [];
  const newTxs: PotLedgerEntry[] = [];

  for (let idx = 0; idx < pupilCount; idx++) {
    const rawName = effectiveNames[idx] || undefined;
    const pupil = createAnonymousPupilProfile(classId, idx + 1, {
      localDisplayName: rawName,
      anonymize,
      initialBalanceCents: initialOpeningBalanceCents,
    });

    assertZeroPII(pupil as unknown as Record<string, unknown>);
    newPupils.push(pupil);

    // Starter Savings Pots
    const pots = createStarterPots(pupil.pupilId, classId);
    pots.forEach((p) => assertZeroPII(p as unknown as Record<string, unknown>));
    newPots.push(...pots);

    // Initial Account Opening Balance transaction
    const openingTx: PotLedgerEntry = {
      transactionId: crypto.randomUUID(),
      pupilId: pupil.pupilId,
      classId,
      title: "Account Opening Balance",
      deltaCents: initialOpeningBalanceCents,
      type: "reward",
      category: "income",
      nonPunitiveNote: `Account opening deposit credited to your card`,
      timestamp: now,
    };
    newTxs.push(openingTx);

    const txs = createStarterTransactions(pupil.pupilId, classId);
    newTxs.push(...txs);
  }

  const newClass: ClassDocument = {
    classId,
    className: trimmedClassName,
    teacherId: "teacher-oak-lead",
    classJoinCode,
    yearGroup: payload.yearGroup,
    pupilCount,
    initialOpeningBalanceCents,
    weeklyBasicIncomeCents,
    payoutDay,
    aggregateMetrics: {
      totalPotsActive: newPots.length,
      totalSavingsCents: newPots.reduce((acc, p) => acc + p.currentAmountCents, 0),
      pausedPotsCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  saveClasses([newClass, ...currentClasses]);
  savePupils([...newPupils, ...getSavedPupils()]);
  savePots([...newPots, ...getSavedPots()]);
  saveTransactions([...newTxs, ...getSavedTransactions()]);

  return { newClass, pupils: newPupils, pots: newPots };
}

/**
 * Retrieves a pupil by UUID v4 or route alias (e.g. "pupil-1", "1", codename)
 */
export function getPupilById(pupilId: string): PupilDocument | null {
  if (!pupilId) return null;
  const pupils = getSavedPupils();
  if (pupils.length === 0) return null;

  // 1. Direct UUID match
  const exact = pupils.find((p) => p.pupilId === pupilId);
  if (exact) return exact;

  // 2. Numeric / alias match (e.g. "pupil-1", "pupil-2", "1", "2")
  const cleanId = pupilId.toLowerCase().trim();
  const numMatch = cleanId.match(/^(?:pupil-?)?(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    // Match deskBadgeNumber
    const byBadge = pupils.find((p) => p.deskBadgeNumber === num);
    if (byBadge) return byBadge;
    // Match 1-based index (e.g. pupil-1 -> pupils[0])
    if (num >= 1 && num <= pupils.length) {
      return pupils[num - 1];
    }
  }

  // 3. Educational codename or local name match
  const byName = pupils.find(
    (p) =>
      p.educationalCodename.toLowerCase() === cleanId ||
      (p.localDisplayName && p.localDisplayName.toLowerCase() === cleanId)
  );
  if (byName) return byName;

  // 4. Fallback for demo routes like "demo" or unknown pupilId when pupils exist
  if (cleanId === "demo" || cleanId === "test" || cleanId.startsWith("pupil-")) {
    return pupils[0];
  }

  return null;
}

/**
 * Retrieves all Savings Pots belonging to a pupil
 */
export function getPotsForPupil(pupilId: string): SavingsPotDocument[] {
  const pupil = getPupilById(pupilId);
  const realId = pupil ? pupil.pupilId : pupilId;
  const pots = getSavedPots();
  let pupilPots = pots.filter((p) => p.pupilId === realId);

  // If pupil exists but has no pots seeded yet, generate starter pots
  if (pupilPots.length === 0 && pupil) {
    pupilPots = createStarterPots(realId, pupil.classId);
    savePots([...pots, ...pupilPots]);
  }

  return pupilPots;
}

/**
 * Retrieves recent transactions for a pupil (default limit 3 for main banking view)
 */
export function getPupilTransactions(
  pupilId: string,
  limit: number = 3
): PotLedgerEntry[] {
  const pupil = getPupilById(pupilId);
  const realId = pupil ? pupil.pupilId : pupilId;
  const allTxs = getSavedTransactions();
  const pupilTxs = allTxs
    .filter((tx) => tx.pupilId === realId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (pupilTxs.length === 0 && pupil) {
    // Generate initial starter transactions on the fly if none exist
    const starterTxs = createStarterTransactions(realId, pupil.classId);
    saveTransactions([...starterTxs, ...allTxs]);
    return starterTxs.slice(0, limit);
  }

  return pupilTxs.slice(0, limit);
}

/**
 * DEPOSIT: Move funds from child's available Card Balance into a Savings Pot
 */
export function depositToPotFromAccount(
  pupilId: string,
  potId: string,
  amountCents: number
): { pot: SavingsPotDocument; updatedPupil: PupilDocument; tx: PotLedgerEntry } {
  const pupils = getSavedPupils();
  const targetPupil = getPupilById(pupilId);
  if (!targetPupil) throw new Error("Pupil account not found");
  const realPupilId = targetPupil.pupilId;

  const pupilIdx = pupils.findIndex((p) => p.pupilId === realPupilId);
  if (pupilIdx === -1) throw new Error("Pupil account not found");

  const pupil = { ...pupils[pupilIdx] };
  if (pupil.mainBalanceCents < amountCents) {
    throw new Error("Your card balance needs more seeds before transferring into this Pot.");
  }

  const pots = getSavedPots();
  const potIdx = pots.findIndex((p) => p.potId === potId && p.pupilId === realPupilId);
  if (potIdx === -1) throw new Error("Savings Pot not found");

  const targetPot = { ...pots[potIdx] };

  // Transfer funds: Card -> Pot
  pupil.mainBalanceCents -= amountCents;
  targetPot.currentAmountCents += amountCents;
  targetPot.lastInteractionAt = new Date().toISOString();
  if (targetPot.currentAmountCents >= targetPot.targetAmountCents) {
    targetPot.status = "goal_reached";
  }

  // Update target pot in array so pupil totalSavedCents is calculated from all active pots
  pots[potIdx] = targetPot;
  const pupilPots = pots.filter((p) => p.pupilId === realPupilId);
  pupil.totalSavedCents = pupilPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  pupil.updatedAt = new Date().toISOString();

  // Create ledger entry
  const now = new Date().toISOString();
  const tx: PotLedgerEntry = {
    transactionId: crypto.randomUUID(),
    pupilId: realPupilId,
    classId: pupil.classId,
    potId,
    title: `Added to ${targetPot.title}`,
    deltaCents: -amountCents,
    type: "pot_deposit",
    category: "pots",
    nonPunitiveNote: `Moved seeds from card into ${targetPot.title}`,
    timestamp: now,
  };

  // Commit updates
  pupils[pupilIdx] = pupil;
  savePupils(pupils);
  savePots(pots);

  const txs = getSavedTransactions();
  saveTransactions([tx, ...txs]);

  return { pot: targetPot, updatedPupil: pupil, tx };
}

/**
 * WITHDRAW: Take money out of a Savings Pot back into the child's available Card Balance
 */
export function withdrawFromPotToAccount(
  pupilId: string,
  potId: string,
  amountCents: number
): { pot: SavingsPotDocument; updatedPupil: PupilDocument; tx: PotLedgerEntry } {
  const pupils = getSavedPupils();
  const targetPupil = getPupilById(pupilId);
  if (!targetPupil) throw new Error("Pupil account not found");
  const realPupilId = targetPupil.pupilId;

  const pots = getSavedPots();
  const potIdx = pots.findIndex((p) => p.potId === potId && p.pupilId === realPupilId);
  if (potIdx === -1) throw new Error("Savings Pot not found");

  const targetPot = { ...pots[potIdx] };
  if (targetPot.currentAmountCents < amountCents) {
    throw new Error("There are not enough seeds in this Pot to withdraw that amount.");
  }

  const pupilIdx = pupils.findIndex((p) => p.pupilId === realPupilId);
  if (pupilIdx === -1) throw new Error("Pupil account not found");

  const pupil = { ...pupils[pupilIdx] };

  // Transfer funds: Pot -> Card
  targetPot.currentAmountCents -= amountCents;
  targetPot.lastInteractionAt = new Date().toISOString();
  if (targetPot.currentAmountCents < targetPot.targetAmountCents && targetPot.status === "goal_reached") {
    targetPot.status = "active";
  }

  pupil.mainBalanceCents += amountCents;
  pots[potIdx] = targetPot;
  const pupilPots = pots.filter((p) => p.pupilId === realPupilId);
  pupil.totalSavedCents = pupilPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  pupil.updatedAt = new Date().toISOString();

  // Create ledger entry
  const now = new Date().toISOString();
  const tx: PotLedgerEntry = {
    transactionId: crypto.randomUUID(),
    pupilId: realPupilId,
    classId: pupil.classId,
    potId,
    title: `Withdrawn from ${targetPot.title}`,
    deltaCents: amountCents, // positive for inflow to card
    type: "pot_withdraw",
    category: "pots",
    nonPunitiveNote: `Moved seeds from ${targetPot.title} back to your Card Balance`,
    timestamp: now,
  };

  pots[potIdx] = targetPot;
  savePots(pots);

  pupils[pupilIdx] = pupil;
  savePupils(pupils);

  const txs = getSavedTransactions();
  saveTransactions([tx, ...txs]);

  return { pot: targetPot, updatedPupil: pupil, tx };
}

/**
 * Toggles non-punitive pause state on a Savings Pot
 */
export function togglePotPauseState(
  pupilId: string,
  potId: string
): SavingsPotDocument {
  const pots = getSavedPots();
  const potIndex = pots.findIndex((p) => p.potId === potId && p.pupilId === pupilId);
  if (potIndex === -1) {
    throw new Error("Savings Pot not found");
  }

  const targetPot = { ...pots[potIndex] };
  targetPot.status =
    targetPot.status === "taking_a_pause" ? "active" : "taking_a_pause";
  targetPot.lastInteractionAt = new Date().toISOString();
  pots[potIndex] = targetPot;
  savePots(pots);

  return targetPot;
}

/**
 * Add classroom allowance / task reward to pupil's card balance
 */
export function addAllowanceToAccount(
  pupilId: string,
  amountCents: number,
  rewardTitle: string = "School Task Reward"
): { updatedPupil: PupilDocument; tx: PotLedgerEntry } {
  const pupils = getSavedPupils();
  const pupilIdx = pupils.findIndex((p) => p.pupilId === pupilId);
  if (pupilIdx === -1) throw new Error("Pupil account not found");

  const pupil = { ...pupils[pupilIdx] };
  pupil.mainBalanceCents += amountCents;
  pupil.updatedAt = new Date().toISOString();

  const now = new Date().toISOString();
  const tx: PotLedgerEntry = {
    transactionId: crypto.randomUUID(),
    pupilId,
    classId: pupil.classId,
    title: rewardTitle,
    deltaCents: amountCents,
    type: "reward",
    category: "income",
    nonPunitiveNote: `${rewardTitle} credited to card`,
    timestamp: now,
  };

  pupils[pupilIdx] = pupil;
  savePupils(pupils);

  const txs = getSavedTransactions();
  saveTransactions([tx, ...txs]);

  return { updatedPupil: pupil, tx };
}

/**
 * CREATE A NEW SAVINGS POT FOR A PUPIL
 */
export function createPupilPot(
  pupilId: string,
  payload: {
    title: string;
    targetAmountCents: number;
    categoryLabel?: string;
    potNote?: string;
    theme?: PotAccentTheme;
  }
): { pot: SavingsPotDocument; updatedPupil: PupilDocument } {
  const pupils = getSavedPupils();
  const targetPupil = getPupilById(pupilId);
  if (!targetPupil) throw new Error("Pupil account not found");
  const realPupilId = targetPupil.pupilId;

  const pupilIdx = pupils.findIndex((p) => p.pupilId === realPupilId);
  if (pupilIdx === -1) throw new Error("Pupil account not found");

  const pupil = { ...pupils[pupilIdx] };
  const now = new Date().toISOString();

  const newPot: SavingsPotDocument = {
    potId: `pot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    pupilId: realPupilId,
    classId: pupil.classId,
    title: payload.title.trim() || "My New Savings Pot",
    theme: payload.theme || "calmingTeal",
    targetAmountCents: Math.max(100, payload.targetAmountCents), // Minimum £1.00
    currentAmountCents: 0,
    status: "active",
    categoryLabel: payload.categoryLabel || "Personal Goal",
    potNote: payload.potNote?.trim() || undefined,
    lastInteractionAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const pots = getSavedPots();
  const updatedPots = [...pots, newPot];
  savePots(updatedPots);

  const pupilPots = updatedPots.filter((p) => p.pupilId === realPupilId);
  pupil.activePotsCount = pupilPots.length;
  pupil.totalSavedCents = pupilPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  pupil.updatedAt = now;
  pupils[pupilIdx] = pupil;
  savePupils(pupils);

  return { pot: newPot, updatedPupil: pupil };
}

/**
 * DELETE A SAVINGS POT & REVERT ALL FUNDS TO PUPIL'S MAIN CARD BALANCE
 */
export function deleteSavingsPot(
  pupilId: string,
  potId: string
): { refundedCents: number; updatedPupil: PupilDocument } {
  const targetPupil = getPupilById(pupilId);
  if (!targetPupil) throw new Error("Pupil account not found");
  const realPupilId = targetPupil.pupilId;

  const pots = getSavedPots();
  const targetPot = pots.find((p) => p.potId === potId && p.pupilId === realPupilId);
  if (!targetPot) throw new Error("Savings Pot not found");

  const pupils = getSavedPupils();
  const pupilIdx = pupils.findIndex((p) => p.pupilId === realPupilId);
  if (pupilIdx === -1) throw new Error("Pupil account not found");

  const pupil = { ...pupils[pupilIdx] };
  const refundedCents = targetPot.currentAmountCents;
  const now = new Date().toISOString();

  // Revert all funds in this pot back to the pupil's main card balance
  if (refundedCents > 0) {
    pupil.mainBalanceCents += refundedCents;

    const tx: PotLedgerEntry = {
      transactionId: crypto.randomUUID(),
      pupilId: realPupilId,
      classId: pupil.classId,
      potId,
      title: `Pot Closed: ${targetPot.title}`,
      deltaCents: refundedCents,
      type: "pot_withdraw",
      category: "pots",
      nonPunitiveNote: `Pot closed. All ${refundedCents}p returned to your card balance.`,
      timestamp: now,
    };

    const txs = getSavedTransactions();
    saveTransactions([tx, ...txs]);
  }

  // Remove pot from saved list
  const filteredPots = pots.filter((p) => !(p.potId === potId && p.pupilId === realPupilId));
  savePots(filteredPots);

  const remainingPupilPots = filteredPots.filter((p) => p.pupilId === realPupilId);
  pupil.activePotsCount = remainingPupilPots.length;
  pupil.totalSavedCents = remainingPupilPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  pupil.updatedAt = now;
  pupils[pupilIdx] = pupil;
  savePupils(pupils);

  return { refundedCents, updatedPupil: pupil };
}

/**
 * UPDATE POT NOTE
 */
export function updatePotNote(
  pupilId: string,
  potId: string,
  newNote: string
): SavingsPotDocument {
  const pots = getSavedPots();
  const potIdx = pots.findIndex((p) => p.potId === potId && p.pupilId === pupilId);
  if (potIdx === -1) throw new Error("Savings Pot not found");

  const pot = { ...pots[potIdx] };
  pot.potNote = newNote.trim() || undefined;
  pot.updatedAt = new Date().toISOString();
  pot.lastInteractionAt = pot.updatedAt;

  pots[potIdx] = pot;
  savePots(pots);

  return pot;
}

/**
 * DELETE A PUPIL ACCOUNT AND CLEAN UP THEIR POTS AND LEDGER
 */
export function deletePupil(pupilId: string): { success: boolean; deletedPupilId: string } {
  const pupils = getSavedPupils();
  const pupil = pupils.find((p) => p.pupilId === pupilId);
  if (!pupil) throw new Error("Student account not found");

  // Remove pupil
  const updatedPupils = pupils.filter((p) => p.pupilId !== pupilId);
  savePupils(updatedPupils);

  // Remove pupil's pots
  const pots = getSavedPots();
  const pupilPots = pots.filter((p) => p.pupilId === pupilId);
  const updatedPots = pots.filter((p) => p.pupilId !== pupilId);
  savePots(updatedPots);

  // Remove pupil's transactions
  const txs = getSavedTransactions();
  const updatedTxs = txs.filter((t) => t.pupilId !== pupilId);
  saveTransactions(updatedTxs);

  // Update class aggregate metrics if class exists
  if (pupil.classId) {
    const classes = getSavedClasses();
    const classIdx = classes.findIndex((c) => c.classId === pupil.classId);
    if (classIdx !== -1) {
      const cls = { ...classes[classIdx] };
      cls.pupilCount = Math.max(0, cls.pupilCount - 1);
      const totalSavingsRemoved = pupilPots.reduce((acc, p) => acc + p.currentAmountCents, 0);
      cls.aggregateMetrics = {
        ...cls.aggregateMetrics,
        totalPotsActive: Math.max(0, cls.aggregateMetrics.totalPotsActive - pupilPots.length),
        totalSavingsCents: Math.max(0, cls.aggregateMetrics.totalSavingsCents - totalSavingsRemoved),
      };
      cls.updatedAt = new Date().toISOString();
      classes[classIdx] = cls;
      saveClasses(classes);
    }
  }

  return { success: true, deletedPupilId: pupilId };
}

/**
 * Resets a pupil's 4-digit card/login PIN (Teacher or Admin action).
 */
export function resetPupilPin(
  pupilId: string,
  newCustomPin?: string
): { pupil: PupilDocument; newPin: string } {
  const pupils = getSavedPupils();
  const idx = pupils.findIndex((p) => p.pupilId === pupilId);
  if (idx === -1) throw new Error("Student account not found");

  const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
  const finalPin = newCustomPin && /^\d{4}$/.test(newCustomPin) ? newCustomPin : generatedPin;

  const updated: PupilDocument = {
    ...pupils[idx],
    pinNumber: finalPin,
    updatedAt: new Date().toISOString(),
  };

  pupils[idx] = updated;
  savePupils(pupils);
  return { pupil: updated, newPin: finalPin };
}

/**
 * ENROLL A SINGLE PUPIL INTO AN EXISTING CLASS (Requirement 1c)
 * Accessible to both Teachers (in their class) and Admins (in any class).
 */
export function enrollSinglePupil(
  classId: string,
  options?: {
    localDisplayName?: string;
    anonymize?: boolean;
    initialBalanceCents?: number;
  }
): PupilDocument {
  const classes = getSavedClasses();
  const cls = classes.find((c) => c.classId === classId);
  if (!cls) throw new Error("Class not found");

  const existingPupils = getSavedPupils();
  const classPupils = existingPupils.filter((p) => p.classId === classId);
  const nextBadgeSequence = classPupils.length + 1;

  const openingBalanceCents =
    options?.initialBalanceCents !== undefined
      ? Math.max(0, options.initialBalanceCents)
      : cls.initialOpeningBalanceCents ?? 500;

  const anonymize = options?.anonymize ?? true;
  const rawName = options?.localDisplayName ? options.localDisplayName.trim() : undefined;

  const newPupil = createAnonymousPupilProfile(classId, nextBadgeSequence, {
    localDisplayName: rawName,
    anonymize,
    initialBalanceCents: openingBalanceCents,
  });

  assertZeroPII(newPupil as unknown as Record<string, unknown>);

  // Starter Pots matching curriculum standard
  const pots = createStarterPots(newPupil.pupilId, classId);
  pots.forEach((p) => assertZeroPII(p as unknown as Record<string, unknown>));

  const now = new Date().toISOString();
  // Opening Balance transaction
  const openingTx: PotLedgerEntry = {
    transactionId: crypto.randomUUID(),
    pupilId: newPupil.pupilId,
    classId,
    title: "Account Opening Balance",
    deltaCents: openingBalanceCents,
    type: "reward",
    category: "income",
    nonPunitiveNote: "Account opening deposit credited to your card",
    timestamp: now,
  };

  const starterTxs = createStarterTransactions(newPupil.pupilId, classId);

  // Persist
  savePupils([newPupil, ...existingPupils]);
  savePots([...pots, ...getSavedPots()]);
  saveTransactions([openingTx, ...starterTxs, ...getSavedTransactions()]);

  // Update Class Metrics
  const classIdx = classes.findIndex((c) => c.classId === classId);
  if (classIdx !== -1) {
    const updatedCls = { ...classes[classIdx] };
    updatedCls.pupilCount = (updatedCls.pupilCount || 0) + 1;
    updatedCls.aggregateMetrics = {
      ...updatedCls.aggregateMetrics,
      totalPotsActive: (updatedCls.aggregateMetrics?.totalPotsActive || 0) + pots.length,
      totalSavingsCents:
        (updatedCls.aggregateMetrics?.totalSavingsCents || 0) +
        pots.reduce((sum, p) => sum + p.currentAmountCents, 0),
    };
    updatedCls.updatedAt = now;
    classes[classIdx] = updatedCls;
    saveClasses(classes);
  }

  return newPupil;
}

/**
 * ENROLL BATCH PUPILS INTO AN EXISTING CLASS (e.g. via CSV Ingestion - Requirement 1d)
 */
export function enrollBatchPupils(
  classId: string,
  pupilNames: string[],
  anonymize: boolean = true,
  initialOpeningBalanceCents?: number
): PupilDocument[] {
  const classes = getSavedClasses();
  const cls = classes.find((c) => c.classId === classId);
  if (!cls) throw new Error("Class not found");

  const existingPupils = getSavedPupils();
  const classPupils = existingPupils.filter((p) => p.classId === classId);
  let badgeSeq = classPupils.length + 1;

  const openingBalanceCents =
    initialOpeningBalanceCents !== undefined
      ? Math.max(0, initialOpeningBalanceCents)
      : cls.initialOpeningBalanceCents ?? 500;

  const newPupils: PupilDocument[] = [];
  const newPots: SavingsPotDocument[] = [];
  const newTxs: PotLedgerEntry[] = [];
  const now = new Date().toISOString();

  const effectiveNames = pupilNames.length > 0 ? pupilNames : ["", "", "", ""];

  for (const name of effectiveNames) {
    const rawName = name.trim().length > 0 ? name.trim() : undefined;
    const pupil = createAnonymousPupilProfile(classId, badgeSeq++, {
      localDisplayName: rawName,
      anonymize,
      initialBalanceCents: openingBalanceCents,
    });
    assertZeroPII(pupil as unknown as Record<string, unknown>);
    newPupils.push(pupil);

    const pots = createStarterPots(pupil.pupilId, classId);
    pots.forEach((p) => assertZeroPII(p as unknown as Record<string, unknown>));
    newPots.push(...pots);

    const openingTx: PotLedgerEntry = {
      transactionId: crypto.randomUUID(),
      pupilId: pupil.pupilId,
      classId,
      title: "Account Opening Balance",
      deltaCents: openingBalanceCents,
      type: "reward",
      category: "income",
      nonPunitiveNote: "Account opening deposit credited to your card",
      timestamp: now,
    };
    newTxs.push(openingTx);
    const starterTxs = createStarterTransactions(pupil.pupilId, classId);
    newTxs.push(...starterTxs);
  }

  savePupils([...newPupils, ...existingPupils]);
  savePots([...newPots, ...getSavedPots()]);
  saveTransactions([...newTxs, ...getSavedTransactions()]);

  // Update Class Metrics
  const classIdx = classes.findIndex((c) => c.classId === classId);
  if (classIdx !== -1) {
    const updatedCls = { ...classes[classIdx] };
    updatedCls.pupilCount = (updatedCls.pupilCount || 0) + newPupils.length;
    updatedCls.aggregateMetrics = {
      ...updatedCls.aggregateMetrics,
      totalPotsActive: (updatedCls.aggregateMetrics?.totalPotsActive || 0) + newPots.length,
      totalSavingsCents:
        (updatedCls.aggregateMetrics?.totalSavingsCents || 0) +
        newPots.reduce((sum, p) => sum + p.currentAmountCents, 0),
    };
    updatedCls.updatedAt = now;
    classes[classIdx] = updatedCls;
    saveClasses(classes);
  }

  return newPupils;
}

export interface MultiClassEnrollmentItem {
  classId: string;
  pupilNames: string[];
}

/**
 * Atomically enrolls multiple classrooms from a whole-school MIS CSV upload (Requirement 1).
 */
export function enrollMultiClassPupils(
  enrollments: MultiClassEnrollmentItem[],
  anonymize: boolean = true
): { totalEnrolled: number; perClass: Record<string, number>; allPupils: PupilDocument[] } {
  let totalEnrolled = 0;
  const perClass: Record<string, number> = {};
  const allPupils: PupilDocument[] = [];

  for (const item of enrollments) {
    if (item.classId && item.pupilNames.length > 0) {
      const enrolled = enrollBatchPupils(item.classId, item.pupilNames, anonymize);
      totalEnrolled += enrolled.length;
      perClass[item.classId] = enrolled.length;
      allPupils.push(...enrolled);
    }
  }

  return { totalEnrolled, perClass, allPupils };
}

/**
 * DELETE AN ENTIRE CLASS AND ALL ASSOCIATED PUPILS AND POTS
 */
export function deleteClass(classId: string): { success: boolean; deletedClassId: string } {
  const classes = getSavedClasses();
  const classIdx = classes.findIndex((c) => c.classId === classId);
  if (classIdx === -1) throw new Error("Class not found");

  // Remove class
  const updatedClasses = classes.filter((c) => c.classId !== classId);
  saveClasses(updatedClasses);

  // Find all pupils in this class
  const pupils = getSavedPupils();
  const classPupils = pupils.filter((p) => p.classId === classId);
  const classPupilIds = new Set(classPupils.map((p) => p.pupilId));

  // Remove pupils in this class
  const updatedPupils = pupils.filter((p) => p.classId !== classId);
  savePupils(updatedPupils);

  // Remove all pots for this class or these pupils
  const pots = getSavedPots();
  const updatedPots = pots.filter((p) => p.classId !== classId && !classPupilIds.has(p.pupilId));
  savePots(updatedPots);

  // Remove transactions
  const txs = getSavedTransactions();
  const updatedTxs = txs.filter((t) => t.classId !== classId && !classPupilIds.has(t.pupilId));
  saveTransactions(updatedTxs);

  return { success: true, deletedClassId: classId };
}

/**
 * DAY INDEX LOOKUP FOR REAL-WORLD SCHEDULING (0 = Sunday ... 6 = Saturday)
 */
const PAYOUT_DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Calculates the exact timestamp of the most recent scheduled payout time (e.g. 08:00 AM on payoutDay)
 */
export function getMostRecentScheduledPayoutTime(
  payoutDay: string = "Monday",
  currentTime: Date = new Date(),
  payoutHour: number = 8
): Date {
  const targetDayIndex = PAYOUT_DAY_INDEX[payoutDay] ?? 1; // Default Monday (1)
  const result = new Date(currentTime);
  const currentDayIndex = result.getDay();

  let daysDiff = currentDayIndex - targetDayIndex;
  if (daysDiff < 0) {
    daysDiff += 7;
  } else if (daysDiff === 0) {
    // If today is the payout day, check if scheduled hour (e.g. 08:00 AM) has passed
    if (result.getHours() < payoutHour) {
      daysDiff = 7; // Target time was 7 days ago
    }
  }

  result.setDate(result.getDate() - daysDiff);
  result.setHours(payoutHour, 0, 0, 0);
  return result;
}

/**
 * Calculates the upcoming scheduled payout time
 */
export function getNextScheduledPayoutTime(
  payoutDay: string = "Monday",
  currentTime: Date = new Date(),
  payoutHour: number = 8
): Date {
  const targetDayIndex = PAYOUT_DAY_INDEX[payoutDay] ?? 1;
  const result = new Date(currentTime);
  const currentDayIndex = result.getDay();

  let daysUntil = targetDayIndex - currentDayIndex;
  if (daysUntil < 0) {
    daysUntil += 7;
  } else if (daysUntil === 0) {
    if (result.getHours() >= payoutHour) {
      daysUntil = 7;
    }
  }

  result.setDate(result.getDate() + daysUntil);
  result.setHours(payoutHour, 0, 0, 0);
  return result;
}

/**
 * Determines whether a class's automated weekly basic income payout is currently due
 */
export function isWeeklyPayoutDue(
  cls: ClassDocument,
  currentTime: Date = new Date()
): boolean {
  if (!cls.weeklyBasicIncomeCents || cls.weeklyBasicIncomeCents <= 0) {
    return false;
  }

  const mostRecentScheduled = getMostRecentScheduledPayoutTime(
    cls.payoutDay ?? "Monday",
    currentTime
  );

  // If never paid, payout is due
  if (!cls.lastPayoutTimestamp) {
    return true;
  }

  const lastPayout = new Date(cls.lastPayoutTimestamp);
  return lastPayout.getTime() < mostRecentScheduled.getTime();
}

/**
 * AUTOMATED WEEKLY BASIC INCOME RECONCILIATION ENGINE
 * 
 * In real-world operation, this runs automatically on session start, route navigation,
 * and scheduled background intervals. It checks every enrolled class against the calendar,
 * verifies whether the weekly payout day has occurred, and idempotently credits all pupils
 * without requiring any manual button click from teachers or pupils.
 */
export function autoReconcileAllClassesWeeklyIncome(
  currentTime: Date = new Date()
): {
  reconciledCount: number;
  details: Array<{
    classId: string;
    className: string;
    pupilsPaid: number;
    amountCents: number;
  }>;
} {
  const classes = getSavedClasses();
  const details: Array<{
    classId: string;
    className: string;
    pupilsPaid: number;
    amountCents: number;
  }> = [];

  for (const cls of classes) {
    if (isWeeklyPayoutDue(cls, currentTime)) {
      try {
        const result = distributeWeeklyBasicIncome(cls.classId, {
          isAutomated: true,
          scheduledTimestamp: currentTime.toISOString(),
        });
        details.push({
          classId: cls.classId,
          className: cls.className,
          pupilsPaid: result.pupilCount,
          amountCents: result.amountCents,
        });
      } catch {
        // Skip classes that cannot be processed
      }
    }
  }

  return {
    reconciledCount: details.length,
    details,
  };
}

/**
 * DISTRIBUTE WEEKLY MINIMUM BASIC INCOME TO ALL PUPILS IN A CLASS
 */
export function distributeWeeklyBasicIncome(
  classId: string,
  options?: { isAutomated?: boolean; scheduledTimestamp?: string }
): {
  updatedClass: ClassDocument;
  pupilCount: number;
  amountCents: number;
} {
  const classes = getSavedClasses();
  const classIdx = classes.findIndex((c) => c.classId === classId);
  if (classIdx === -1) throw new Error("Class not found");

  const cls = { ...classes[classIdx] };
  const weeklyAmountCents = cls.weeklyBasicIncomeCents ?? 200;
  if (weeklyAmountCents <= 0) {
    throw new Error("Weekly Basic Income is currently set to zero.");
  }

  // Check job terms & reminders first
  checkAndAdvanceJobTerms(classId);

  const pupils = getSavedPupils();
  const now = options?.scheduledTimestamp || new Date().toISOString();
  let paidCount = 0;
  const newTxs: PotLedgerEntry[] = [];

  const updatedPupils = pupils.map((p) => {
    if (p.classId === classId) {
      paidCount++;
      let newBalance = (p.mainBalanceCents || 0) + weeklyAmountCents;

      // 1. Basic Income Transaction
      newTxs.push({
        transactionId: crypto.randomUUID(),
        pupilId: p.pupilId,
        classId,
        title: "Minimum Basic Income",
        deltaCents: weeklyAmountCents,
        type: "basic_income" as const,
        category: "income" as const,
        nonPunitiveNote: `Automated weekly basic income credited on ${cls.payoutDay ?? "Monday"}`,
        timestamp: now,
      });

      // 2. Active Job Wage (Paid on the exact same day as Basic Income)
      const activeJob = getActiveJobForPupil(p.pupilId);
      if (activeJob && activeJob.status === "filled" && activeJob.wageCents > 0) {
        newBalance += activeJob.wageCents;
        newTxs.push({
          transactionId: crypto.randomUUID(),
          pupilId: p.pupilId,
          classId,
          title: `Job Wage: ${activeJob.title}`,
          deltaCents: activeJob.wageCents,
          type: "job_wage" as const,
          category: "income" as const,
          nonPunitiveNote: `Weekly earnings for classroom role as ${activeJob.title}`,
          timestamp: now,
        });
      }

      return {
        ...p,
        mainBalanceCents: newBalance,
        updatedAt: now,
      };
    }
    return p;
  });

  savePupils(updatedPupils);

  // Save all transactions
  const txs = getSavedTransactions();
  saveTransactions([...newTxs, ...txs]);

  // Update class last payout timestamp
  cls.lastPayoutTimestamp = now;
  cls.updatedAt = now;
  classes[classIdx] = cls;
  saveClasses(classes);

  return {
    updatedClass: cls,
    pupilCount: paidCount,
    amountCents: weeklyAmountCents,
  };
}

/**
 * UPDATE CLASS SETTINGS (WEEKLY BASIC INCOME, PAYOUT DAY, OPENING BALANCE)
 */
export function updateClassSettings(
  classId: string,
  settings: {
    initialOpeningBalanceCents?: number;
    weeklyBasicIncomeCents?: number;
    payoutDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  }
): ClassDocument {
  const classes = getSavedClasses();
  const classIdx = classes.findIndex((c) => c.classId === classId);
  if (classIdx === -1) throw new Error("Class not found");

  const cls = { ...classes[classIdx] };
  if (settings.initialOpeningBalanceCents !== undefined) {
    cls.initialOpeningBalanceCents = Math.max(0, settings.initialOpeningBalanceCents);
  }
  if (settings.weeklyBasicIncomeCents !== undefined) {
    cls.weeklyBasicIncomeCents = Math.max(0, settings.weeklyBasicIncomeCents);
  }
  if (settings.payoutDay !== undefined) {
    cls.payoutDay = settings.payoutDay;
  }
  cls.updatedAt = new Date().toISOString();
  classes[classIdx] = cls;
  saveClasses(classes);

  return cls;
}

export interface StarterPotOption {
  title: string;
  categoryLabel: string;
  targetAmountCents: number;
  theme: "calmingTeal" | "warmAmber" | "sageGreen";
}

export interface StarterJobOption {
  title: string;
  description: string;
  wageCents: number;
  termWeeks: number;
  requiredQualities: string[];
  cvPrompt?: string;
}

export interface StarterBehaviourOption {
  title: string;
  definition: string;
  amountCents: number;
  icon: string;
  colorTheme: "calmingTeal" | "warmAmber" | "sageGreen" | "electricIndigo";
}

export interface ClassroomWizardConfig {
  className: string;
  yearGroup: "Year 3" | "Year 4" | "Year 5" | "Year 6";
  leadTeacherId?: string;
  assignedTeacherIds?: string[];
  newTeacherEmail?: string;
  newTeacherDisplayName?: string;
  studentCount: number;
  studentNames?: string[];
  anonymizeNames: boolean;
  initialOpeningBalanceCents: number;
  weeklyBasicIncomeCents: number;
  payoutDay: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  starterPots: StarterPotOption[];
  starterJobs: StarterJobOption[];
  starterBehaviours: StarterBehaviourOption[];
}

/**
 * FAST-TRACK CLASSROOM SETUP WIZARD ORCHESTRATION
 * Atomically provisions:
 * 1. Class & Join Code
 * 2. Pupil Bank Cards & Zero-PII Roster
 * 3. Curriculum-aligned Starter Savings Pots
 * 4. Classroom Jobs Board starter postings
 * 5. Interactive Whiteboard Positive Behaviour reward cards
 */
export function setupClassroomWithWizard(config: ClassroomWizardConfig): {
  newClass: ClassDocument;
  pupils: PupilDocument[];
  pots: SavingsPotDocument[];
} {
  // 1. Prepare Student Names or Anonymous Placeholders
  let namesToUse: string[] = [];
  if (!config.anonymizeNames && config.studentNames && config.studentNames.length > 0) {
    namesToUse = config.studentNames.map((n) => n.trim()).filter((n) => n.length > 0);
  }

  // If count exceeds provided names, fill with placeholders
  const targetCount = Math.max(1, config.studentCount || (namesToUse.length > 0 ? namesToUse.length : 24));
  while (namesToUse.length < targetCount) {
    namesToUse.push("");
  }

  // 2. Create Class with QuickAdd
  const result = createClassWithQuickAdd({
    className: config.className,
    yearGroup: config.yearGroup,
    studentNames: namesToUse,
    anonymizeNames: config.anonymizeNames,
    initialOpeningBalanceCents: config.initialOpeningBalanceCents,
    weeklyBasicIncomeCents: config.weeklyBasicIncomeCents,
    payoutDay: config.payoutDay,
  });

  const { newClass, pupils } = result;

  // 2b. Assign Teacher(s) as part of Classroom Setup (Requirement 2, 3, 4)
  if (
    config.leadTeacherId ||
    config.newTeacherEmail ||
    (config.assignedTeacherIds && config.assignedTeacherIds.length > 0)
  ) {
    let finalLeadId = config.leadTeacherId || newClass.leadTeacherId || newClass.teacherId;
    let finalAssigned = config.assignedTeacherIds ? [...config.assignedTeacherIds] : [];

    // If admin entered a new teacher's email during setup:
    if (config.newTeacherEmail) {
      const staff = getStaffUsers();
      const normEmail = config.newTeacherEmail.trim().toLowerCase();
      const existing = staff.find((s) => s.email?.toLowerCase() === normEmail);

      if (existing) {
        // Teacher exists -> Link class to existing account (Requirement 4: DO NOT create duplicate)
        if (!existing.assignedClassIds?.includes(newClass.classId)) {
          existing.assignedClassIds = [...(existing.assignedClassIds || []), newClass.classId];
          saveStaffUsers(staff);
        }
        finalLeadId = existing.userId;
      } else {
        // Create single new teacher account
        const newTeacher = createStaffUser({
          displayName: config.newTeacherDisplayName || `Teacher (${normEmail.split("@")[0]})`,
          email: normEmail,
          role: "teacher",
          assignedClassIds: [newClass.classId],
        });
        finalLeadId = newTeacher.userId;
      }

      // Record class invitation (Requirement 3: Teacher gets invite once class is created)
      recordClassTeacherInvitation({
        email: normEmail,
        classId: newClass.classId,
        className: newClass.className,
        classJoinCode: newClass.classJoinCode,
      });
    } else if (config.leadTeacherId) {
      // Existing teacher assigned
      const staff = getStaffUsers();
      const teacher = staff.find((s) => s.userId === config.leadTeacherId);
      if (teacher) {
        const alreadyHadClasses = (teacher.assignedClassIds?.length || 0) > 0;
        if (!teacher.assignedClassIds?.includes(newClass.classId)) {
          teacher.assignedClassIds = [...(teacher.assignedClassIds || []), newClass.classId];
          saveStaffUsers(staff);
        }
        // Send invite/notification for this class (Requirement 3 & 4)
        if (teacher.email) {
          recordClassTeacherInvitation({
            email: teacher.email,
            classId: newClass.classId,
            className: newClass.className,
            classJoinCode: newClass.classJoinCode,
            isAdditionalClass: alreadyHadClasses,
          });
        }
      }
    }

    if (!finalAssigned.includes(finalLeadId)) {
      finalAssigned = [finalLeadId, ...finalAssigned];
    }

    newClass.leadTeacherId = finalLeadId;
    newClass.teacherId = finalLeadId;
    newClass.assignedTeacherIds = finalAssigned;

    const allClasses = getSavedClasses();
    const cIdx = allClasses.findIndex((c) => c.classId === newClass.classId);
    if (cIdx !== -1) {
      allClasses[cIdx] = newClass;
      saveClasses(allClasses);
    }
  }

  // 3. Customize Starter Pots if specific pots were selected
  let finalPots = result.pots;
  if (config.starterPots && config.starterPots.length > 0) {
    const allPots = getSavedPots().filter((p) => p.classId !== newClass.classId);
    const customPots: SavingsPotDocument[] = [];
    const now = new Date().toISOString();

    for (const pupil of pupils) {
      for (const sp of config.starterPots) {
        const pot: SavingsPotDocument = {
          potId: crypto.randomUUID(),
          pupilId: pupil.pupilId,
          classId: newClass.classId,
          title: sp.title,
          theme: sp.theme,
          targetAmountCents: sp.targetAmountCents,
          currentAmountCents: 0,
          status: "active",
          categoryLabel: sp.categoryLabel,
          lastInteractionAt: now,
          createdAt: now,
          updatedAt: now,
        };
        assertZeroPII(pot as unknown as Record<string, unknown>);
        customPots.push(pot);
      }
    }

    // Update pupil activePotsCount
    const allPupils = getSavedPupils().map((p) => {
      if (p.classId === newClass.classId) {
        return { ...p, activePotsCount: config.starterPots.length };
      }
      return p;
    });
    savePupils(allPupils);

    savePots([...customPots, ...allPots]);
    finalPots = customPots;
  }

  // 4. Create Selected Classroom Jobs
  if (config.starterJobs && config.starterJobs.length > 0) {
    for (const job of config.starterJobs) {
      createJob({
        classId: newClass.classId,
        teacherId: "teacher-current",
        title: job.title,
        description: job.description,
        wageCents: job.wageCents,
        termWeeks: job.termWeeks,
        requiredQualities: job.requiredQualities,
        cvPrompt: job.cvPrompt,
      });
    }
  }

  // 5. Activate / Save Selected Behaviours
  if (config.starterBehaviours && config.starterBehaviours.length > 0) {
    const now = new Date().toISOString();
    const formattedBehaviours = config.starterBehaviours.map((b, i) => ({
      behaviourId: `wizard-beh-${i + 1}-${crypto.randomUUID().slice(0, 6)}`,
      classId: newClass.classId,
      title: b.title,
      definition: b.definition,
      amountCents: b.amountCents,
      icon: b.icon,
      colorTheme: b.colorTheme,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    }));
    saveBehaviours(formattedBehaviours);
  }

  return {
    newClass,
    pupils,
    pots: finalPots,
  };
}


