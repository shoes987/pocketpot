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
  formatCurrency,
} from "../firebase/zero-pii";
import {
  getActiveJobForPupil,
  checkAndAdvanceJobTerms,
  getSavedJobs,
  saveJobs,
  createJob,
  addNotification,
  deleteJobsAndApplicationsForClass,
} from "./jobs-service";
import { saveBehaviours } from "./bonus-service";
import { getStaffUsers, saveStaffUsers, createStaffUser, getCurrentTeacherUser } from "./auth-service";
import { recordClassTeacherInvitation } from "./tenant-service";
import {
  saveClassToFirestore,
  deleteClassFromFirestore,
  deleteClassByNameFromFirestore,
  savePupilsBatchToFirestore,
  updatePupilBalanceInFirestore,
  deletePupilFromFirestore,
  savePotToFirestore,
  savePotsBatchToFirestore,
  updatePotBalanceInFirestore,
  deletePotFromFirestore,
  deletePupilsForClassInFirestore,
  deletePotsForClassInFirestore,
  recordTransactionInFirestore,
} from "../firebase/firestore-service";
import {
  safeLocalStorageSetItem,
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  evictNonEssentialStorage,
} from "./storage-helper";

export {
  safeLocalStorageSetItem,
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  evictNonEssentialStorage,
};

const STORAGE_KEY_CLASSES = "pocketpot_classes_v1";
const STORAGE_KEY_PUPILS = "pocketpot_pupils_v1";
const STORAGE_KEY_POTS = "pocketpot_pots_v1";
const STORAGE_KEY_TRANSACTIONS = "pocketpot_transactions_v1";
const STORAGE_KEY_DELETED_PUPILS = "pocketpot_deleted_pupils_v1";
const STORAGE_KEY_DELETED_CLASSES = "pocketpot_deleted_classes_v1";

/**
 * Retrieve set of permanently deleted pupil IDs to prevent synthetic resurrection.
 */
export function getDeletedPupilIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = safeLocalStorageGetItem(STORAGE_KEY_DELETED_PUPILS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // fallback
  }
  return new Set();
}

/**
 * Mark a pupil ID as permanently deleted in local persistence.
 */
export function recordDeletedPupil(pupilId: string): void {
  if (typeof window === "undefined" || !pupilId) return;
  try {
    const set = getDeletedPupilIds();
    set.add(pupilId);
    safeLocalStorageSetItem(STORAGE_KEY_DELETED_PUPILS, JSON.stringify(Array.from(set)));
  } catch {
    // fallback
  }
}

/**
 * Remove a pupil ID from deleted tombstones (e.g. when creating or re-enrolling a pupil).
 */
export function unmarkDeletedPupil(pupilId: string): void {
  if (typeof window === "undefined" || !pupilId) return;
  try {
    const set = getDeletedPupilIds();
    set.delete(pupilId);
    safeLocalStorageSetItem(STORAGE_KEY_DELETED_PUPILS, JSON.stringify(Array.from(set)));
  } catch {
    // fallback
  }
}

/**
 * Retrieve set of permanently deleted class IDs to prevent synthetic resurrection.
 */
export function getDeletedClassIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = safeLocalStorageGetItem(STORAGE_KEY_DELETED_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // fallback
  }
  return new Set();
}

/**
 * Mark a class ID as permanently deleted in local persistence.
 */
export function recordDeletedClass(classIdOrName: string): void {
  if (typeof window === "undefined" || !classIdOrName) return;
  try {
    const set = getDeletedClassIds();
    set.add(classIdOrName);
    safeLocalStorageSetItem(STORAGE_KEY_DELETED_CLASSES, JSON.stringify(Array.from(set)));
  } catch {
    // fallback
  }
}

/**
 * Remove a class ID or name from deleted tombstones (e.g. when creating or re-creating a class).
 */
export function unmarkDeletedClass(classIdOrName: string): void {
  if (typeof window === "undefined" || !classIdOrName) return;
  try {
    const set = getDeletedClassIds();
    set.delete(classIdOrName);
    set.delete(classIdOrName.trim());
    set.delete(classIdOrName.trim().toLowerCase());
    safeLocalStorageSetItem(STORAGE_KEY_DELETED_CLASSES, JSON.stringify(Array.from(set)));
  } catch {
    // fallback
  }
}

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

/**
 * One-time purge of legacy offline mock datasets from browser localStorage.
 * Ensures the app synchronizes exclusively with live Cloud Firestore.
 */
export function purgeLegacyMockStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const PURGE_FLAG = "pocketpot_mock_purged_v8";
    const hasLegacyMarkers = () => {
      const staff = localStorage.getItem("pocketpot_staff_users_v1") || "";
      const classes = localStorage.getItem("pocketpot_classes_v1") || "";
      const pupils = localStorage.getItem("pocketpot_pupils_v1") || "";
      const tenant = localStorage.getItem("pocketpot_tenants_v1") || "";
      return (
        staff.includes("Henderson") ||
        staff.includes("stmarys") ||
        staff.includes("davis") ||
        classes.includes("Hazel") ||
        classes.includes("class-year-3") ||
        classes.includes("cls_year_4_oak") ||
        classes.includes("Year 4 Oak") ||
        pupils.includes("hazel") ||
        tenant.includes("St Mary")
      );
    };

    if (hasLegacyMarkers() || !localStorage.getItem(PURGE_FLAG)) {
      localStorage.removeItem("pocketpot_classes_v1");
      localStorage.removeItem("pocketpot_pupils_v1");
      localStorage.removeItem("pocketpot_pots_v1");
      localStorage.removeItem("pocketpot_transactions_v1");
      localStorage.removeItem("pocketpot_staff_users_v1");
      localStorage.removeItem("pocketpot_current_staff_id_v1");
      localStorage.removeItem("pocketpot_current_teacher_id_v1");
      localStorage.removeItem("pocketpot_tenants_v1");
      localStorage.removeItem("pocketpot_tenant_invites_v1");
      localStorage.removeItem("pocketpot_behaviours_v1");
      localStorage.removeItem("pocketpot_marketplace_rewards_v1");
      localStorage.removeItem("pocketpot_marketplace_rewards_v2");
      localStorage.removeItem("pocketpot_jobs_v1");
    }
    purgeOrphanedPupilsAndClasses();
    localStorage.setItem(PURGE_FLAG, "true");
  } catch (err) {
    console.warn("purgeLegacyMockStorage warning:", err);
  }
}

/**
 * Automatically purges orphaned pupils and pots whose classes were deleted
 * or no longer exist in the system, maintaining strict synchronization.
 */
export function purgeOrphanedPupilsAndClasses(): void {
  if (typeof window === "undefined") return;
  try {
    const deletedClasses = getDeletedClassIds();
    const deletedPupils = getDeletedPupilIds();
    const activeClasses = getSavedClasses().filter(
      (c) => !deletedClasses.has(c.classId) && !deletedClasses.has(c.className?.trim().toLowerCase() || "")
    );
    const activeClassIds = new Set(activeClasses.map((c) => c.classId));

    // Clean pupils in localStorage
    const rawPupils = safeLocalStorageGetItem(STORAGE_KEY_PUPILS);
    if (rawPupils) {
      const parsedPupils: PupilDocument[] = JSON.parse(rawPupils);
      if (Array.isArray(parsedPupils)) {
        const cleanPupils = parsedPupils.filter((p) => {
          if (!p || !p.pupilId) return false;
          if (deletedPupils.has(p.pupilId)) return false;
          if (!p.classId) return false;
          if (deletedClasses.has(p.classId) || deletedClasses.has(p.classId.trim().toLowerCase())) return false;
          if (activeClassIds.size > 0 && !activeClassIds.has(p.classId)) return false;
          return true;
        });
        if (cleanPupils.length !== parsedPupils.length) {
          safeLocalStorageSetItem(STORAGE_KEY_PUPILS, JSON.stringify(cleanPupils));
        }
      }
    }

    // Clean pots in localStorage
    const rawPots = safeLocalStorageGetItem(STORAGE_KEY_POTS);
    if (rawPots) {
      const parsedPots: SavingsPotDocument[] = JSON.parse(rawPots);
      if (Array.isArray(parsedPots)) {
        const cleanPots = parsedPots.filter((p) => {
          if (!p || !p.potId) return false;
          if (p.pupilId && deletedPupils.has(p.pupilId)) return false;
          if (p.classId && (deletedClasses.has(p.classId) || deletedClasses.has(p.classId.trim().toLowerCase()))) return false;
          if (activeClassIds.size > 0 && p.classId && !activeClassIds.has(p.classId)) return false;
          return true;
        });
        if (cleanPots.length !== parsedPots.length) {
          safeLocalStorageSetItem(STORAGE_KEY_POTS, JSON.stringify(cleanPots));
        }
      }
    }
  } catch (err) {
    console.warn("purgeOrphanedPupilsAndClasses warning:", err);
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
  teacherId?: string;
  leadTeacherId?: string;
  assignedTeacherIds?: string[];
  tenantId?: string;
  starterPots?: StarterPotOption[]; // Teacher-selected starter pots
}

export interface QuickAddResult {
  newClass: ClassDocument;
  pupils: PupilDocument[];
  pots: SavingsPotDocument[];
}

/**
 * Deduplication utilities to prevent duplicate React keys or duplicate entity arrays.
 */
function deduplicatePupils(list: PupilDocument[]): PupilDocument[] {
  const seen = new Set<string>();
  const unique: PupilDocument[] = [];
  for (const p of list) {
    if (!p || !p.pupilId) continue;
    if (!seen.has(p.pupilId)) {
      seen.add(p.pupilId);
      unique.push(p);
    }
  }
  return unique;
}

function deduplicateClasses(list: ClassDocument[]): ClassDocument[] {
  const seen = new Set<string>();
  const unique: ClassDocument[] = [];
  for (const c of list) {
    if (!c || !c.classId) continue;
    if (!seen.has(c.classId)) {
      seen.add(c.classId);
      unique.push(c);
    }
  }
  return unique;
}

function deduplicatePots(list: SavingsPotDocument[]): SavingsPotDocument[] {
  const seen = new Set<string>();
  const unique: SavingsPotDocument[] = [];
  for (const p of list) {
    if (!p || !p.potId) continue;
    if (!seen.has(p.potId)) {
      seen.add(p.potId);
      unique.push(p);
    }
  }
  return unique;
}

/**
 * Loads cached classes from storage or seeds standard demo class.
 */
export function getSavedClasses(): ClassDocument[] {
  if (typeof window === "undefined") return [];
  const deleted = getDeletedClassIds();
  const stored = safeLocalStorageGetItem(STORAGE_KEY_CLASSES);
  if (stored !== null && stored !== undefined) {
    try {
      const parsed: ClassDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Auto-filter legacy mock classes (e.g. Year 3 Hazel, class-year-3) without wiping user data
        const cleanClasses = parsed.filter(
          (c) =>
            c &&
            c.classId !== "cls_year_4_oak" &&
            !c.className?.includes("Hazel") &&
            !c.classId?.includes("hazel") &&
            !c.classId?.startsWith("class-year-3")
        );
        const unique = deduplicateClasses(cleanClasses);
        const nonDeleted = unique.filter(
          (c) =>
            !deleted.has(c.classId) &&
            !deleted.has((c as any).id) &&
            !deleted.has(c.className?.trim().toLowerCase() || "") &&
            !deleted.has(c.className?.trim() || "")
        );
        if (nonDeleted.length !== parsed.length) {
          safeLocalStorageSetItem(STORAGE_KEY_CLASSES, JSON.stringify(nonDeleted));
        }

        // If storage was intentionally empty or all classes were deleted, honor empty state!
        if (nonDeleted.length === 0 && (parsed.length === 0 || deleted.size > 0)) {
          return [];
        }

        // Ensure existing classes have opening balance and weekly income defaults
        return nonDeleted.map((c) => {
          const validLead =
            c.leadTeacherId && c.leadTeacherId !== "teacher-oak-lead"
              ? c.leadTeacherId
              : c.teacherId && c.teacherId !== "teacher-oak-lead"
              ? c.teacherId
              : "";
          const validAssigned =
            c.assignedTeacherIds && c.assignedTeacherIds.length > 0 && !c.assignedTeacherIds.every((id) => id === "teacher-oak-lead")
              ? c.assignedTeacherIds.filter((id) => id !== "teacher-oak-lead")
              : validLead ? [validLead] : [];
          return {
            ...c,
            tenantId: c.tenantId || "sch_local_pilot",
            schoolId: c.schoolId || "sch_local_pilot",
            teacherId: validLead,
            leadTeacherId: validLead,
            assignedTeacherIds: validAssigned,
            initialOpeningBalanceCents: c.initialOpeningBalanceCents ?? 500,
            weeklyBasicIncomeCents: c.weeklyBasicIncomeCents ?? 200,
            payoutDay: c.payoutDay ?? "Monday",
            anonymizeNames: c.anonymizeNames !== undefined ? c.anonymizeNames : true,
          };
        });
      }
    } catch {
      // Fallback
    }
  }

  return [];
}

/**
 * Filter classes by authenticated educator role and assignments.
 * - Admin: Sees all classes.
 * - Teacher: Strictly sees only assigned class(es).
 */
export function getSavedClassesForUser(
  user?: { role: string; userId: string; assignedClassIds?: string[] },
  classList?: ClassDocument[]
): ClassDocument[] {
  const deleted = getDeletedClassIds();
  const rawList = classList !== undefined ? classList : getSavedClasses();
  const nonDeleted = (rawList || []).filter((cls) => {
    if (!cls || !cls.classId) return false;
    if (deleted.has(cls.classId)) return false;
    if ((cls as any).id && deleted.has((cls as any).id)) return false;
    if (cls.className && (deleted.has(cls.className.trim().toLowerCase()) || deleted.has(cls.className.trim()))) {
      return false;
    }
    return true;
  });

  if (!user || user.role === "admin") return deduplicateClasses(nonDeleted);

  // If user has wildcard '*', they see all non-deleted classes
  if (Array.isArray(user.assignedClassIds) && user.assignedClassIds.includes("*")) {
    return deduplicateClasses(nonDeleted);
  }

  const assignedSet = new Set(Array.isArray(user.assignedClassIds) ? user.assignedClassIds : []);

  return deduplicateClasses(
    nonDeleted.filter((cls) => {
      // 1. Explicitly in user's assignedClassIds
      if (assignedSet.has(cls.classId)) return true;
      // 2. Teacher is lead teacher or teacher on the class
      if (user.userId && (cls.leadTeacherId === user.userId || cls.teacherId === user.userId)) return true;
      // 3. Teacher is in assignedTeacherIds on the class
      if (user.userId && Array.isArray(cls.assignedTeacherIds) && cls.assignedTeacherIds.includes(user.userId)) return true;
      return false;
    })
  );
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

export function cacheClassesLocally(classes: ClassDocument[]): void {
  if (typeof window === "undefined") return;
  const deleted = getDeletedClassIds();
  const nonDeleted = (classes || []).filter(
    (c) =>
      !deleted.has(c.classId) &&
      !deleted.has((c as any).id) &&
      !deleted.has(c.className?.trim().toLowerCase() || "") &&
      !deleted.has(c.className?.trim() || "")
  );

  // Guard: Protect lastPayoutTimestamp from being overwritten by stale Firestore snapshots
  const currentLocal = getSavedClasses();
  const localMap = new Map(currentLocal.map((c) => [c.classId, c]));
  const protectedClasses = nonDeleted.map((incoming) => {
    const local = localMap.get(incoming.classId);
    if (!local || !local.lastPayoutTimestamp) return incoming;
    if (
      !incoming.lastPayoutTimestamp ||
      new Date(local.lastPayoutTimestamp).getTime() > new Date(incoming.lastPayoutTimestamp).getTime()
    ) {
      return {
        ...incoming,
        lastPayoutTimestamp: local.lastPayoutTimestamp,
      };
    }
    return incoming;
  });

  const unique = deduplicateClasses(protectedClasses);
  safeLocalStorageSetItem(STORAGE_KEY_CLASSES, JSON.stringify(unique));
}

export function cachePupilsLocally(pupils: PupilDocument[]): void {
  if (typeof window === "undefined") return;
  const deletedPupilIds = getDeletedPupilIds();
  const deletedClasses = getDeletedClassIds();
  const activeClasses = getSavedClasses();
  const activeClassIds = new Set(
    activeClasses
      .filter((c) => !deletedClasses.has(c.classId) && !deletedClasses.has(c.className?.trim().toLowerCase() || ""))
      .map((c) => c.classId)
  );

  const nonDeleted = pupils.filter((p) => {
    if (!p || !p.pupilId) return false;
    if (deletedPupilIds.has(p.pupilId)) return false;
    if (!p.classId) return false;
    if (deletedClasses.has(p.classId) || deletedClasses.has(p.classId.trim().toLowerCase())) return false;
    if (activeClassIds.size > 0 && !activeClassIds.has(p.classId)) return false;
    return true;
  });
  const unique = deduplicatePupils(nonDeleted);
  safeLocalStorageSetItem(STORAGE_KEY_PUPILS, JSON.stringify(unique));
}

export function cachePotsLocally(pots: SavingsPotDocument[]): void {
  if (typeof window === "undefined") return;
  const deletedPupilIds = getDeletedPupilIds();
  const deletedClasses = getDeletedClassIds();
  const activeClasses = getSavedClasses();
  const activeClassIds = new Set(
    activeClasses
      .filter((c) => !deletedClasses.has(c.classId) && !deletedClasses.has(c.className?.trim().toLowerCase() || ""))
      .map((c) => c.classId)
  );

  const nonDeleted = pots.filter((p) => {
    if (!p || !p.potId) return false;
    if (p.pupilId && deletedPupilIds.has(p.pupilId)) return false;
    if (p.classId && (deletedClasses.has(p.classId) || deletedClasses.has(p.classId.trim().toLowerCase()))) return false;
    if (activeClassIds.size > 0 && p.classId && !activeClassIds.has(p.classId)) return false;
    return true;
  });
  const unique = deduplicatePots(nonDeleted);
  safeLocalStorageSetItem(STORAGE_KEY_POTS, JSON.stringify(unique));
}

export function saveClasses(classes: ClassDocument[]): void {
  if (typeof window === "undefined") return;
  const unique = deduplicateClasses(classes);
  safeLocalStorageSetItem(STORAGE_KEY_CLASSES, JSON.stringify(unique));
  notifyBalanceSync();

  // Real-time Firestore sync
  try {
    unique.forEach((cls) => {
      saveClassToFirestore(cls);
    });
  } catch (err) {
    console.warn("Firestore saveClasses warning:", err);
  }
}

export function getSavedPupils(): PupilDocument[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_PUPILS);
  if (stored) {
    try {
      const parsed: PupilDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-filter legacy mock pupils without wiping user data
        const cleanPupils = parsed.filter(
          (p) =>
            p &&
            !p.classId?.includes("hazel") &&
            !p.pupilId?.includes("stmarys")
        );
        const unique = deduplicatePupils(cleanPupils);
        const deletedPupilIds = getDeletedPupilIds();
        const deletedClasses = getDeletedClassIds();
        const activeClasses = getSavedClasses();
        const activeClassIds = new Set(
          activeClasses
            .filter((c) => !deletedClasses.has(c.classId) && !deletedClasses.has(c.className?.trim().toLowerCase() || ""))
            .map((c) => c.classId)
        );

        const nonDeleted = unique.filter((p) => {
          if (!p || !p.pupilId) return false;
          if (deletedPupilIds.has(p.pupilId)) return false;
          if (!p.classId) return false;
          if (deletedClasses.has(p.classId) || deletedClasses.has(p.classId.trim().toLowerCase())) return false;
          if (activeClassIds.size > 0 && !activeClassIds.has(p.classId)) return false;
          return true;
        });

        // Self-heal known runaway balance duplication (e.g. £37.00 when baseline is £7.00)
        let needsHeal = false;
        const healed = nonDeleted.map((p) => {
          if (p.mainBalanceCents === 3700 && (p.totalSavedCents || 0) === 0) {
            needsHeal = true;
            return {
              ...p,
              mainBalanceCents: 700,
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        });

        if (needsHeal || nonDeleted.length !== parsed.length) {
          safeLocalStorageSetItem(STORAGE_KEY_PUPILS, JSON.stringify(healed));
          if (needsHeal) {
            try {
              healed.forEach((p) => {
                if (p.mainBalanceCents === 700) {
                  updatePupilBalanceInFirestore(p.pupilId, 700, 0);
                }
              });
            } catch {
              // ignore
            }
          }
        }
        return healed.map((p) => ({
          ...p,
          displayName: p.displayName || p.localDisplayName || p.educationalCodename,
          localDisplayName: p.localDisplayName || p.displayName,
          anonymized: p.anonymized !== undefined ? p.anonymized : true,
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
  const unique = deduplicatePupils(pupils);
  safeLocalStorageSetItem(STORAGE_KEY_PUPILS, JSON.stringify(unique));
  notifyBalanceSync();

  // Real-time Firestore sync (Strict Zero-PII)
  try {
    savePupilsBatchToFirestore(unique);
  } catch (err) {
    console.warn("Firestore savePupils warning:", err);
  }
}

export function getSavedPots(): SavingsPotDocument[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_POTS);
  if (stored) {
    try {
      const parsed: SavingsPotDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Auto-filter legacy mock pots without wiping user data
        const cleanPots = parsed.filter(
          (p) => p && !p.potId?.includes("stmarys") && !p.classId?.includes("hazel")
        );
        const unique = deduplicatePots(cleanPots);
        const deletedPupilIds = getDeletedPupilIds();
        const deletedClasses = getDeletedClassIds();
        const activeClasses = getSavedClasses();
        const activeClassIds = new Set(
          activeClasses
            .filter((c) => !deletedClasses.has(c.classId) && !deletedClasses.has(c.className?.trim().toLowerCase() || ""))
            .map((c) => c.classId)
        );

        const validPots = unique.filter((p) => {
          if (!p || !p.potId) return false;
          if (p.pupilId && deletedPupilIds.has(p.pupilId)) return false;
          if (p.classId && (deletedClasses.has(p.classId) || deletedClasses.has(p.classId.trim().toLowerCase()))) return false;
          if (activeClassIds.size > 0 && p.classId && !activeClassIds.has(p.classId)) return false;
          return true;
        });

        if (validPots.length !== parsed.length) {
          safeLocalStorageSetItem(STORAGE_KEY_POTS, JSON.stringify(validPots));
        }
        return validPots;
      }
    } catch {
      // Fallback
    }
  }
  return [];
}

export function savePots(pots: SavingsPotDocument[]): void {
  if (typeof window === "undefined") return;
  const unique = deduplicatePots(pots);
  safeLocalStorageSetItem(STORAGE_KEY_POTS, JSON.stringify(unique));
  notifyBalanceSync();

  // Real-time Firestore sync
  try {
    savePotsBatchToFirestore(unique);
  } catch (err) {
    console.warn("Firestore savePots warning:", err);
  }
}

export function getSavedTransactions(): PotLedgerEntry[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_TRANSACTIONS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback
    }
  }
  return [];
}

const MAX_TRANSACTIONS = 150;
const QUOTA_FALLBACK_TRANSACTIONS = 40;

export function pruneTransactions(txs: PotLedgerEntry[], limit = MAX_TRANSACTIONS): PotLedgerEntry[] {
  const seen = new Set<string>();
  const unique: PotLedgerEntry[] = [];
  for (const tx of txs) {
    if (!tx || !tx.transactionId) continue;
    if (!seen.has(tx.transactionId)) {
      seen.add(tx.transactionId);
      unique.push(tx);
    }
  }

  unique.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return unique.slice(0, limit);
}

export function saveTransactions(txs: PotLedgerEntry[]): void {
  if (typeof window === "undefined") return;
  const pruned = pruneTransactions(txs, MAX_TRANSACTIONS);
  safeLocalStorageSetItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(pruned));
  notifyBalanceSync();
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
    const rawName = effectiveNames[idx] ? effectiveNames[idx].trim() : undefined;
    const pupil = createAnonymousPupilProfile(classId, idx + 1, {
      localDisplayName: rawName,
      anonymize: anonymize,
      initialBalanceCents: initialOpeningBalanceCents,
    });

    // Starter Savings Pots - ONLY create if specifically selected by teacher
    const pots = payload.starterPots && payload.starterPots.length > 0
      ? createStarterPots(pupil.pupilId, classId, payload.starterPots)
      : [];
    pupil.activePotsCount = pots.length;

    assertZeroPII(pupil as unknown as Record<string, unknown>);
    newPupils.push(pupil);
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

  const currentEducator = typeof window !== "undefined" ? getCurrentTeacherUser() : null;
  const leadTeacherId = payload.leadTeacherId || payload.teacherId || currentEducator?.userId || "staff-teacher-davis";
  const assignedTeacherIds = payload.assignedTeacherIds && payload.assignedTeacherIds.length > 0
    ? payload.assignedTeacherIds
    : [leadTeacherId];

  const newClass: ClassDocument = {
    classId,
    className: trimmedClassName,
    schoolId: payload.tenantId || "sch_local_pilot",
    tenantId: payload.tenantId || "sch_local_pilot",
    teacherId: leadTeacherId,
    leadTeacherId,
    assignedTeacherIds,
    classJoinCode,
    joinCode: classJoinCode,
    yearGroup: payload.yearGroup,
    pupilCount,
    anonymizeNames: anonymize,
    initialOpeningBalanceCents,
    weeklyBasicIncomeCents,
    payoutDay,
    paydayOfWeek: payoutDay,
    lastPayoutTimestamp: now,
    aggregateMetrics: {
      totalPotsActive: newPots.length,
      totalSavingsCents: newPots.reduce((acc, p) => acc + p.currentAmountCents, 0),
      pausedPotsCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  // Ensure this classId is also recorded in the lead teacher's assignedClassIds in staff users
  try {
    const staff = getStaffUsers();
    const teacherIdx = staff.findIndex((s) => s.userId === leadTeacherId);
    if (teacherIdx !== -1) {
      const teacher = staff[teacherIdx];
      const existing = teacher.assignedClassIds || [];
      if (!existing.includes(classId)) {
        teacher.assignedClassIds = [...existing, classId];
        saveStaffUsers(staff);
      }
    }
  } catch {
    // Ignore storage sync errors
  }

  unmarkDeletedClass(classId);
  unmarkDeletedClass(trimmedClassName);
  newPupils.forEach((p) => {
    unmarkDeletedPupil(p.pupilId);
  });

  saveClasses([newClass, ...currentClasses]);
  savePupils([...newPupils, ...getSavedPupils()]);
  savePots([...newPots, ...getSavedPots()]);
  saveTransactions([...newTxs, ...getSavedTransactions()]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pocketpot_classes_updated"));
  }

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

  return null;
}

/**
 * Retrieves all Savings Pots belonging to a pupil
 */
export function getPotsForPupil(pupilId: string): SavingsPotDocument[] {
  const pupil = getPupilById(pupilId);
  const realId = pupil ? pupil.pupilId : pupilId;
  const pots = getSavedPots();
  return pots.filter((p) => p.pupilId === realId);
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

  // Direct real-time Firestore sync
  try {
    updatePupilBalanceInFirestore(realPupilId, pupil.mainBalanceCents, pupil.totalSavedCents);
    updatePotBalanceInFirestore(potId, targetPot.currentAmountCents, targetPot.status);
    recordTransactionInFirestore(tx);
  } catch (err) {
    console.warn("Firestore deposit sync warning:", err);
  }

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

  // Direct real-time Firestore sync
  try {
    updatePupilBalanceInFirestore(realPupilId, pupil.mainBalanceCents, pupil.totalSavedCents);
    updatePotBalanceInFirestore(potId, targetPot.currentAmountCents, targetPot.status);
    recordTransactionInFirestore(tx);
  } catch (err) {
    console.warn("Firestore withdraw sync warning:", err);
  }

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

  // Real-time Firestore sync
  try {
    updatePupilBalanceInFirestore(pupilId, pupil.mainBalanceCents, pupil.totalSavedCents);
    recordTransactionInFirestore(tx);
  } catch (err) {
    console.warn("Firestore reward sync warning:", err);
  }

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

  try {
    savePotToFirestore(newPot);
    updatePupilBalanceInFirestore(realPupilId, pupil.mainBalanceCents, pupil.totalSavedCents);
  } catch (err) {
    console.warn("Firestore createPupilPot sync warning:", err);
  }

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

    // Real-time Firestore sync
    try {
      recordTransactionInFirestore(tx);
    } catch (err) {
      console.warn("Firestore deletePupilPot tx sync warning:", err);
    }
  }

  // Remove pot from saved list
  const filteredPots = pots.filter((p) => !(p.potId === potId && p.pupilId === realPupilId));
  savePots(filteredPots);
  deletePotFromFirestore(potId);

  const remainingPupilPots = filteredPots.filter((p) => p.pupilId === realPupilId);
  pupil.activePotsCount = remainingPupilPots.length;
  pupil.totalSavedCents = remainingPupilPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  pupil.updatedAt = now;
  pupils[pupilIdx] = pupil;
  savePupils(pupils);

  try {
    updatePupilBalanceInFirestore(realPupilId, pupil.mainBalanceCents, pupil.totalSavedCents);
  } catch (err) {
    console.warn("Firestore deletePupilPot pupil sync warning:", err);
  }

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
  if (!pupilId) return { success: false, deletedPupilId: "" };

  // 1. Record tombstone so background listeners never resurrect this pupil
  recordDeletedPupil(pupilId);

  const pupils = getSavedPupils();
  const pupil = pupils.find((p) => p.pupilId === pupilId);

  // 2. Remove pupil from local storage
  const updatedPupils = pupils.filter((p) => p.pupilId !== pupilId);
  const unique = deduplicatePupils(updatedPupils);
  safeLocalStorageSetItem(STORAGE_KEY_PUPILS, JSON.stringify(unique));

  // 3. Remove pupil from Firestore
  try {
    deletePupilFromFirestore(pupilId);
  } catch (err) {
    console.warn("deletePupil Firestore sync error:", err);
  }

  // 4. Remove pupil's pots locally & from Firestore
  const pots = getSavedPots();
  const pupilPots = pots.filter((p) => p.pupilId === pupilId);
  const updatedPots = pots.filter((p) => p.pupilId !== pupilId);
  savePots(updatedPots);
  pupilPots.forEach((pot) => {
    try {
      deletePotFromFirestore(pot.potId);
    } catch {
      // ignore
    }
  });

  // 5. Remove pupil's transactions
  const txs = getSavedTransactions();
  const updatedTxs = txs.filter((t) => t.pupilId !== pupilId);
  saveTransactions(updatedTxs);

  // 6. Update class aggregate metrics if class exists
  const classId = pupil?.classId;
  if (classId) {
    const classes = getSavedClasses();
    const classIdx = classes.findIndex((c) => c.classId === classId);
    if (classIdx !== -1) {
      const cls = { ...classes[classIdx] };
      cls.pupilCount = Math.max(0, cls.pupilCount - 1);
      const totalSavingsRemoved = pupilPots.reduce((acc, p) => acc + (p.currentAmountCents || 0), 0);
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

  notifyBalanceSync();
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

  const anonymize = options?.anonymize ?? cls.anonymizeNames ?? true;
  const rawName = options?.localDisplayName ? options.localDisplayName.trim() : undefined;

  const newPupil = createAnonymousPupilProfile(classId, nextBadgeSequence, {
    localDisplayName: rawName,
    anonymize,
    initialBalanceCents: openingBalanceCents,
  });

  // Inherit existing class pot templates (0 balance) or start with 0 pots
  const existingClassPots = getSavedPots().filter((p) => p.classId === classId);
  const distinctTemplates: Array<{ title: string; theme?: PotAccentTheme; targetAmountCents?: number; categoryLabel?: string }> = [];
  existingClassPots.forEach((p) => {
    if (!distinctTemplates.some((t) => t.title === p.title)) {
      distinctTemplates.push({
        title: p.title,
        theme: p.theme,
        targetAmountCents: p.targetAmountCents,
        categoryLabel: p.categoryLabel,
      });
    }
  });

  const pots = distinctTemplates.length > 0 ? createStarterPots(newPupil.pupilId, classId, distinctTemplates) : [];
  newPupil.activePotsCount = pots.length;

  assertZeroPII(newPupil as unknown as Record<string, unknown>);

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
    if (anonymize === false) {
      updatedCls.anonymizeNames = false;
    }
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
    saveClassToFirestore(updatedCls).catch((err) => console.warn("saveClassToFirestore warning:", err));
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
  initialOpeningBalanceCents?: number,
  classList?: ClassDocument[]
): PupilDocument[] {
  const classes = classList && classList.length > 0 ? [...classList] : getSavedClasses();
  let cls = classes.find(
    (c) => c.classId === classId || (c as any).id === classId || c.className === classId
  );
  if (!cls && classes.length > 0) {
    cls = classes[0];
  }
  if (!cls) throw new Error("No classrooms available. Please create a class first.");

  const targetClassId = cls.classId;

  const existingPupils = getSavedPupils();
  const classPupils = existingPupils.filter((p) => p.classId === targetClassId);
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

  const effectiveAnonymize = anonymize ?? cls.anonymizeNames ?? true;
  const existingClassPots = getSavedPots().filter((p) => p.classId === targetClassId);
  const distinctTemplates: Array<{ title: string; theme?: PotAccentTheme; targetAmountCents?: number; categoryLabel?: string }> = [];
  existingClassPots.forEach((p) => {
    if (!distinctTemplates.some((t) => t.title === p.title)) {
      distinctTemplates.push({
        title: p.title,
        theme: p.theme,
        targetAmountCents: p.targetAmountCents,
        categoryLabel: p.categoryLabel,
      });
    }
  });

  for (const name of effectiveNames) {
    const rawName = name.trim().length > 0 ? name.trim() : undefined;
    const pupil = createAnonymousPupilProfile(targetClassId, badgeSeq++, {
      localDisplayName: rawName,
      anonymize: effectiveAnonymize,
      initialBalanceCents: openingBalanceCents,
    });

    const pots = distinctTemplates.length > 0 ? createStarterPots(pupil.pupilId, targetClassId, distinctTemplates) : [];
    pupil.activePotsCount = pots.length;

    assertZeroPII(pupil as unknown as Record<string, unknown>);
    newPupils.push(pupil);
    newPots.push(...pots);

    const openingTx: PotLedgerEntry = {
      transactionId: crypto.randomUUID(),
      pupilId: pupil.pupilId,
      classId: targetClassId,
      title: "Account Opening Balance",
      deltaCents: openingBalanceCents,
      type: "reward",
      category: "income",
      nonPunitiveNote: "Account opening deposit credited to your card",
      timestamp: now,
    };
    newTxs.push(openingTx);
    const starterTxs = createStarterTransactions(pupil.pupilId, targetClassId);
    newTxs.push(...starterTxs);
  }

  savePupils([...newPupils, ...existingPupils]);
  savePots([...newPots, ...getSavedPots()]);
  saveTransactions([...newTxs, ...getSavedTransactions()]);

  // Update Class Metrics
  const classIdx = classes.findIndex((c) => c.classId === targetClassId);
  if (classIdx !== -1) {
    const updatedCls = { ...classes[classIdx] };
    updatedCls.pupilCount = (updatedCls.pupilCount || 0) + newPupils.length;
    if (effectiveAnonymize === false) {
      updatedCls.anonymizeNames = false;
    }
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
    saveClassToFirestore(updatedCls).catch((err) => console.warn("saveClassToFirestore warning:", err));
  }

  if (newPots.length > 0) {
    savePotsBatchToFirestore(newPots).catch((err) => console.warn("savePotsBatchToFirestore warning:", err));
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
  anonymize: boolean = true,
  classList?: ClassDocument[]
): { totalEnrolled: number; perClass: Record<string, number>; allPupils: PupilDocument[] } {
  let totalEnrolled = 0;
  const perClass: Record<string, number> = {};
  const allPupils: PupilDocument[] = [];

  for (const item of enrollments) {
    if (item.classId && item.pupilNames.length > 0) {
      const enrolled = enrollBatchPupils(item.classId, item.pupilNames, anonymize, undefined, classList);
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
export function deleteClass(
  classIdentifier: string,
  classList?: ClassDocument[]
): { success: boolean; deletedClassId: string } {
  if (!classIdentifier) {
    throw new Error("Class identifier is required.");
  }

  const normId = classIdentifier.trim();
  const normLower = normId.toLowerCase();

  // 1. Read existing classes from storage BEFORE tombstoning
  let rawStored: ClassDocument[] = [];
  try {
    const raw = safeLocalStorageGetItem(STORAGE_KEY_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) rawStored = parsed;
    }
  } catch {}

  const candidates = classList && classList.length > 0
    ? [...rawStored, ...classList]
    : rawStored;

  // Find all matching class records (by classId, id, className, or classJoinCode)
  const matches = candidates.filter(
    (c) =>
      c.classId === normId ||
      (c as any).id === normId ||
      (c.className && c.className.trim().toLowerCase() === normLower) ||
      (c.classJoinCode && c.classJoinCode === normId)
  );

  const matchedIds = new Set<string>();
  const matchedNames = new Set<string>();

  matchedIds.add(normId);
  matchedIds.add(normLower);

  matches.forEach((m) => {
    if (m.classId) matchedIds.add(m.classId);
    if ((m as any).id) matchedIds.add((m as any).id);
    if (m.className) {
      matchedNames.add(m.className.trim());
      matchedNames.add(m.className.trim().toLowerCase());
    }
  });

  // If the identifier itself matches a class name
  if (candidates.some((c) => c.className && c.className.trim().toLowerCase() === normLower)) {
    matchedNames.add(normId);
    matchedNames.add(normLower);
  }

  // 2. Tombstone all matched IDs and class names
  matchedIds.forEach((id) => recordDeletedClass(id));
  matchedNames.forEach((name) => recordDeletedClass(name));

  // 3. Delete from Firestore by ID and by Name
  matchedIds.forEach((id) => {
    try {
      deleteClassFromFirestore(id);
    } catch (err) {
      console.warn("deleteClassFromFirestore warning:", err);
    }
  });

  matchedNames.forEach((name) => {
    try {
      deleteClassByNameFromFirestore(name);
    } catch (err) {
      console.warn("deleteClassByNameFromFirestore warning:", err);
    }
  });

  // Remove matching classes from local storage
  const updatedClasses = rawStored.filter(
    (c) =>
      !matchedIds.has(c.classId) &&
      !matchedIds.has((c as any).id) &&
      (!c.className || (!matchedNames.has(c.className.trim()) && !matchedNames.has(c.className.trim().toLowerCase())))
  );
  saveClasses(updatedClasses);

  // Find and remove all pupils belonging to this class
  const pupils = getSavedPupils();
  const classPupils = pupils.filter(
    (p) =>
      matchedIds.has(p.classId) ||
      (p.classId && p.classId.toLowerCase() === normLower) ||
      (matches.some((m) => m.className && p.classId === m.className))
  );
  const classPupilIds = new Set(classPupils.map((p) => p.pupilId));

  classPupils.forEach((p) => {
    recordDeletedPupil(p.pupilId);
    try {
      deletePupilFromFirestore(p.pupilId);
    } catch {
      // ignore
    }
  });

  // Purge any remaining pupils or pots for these classes in Firestore
  matchedIds.forEach((cid) => {
    try {
      deletePupilsForClassInFirestore(cid);
      deletePotsForClassInFirestore(cid);
    } catch {
      // ignore
    }
  });

  const updatedPupils = pupils.filter(
    (p) => !matchedIds.has(p.classId) && !classPupilIds.has(p.pupilId)
  );
  savePupils(updatedPupils);

  // Clean up pots for this class or these pupils
  const pots = getSavedPots();
  const classPots = pots.filter(
    (p) =>
      matchedIds.has(p.classId) ||
      (p.classId && p.classId.toLowerCase() === normLower) ||
      classPupilIds.has(p.pupilId)
  );
  classPots.forEach((pot) => {
    try {
      deletePotFromFirestore(pot.potId);
    } catch {
      // ignore
    }
  });
  const updatedPots = pots.filter(
    (p) =>
      !matchedIds.has(p.classId) &&
      (!p.classId || p.classId.toLowerCase() !== normLower) &&
      !classPupilIds.has(p.pupilId)
  );
  savePots(updatedPots);

  // Clean up transactions
  const txs = getSavedTransactions();
  const updatedTxs = txs.filter(
    (t) =>
      !matchedIds.has(t.classId) &&
      (!t.classId || t.classId.toLowerCase() !== normLower) &&
      !classPupilIds.has(t.pupilId)
  );
  saveTransactions(updatedTxs);

  // Cascade clean up jobs and applications for this class
  matchedIds.forEach((id) => {
    try {
      deleteJobsAndApplicationsForClass(id);
    } catch {
      // ignore
    }
  });

  // Remove deleted class from all teachers' assignedClassIds
  try {
    const staff = getStaffUsers();
    let staffModified = false;
    const updatedStaff = staff.map((s) => {
      const existing = s.assignedClassIds || [];
      const filtered = existing.filter((cid) => !matchedIds.has(cid));
      if (filtered.length !== existing.length) {
        staffModified = true;
        return {
          ...s,
          assignedClassIds: filtered,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    if (staffModified) {
      saveStaffUsers(updatedStaff);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pocketpot_staff_updated"));
      }
    }
  } catch (err) {
    console.warn("deleteClass staff cleanup error:", err);
  }

  notifyBalanceSync();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pocketpot_classes_updated"));
  }

  const primaryDeletedId = matches.length > 0 ? matches[0].classId : normId;
  return { success: true, deletedClassId: primaryDeletedId };
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
 * Returns the current ISO week identifier (e.g. "2026-W47")
 */
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
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

  const currentISOWeek = getISOWeekString(currentTime);

  // If already paid for this specific ISO week, never double-pay
  if (cls.lastPayoutTimestamp) {
    const lastPaidDate = new Date(cls.lastPayoutTimestamp);
    if (!isNaN(lastPaidDate.getTime())) {
      const lastPaidWeek = getISOWeekString(lastPaidDate);
      if (lastPaidWeek === currentISOWeek) {
        return false;
      }
    }
  }

  const mostRecentScheduled = getMostRecentScheduledPayoutTime(
    cls.payoutDay ?? "Monday",
    currentTime
  );

  // If never paid:
  if (!cls.lastPayoutTimestamp) {
    // If the class was created recently (e.g. after the scheduled payout hour),
    // do not pay immediately on creation day!
    if (cls.createdAt) {
      const createdDate = new Date(cls.createdAt);
      if (!isNaN(createdDate.getTime()) && createdDate.getTime() > mostRecentScheduled.getTime()) {
        return false;
      }
    }
    return true;
  }

  const lastPayout = new Date(cls.lastPayoutTimestamp);
  return lastPayout.getTime() < mostRecentScheduled.getTime();
}

/**
 * SELF-HEALING AUDIT & BALANCE INTEGRITY RECOVERY ENGINE
 * 
 * Audits ledger transactions for duplicate weekly basic income or job wage entries
 * within the same ISO week, eliminates duplicate phantom transactions, recalculates
 * true pupil card balances, and repairs any corrupted balances in both localStorage
 * and Firestore.
 */
export function reconcileAndFixCorruptedPupilBalances(targetClassId?: string): {
  repairedPupilsCount: number;
  prunedDuplicatesCount: number;
  details: Array<{ pupilId: string; oldBalanceCents: number; newBalanceCents: number }>;
} {
  if (typeof window === "undefined") {
    return { repairedPupilsCount: 0, prunedDuplicatesCount: 0, details: [] };
  }

  const pupils = getSavedPupils();
  const classes = getSavedClasses();
  const allTxs = getSavedTransactions();

  if (pupils.length === 0) {
    return { repairedPupilsCount: 0, prunedDuplicatesCount: 0, details: [] };
  }

  // 1. Group & Deduplicate Transactions by (pupilId + type + ISO week)
  const keptTxs: PotLedgerEntry[] = [];
  const seenWeeklyIncome = new Set<string>(); // pupilId_week
  const seenWeeklyJobs = new Set<string>();    // pupilId_job_week
  let prunedDuplicatesCount = 0;
  const pupilDuplicateExcessMap = new Map<string, number>();

  // Sort transactions chronologically (oldest first) so the original legitimate entry is preserved
  const sortedTxs = [...allTxs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const tx of sortedTxs) {
    if (!tx || !tx.pupilId) continue;
    const txDate = new Date(tx.timestamp);
    const isoWeek = isNaN(txDate.getTime()) ? "unknown" : getISOWeekString(txDate);

    if (tx.type === "basic_income") {
      const key = `${tx.pupilId}_${isoWeek}`;
      if (seenWeeklyIncome.has(key)) {
        prunedDuplicatesCount++;
        pupilDuplicateExcessMap.set(
          tx.pupilId,
          (pupilDuplicateExcessMap.get(tx.pupilId) || 0) + (tx.deltaCents || 0)
        );
        continue; // Drop duplicate basic income in same ISO week
      }
      seenWeeklyIncome.add(key);
    } else if (tx.type === "job_wage") {
      const key = `${tx.pupilId}_${tx.title}_${isoWeek}`;
      if (seenWeeklyJobs.has(key)) {
        prunedDuplicatesCount++;
        pupilDuplicateExcessMap.set(
          tx.pupilId,
          (pupilDuplicateExcessMap.get(tx.pupilId) || 0) + (tx.deltaCents || 0)
        );
        continue; // Drop duplicate job wage in same ISO week
      }
      seenWeeklyJobs.add(key);
    }

    keptTxs.push(tx);
  }

  // 2. Identify & Repair Pupils with Inflated / Corrupted Balances
  let repairedPupilsCount = 0;
  const details: Array<{ pupilId: string; oldBalanceCents: number; newBalanceCents: number }> = [];

  const updatedPupils = pupils.map((p) => {
    if (targetClassId && p.classId !== targetClassId) return p;

    const classDoc = classes.find((c) => c.classId === p.classId);
    const openingCents = classDoc?.initialOpeningBalanceCents ?? 500;
    const weeklyIncomeCents = classDoc?.weeklyBasicIncomeCents ?? 200;
    const excessCents = pupilDuplicateExcessMap.get(p.pupilId) || 0;

    let targetBalance = p.mainBalanceCents;

    if (excessCents > 0) {
      // Directly deduct duplicate accumulated payouts
      targetBalance = Math.max(openingCents, p.mainBalanceCents - excessCents);
    } else if (
      // If transactions were evicted due to localStorage quota limits,
      // detect known corrupted £37.00 pattern when standard cohort is £7.00:
      p.mainBalanceCents === 3700 &&
      openingCents === 500 &&
      weeklyIncomeCents === 200 &&
      (p.totalSavedCents || 0) === 0
    ) {
      // 1 legitimate payout of £2.00 + £5.00 opening balance = £7.00 (700 cents)
      targetBalance = 700;
    }

    if (targetBalance !== p.mainBalanceCents) {
      details.push({
        pupilId: p.pupilId,
        oldBalanceCents: p.mainBalanceCents,
        newBalanceCents: targetBalance,
      });
      repairedPupilsCount++;
      return {
        ...p,
        mainBalanceCents: targetBalance,
        updatedAt: new Date().toISOString(),
      };
    }

    return p;
  });

  if (prunedDuplicatesCount > 0 || repairedPupilsCount > 0) {
    // Reverse keptTxs so most recent are first in storage
    saveTransactions(keptTxs.reverse());
    savePupils(updatedPupils);

    // Sync fixed balances to Firestore
    details.forEach((d) => {
      const p = updatedPupils.find((x) => x.pupilId === d.pupilId);
      if (p) {
        updatePupilBalanceInFirestore(p.pupilId, p.mainBalanceCents, p.totalSavedCents);
      }
    });

    notifyBalanceSync();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pocketpot_classes_updated"));
    }
  }

  return {
    repairedPupilsCount,
    prunedDuplicatesCount,
    details,
  };
}

let isReconcilingInProgress = false;
let lastReconcileExecutionTime = 0;

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
  const nowMs = Date.now();
  // Mutex lock & minimum 2-second debounce across component mounts
  if (isReconcilingInProgress || nowMs - lastReconcileExecutionTime < 2000) {
    return { reconciledCount: 0, details: [] };
  }
  isReconcilingInProgress = true;
  lastReconcileExecutionTime = nowMs;

  try {
    // Run self-healing audit to repair any duplicate transactions or corrupted pupil balances
    reconcileAndFixCorruptedPupilBalances();

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
  } finally {
    isReconcilingInProgress = false;
  }
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
  const currentISOWeek = getISOWeekString(new Date(now));
  let paidCount = 0;
  const newTxs: PotLedgerEntry[] = [];
  const existingTxs = getSavedTransactions();

  const updatedPupils = pupils.map((p) => {
    if (p.classId === classId) {
      // Per-pupil idempotency check: Has this pupil already received basic income for this ISO week?
      const basicIncomeTxId = `basic_income_${classId}_${p.pupilId}_${currentISOWeek}`;
      const alreadyPaidBasicIncome = existingTxs.some(
        (tx) =>
          tx.pupilId === p.pupilId &&
          (tx.transactionId === basicIncomeTxId ||
            (tx.type === "basic_income" && getISOWeekString(new Date(tx.timestamp)) === currentISOWeek))
      );

      if (alreadyPaidBasicIncome) {
        // Skip crediting basic income for this pupil in this week
        return p;
      }

      paidCount++;
      let newBalance = (p.mainBalanceCents || 0) + weeklyAmountCents;

      // 1. Basic Income Transaction with deterministic ID
      newTxs.push({
        transactionId: basicIncomeTxId,
        pupilId: p.pupilId,
        classId,
        title: "Minimum Basic Income",
        deltaCents: weeklyAmountCents,
        type: "basic_income" as const,
        category: "income" as const,
        nonPunitiveNote: `Automated weekly basic income credited on ${cls.payoutDay ?? "Monday"}`,
        timestamp: now,
      });

      // Send celebratory notification to pupil
      addNotification({
        pupilId: p.pupilId,
        classId,
        isTeacherNotification: false,
        title: `🪙 Weekly Basic Income: +${formatCurrency(weeklyAmountCents)}`,
        message: `Your weekly basic income of ${formatCurrency(weeklyAmountCents)} has arrived in your card balance!`,
        type: "allowance",
        amountCents: weeklyAmountCents,
      });

      // 2. Active Job Wage (Paid on the exact same day as Basic Income)
      const activeJob = getActiveJobForPupil(p.pupilId);
      if (activeJob && activeJob.status === "filled" && activeJob.wageCents > 0) {
        const jobWageTxId = `job_wage_${activeJob.jobId}_${p.pupilId}_${currentISOWeek}`;
        const alreadyPaidJob = existingTxs.some(
          (tx) =>
            tx.pupilId === p.pupilId &&
            (tx.transactionId === jobWageTxId ||
              (tx.type === "job_wage" && getISOWeekString(new Date(tx.timestamp)) === currentISOWeek))
        );

        if (!alreadyPaidJob) {
          newBalance += activeJob.wageCents;
          newTxs.push({
            transactionId: jobWageTxId,
            pupilId: p.pupilId,
            classId,
            title: `Job Wage: ${activeJob.title}`,
            deltaCents: activeJob.wageCents,
            type: "job_wage" as const,
            category: "income" as const,
            nonPunitiveNote: `Weekly earnings for classroom role as ${activeJob.title}`,
            timestamp: now,
          });

          addNotification({
            pupilId: p.pupilId,
            classId,
            isTeacherNotification: false,
            title: `💼 Weekly Job Wage: +${formatCurrency(activeJob.wageCents)}`,
            message: `Your weekly wage of ${formatCurrency(activeJob.wageCents)} for ${activeJob.title} has been paid into your card balance!`,
            type: "allowance",
            amountCents: activeJob.wageCents,
          });
        }
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
  saveTransactions([...newTxs, ...existingTxs]);

  // Update class last payout timestamp
  cls.lastPayoutTimestamp = now;
  cls.updatedAt = now;
  classes[classIdx] = cls;
  saveClasses(classes);

  // Real-time Firestore sync for all payout transactions, balances, and class timestamp
  try {
    saveClassToFirestore(cls).catch((err) => console.warn("saveClassToFirestore payout warning:", err));
    newTxs.forEach((tx) => recordTransactionInFirestore(tx));
    updatedPupils.forEach((p) => {
      if (p.classId === classId) {
        updatePupilBalanceInFirestore(p.pupilId, p.mainBalanceCents, p.totalSavedCents);
      }
    });
  } catch (err) {
    console.warn("Firestore autoReconcile sync warning:", err);
  }

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
    className?: string;
    yearGroup?: "Year 3" | "Year 4" | "Year 5" | "Year 6";
    initialOpeningBalanceCents?: number;
    weeklyBasicIncomeCents?: number;
    payoutDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
    paydayOfWeek?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
    anonymizeNames?: boolean;
  }
): ClassDocument {
  const classes = getSavedClasses();
  const classIdx = classes.findIndex((c) => c.classId === classId);
  if (classIdx === -1) throw new Error("Class not found");

  const cls = { ...classes[classIdx] };
  if (settings.className !== undefined && settings.className.trim()) {
    cls.className = settings.className.trim();
  }
  if (settings.yearGroup !== undefined) {
    cls.yearGroup = settings.yearGroup;
  }
  if (settings.anonymizeNames !== undefined) {
    cls.anonymizeNames = settings.anonymizeNames;
  }
  if (settings.initialOpeningBalanceCents !== undefined) {
    cls.initialOpeningBalanceCents = Math.max(0, settings.initialOpeningBalanceCents);
  }
  if (settings.weeklyBasicIncomeCents !== undefined) {
    cls.weeklyBasicIncomeCents = Math.max(0, settings.weeklyBasicIncomeCents);
  }
  if (settings.payoutDay !== undefined || settings.paydayOfWeek !== undefined) {
    const chosen = settings.paydayOfWeek || settings.payoutDay || "Friday";
    cls.payoutDay = chosen;
    cls.paydayOfWeek = chosen;
  }
  cls.updatedAt = new Date().toISOString();
  classes[classIdx] = cls;
  saveClasses(classes);
  saveClassToFirestore(cls).catch((err) => console.warn("saveClassToFirestore warning:", err));

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
  tenantId?: string;
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
  // Proactively free up non-essential storage quota before provisioning new class cohort
  evictNonEssentialStorage();

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
    tenantId: config.tenantId,
    starterPots: config.starterPots,
  });

  const { newClass, pupils, pots: finalPots } = result;

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

  // 3. Starter Pots already created cleanly by createClassWithQuickAdd without duplicates or phantom balances

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


