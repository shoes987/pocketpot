"use client";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ClassDocument,
  PupilDocument,
  SavingsPotDocument,
  JobPostingDocument,
  MarketplaceRewardDocument,
  MarketplacePurchaseDocument,
  BonusAwardDocument,
  PotLedgerEntry,
  PositiveBehaviourDocument,
  TenantDocument,
  UserDocument,
  PotStatus,
} from "@/lib/firebase/types";
import { assertZeroPII } from "@/lib/firebase/zero-pii";

/**
 * ----------------------------------------------------
 * ZERO-PII SAFEGUARDING SANITIZATION
 * ----------------------------------------------------
 * Strictly strips all personal identifying information (real names, DOBs, UPNs,
 * emails, phone numbers) before writing to Cloud Firestore.
 */
export function sanitizePupilForFirestore(
  pupil: PupilDocument,
  tenantId: string = "sch_local_pilot"
): Record<string, unknown> {
  // Reject if incoming payload explicitly contains illegal PII fields (DOBs, UPNs, surnames)
  const forbiddenPii = [
    "dob", "dateofbirth", "birthdate", "date_of_birth",
    "upn", "uniquepupilnumber", "unique_pupil_number", "candidate_number",
    "realname", "lastname", "surname", "parentname", "email"
  ];
  for (const key of Object.keys(pupil as unknown as Record<string, unknown>)) {
    const norm = key.toLowerCase().replace(/[^a-z]/g, "");
    if (forbiddenPii.includes(norm)) {
      throw new Error(`Zero-PII Safeguard: Field "${key}" is strictly forbidden on pupil records under KS2 safeguarding rules.`);
    }
  }

  const sanitized: Record<string, unknown> = {
    pupilId: pupil.pupilId,
    classId: pupil.classId,
    tenantId,
    educationalCodename: pupil.educationalCodename,
    avatarIconKey: pupil.avatarIconKey || "badge-otter",
    deskBadgeNumber: Number(pupil.deskBadgeNumber || 101),
    cardLastFour: String(pupil.cardLastFour || "4821"),
    pinNumber: String(pupil.pinNumber || pupil.cardLastFour || "4821"),
    mainBalanceCents: Number(pupil.mainBalanceCents ?? 0),
    totalSavedCents: Number(pupil.totalSavedCents ?? 0),
    activePotsCount: Number(pupil.activePotsCount ?? 0),
    createdAt: pupil.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assertZeroPII(sanitized);
  return sanitized;
}

/**
 * ----------------------------------------------------
 * TENANT MANAGEMENT (/tenants/{tenantId})
 * ----------------------------------------------------
 */
export async function saveTenantToFirestore(tenant: TenantDocument): Promise<void> {
  if (!db || !tenant.tenantId) return;
  try {
    await setDoc(doc(db, "tenants", tenant.tenantId), {
      ...tenant,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("saveTenantToFirestore warning:", err);
  }
}

export function subscribeToTenant(
  tenantId: string,
  callback: (tenant: TenantDocument | null) => void
): Unsubscribe {
  if (!db) return () => {};
  const tenantRef = doc(db, "tenants", tenantId);
  return onSnapshot(
    tenantRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as TenantDocument);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("subscribeToTenant error:", err);
    }
  );
}

export function subscribeToStaff(
  tenantId: string = "sch_local_pilot",
  callback: (staff: UserDocument[]) => void
): Unsubscribe {
  if (!db) return () => {};
  try {
    const staffColRef = collection(db, "tenants", tenantId, "staff");
    return onSnapshot(
      staffColRef,
      (snap) => {
        const staffList: UserDocument[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          staffList.push({
            userId: docSnap.id,
            email: d.email || "",
            displayName: d.displayName || "Staff Member",
            role: d.role || "teacher",
            tenantId: d.tenantId || tenantId,
            assignedClassIds: d.assignedClassIds || [],
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || new Date().toISOString()),
            updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : (d.updatedAt || new Date().toISOString()),
          });
        });
        callback(staffList);
      },
      (err) => {
        console.warn("subscribeToStaff error:", err);
      }
    );
  } catch (err) {
    console.warn("subscribeToStaff catch:", err);
    return () => {};
  }
}

/**
 * ----------------------------------------------------
 * CLASSROOM MANAGEMENT (/classes)
 * ----------------------------------------------------
 */
export async function saveClassToFirestore(classDoc: ClassDocument): Promise<void> {
  if (!db || !classDoc.classId) return;
  const payday = classDoc.paydayOfWeek || classDoc.payoutDay || "Friday";
  const payload: ClassDocument = {
    ...classDoc,
    joinCode: classDoc.joinCode || classDoc.classJoinCode,
    classJoinCode: classDoc.classJoinCode || classDoc.joinCode || "749281",
    payoutDay: payday,
    paydayOfWeek: payday,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "classes", classDoc.classId), payload, { merge: true });
  } catch (err) {
    console.warn("saveClassToFirestore warning:", err);
  }
}

export async function deleteClassFromFirestore(classId: string): Promise<void> {
  if (!db || !classId) return;
  try {
    await deleteDoc(doc(db, "classes", classId));
  } catch (err) {
    console.warn("deleteClassFromFirestore warning:", err);
  }
}

export function subscribeToClasses(
  callback: (classes: ClassDocument[]) => void,
  tenantId?: string
): Unsubscribe {
  if (!db) return () => {};
  const classesCol = collection(db, "classes");
  const q = tenantId ? query(classesCol, where("tenantId", "==", tenantId)) : classesCol;

  return onSnapshot(
    q,
    (snap) => {
      const list: ClassDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as ClassDocument;
        list.push({
          ...data,
          classId: d.id,
          paydayOfWeek: data.paydayOfWeek || data.payoutDay || "Friday",
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToClasses error:", err);
    }
  );
}

/**
 * ----------------------------------------------------
 * PUPIL ACCOUNTS & ZERO-PII DESK BADGES (/pupils)
 * ----------------------------------------------------
 */
export async function savePupilToFirestore(
  pupil: PupilDocument,
  tenantId: string = "sch_local_pilot"
): Promise<void> {
  if (!db || !pupil.pupilId) return;
  const sanitized = sanitizePupilForFirestore(pupil, tenantId);
  try {
    await setDoc(doc(db, "pupils", pupil.pupilId), sanitized, { merge: true });
  } catch (err) {
    console.warn("savePupilToFirestore warning:", err);
  }
}

export async function savePupilsBatchToFirestore(
  pupils: PupilDocument[],
  tenantId: string = "sch_local_pilot"
): Promise<void> {
  if (!db || pupils.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const pupil of pupils) {
      if (!pupil.pupilId) continue;
      const sanitized = sanitizePupilForFirestore(pupil, tenantId);
      const ref = doc(db, "pupils", pupil.pupilId);
      batch.set(ref, sanitized, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("savePupilsBatchToFirestore warning, falling back to parallel writes:", err);
    await Promise.allSettled(pupils.map((p) => savePupilToFirestore(p, tenantId)));
  }
}

export async function updatePupilBalanceInFirestore(
  pupilId: string,
  mainBalanceCents: number,
  totalSavedCents?: number
): Promise<void> {
  if (!db || !pupilId) return;
  const updates: Record<string, unknown> = {
    mainBalanceCents,
    updatedAt: new Date().toISOString(),
  };
  if (totalSavedCents !== undefined) {
    updates.totalSavedCents = totalSavedCents;
  }
  try {
    await updateDoc(doc(db, "pupils", pupilId), updates);
  } catch (err) {
    console.warn("updatePupilBalanceInFirestore warning:", err);
  }
}

export async function deletePupilFromFirestore(pupilId: string): Promise<void> {
  if (!db || !pupilId) return;
  try {
    await deleteDoc(doc(db, "pupils", pupilId));
  } catch (err) {
    console.warn("deletePupilFromFirestore warning:", err);
  }
}

export function subscribeToPupils(
  callback: (pupils: PupilDocument[]) => void,
  classId?: string
): Unsubscribe {
  if (!db) return () => {};
  const pupilsCol = collection(db, "pupils");
  const q = classId ? query(pupilsCol, where("classId", "==", classId)) : pupilsCol;

  return onSnapshot(
    q,
    (snap) => {
      const list: PupilDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as PupilDocument;
        list.push({
          ...data,
          pupilId: d.id,
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToPupils error:", err);
    }
  );
}

export function subscribeToPupil(
  pupilId: string,
  callback: (pupil: PupilDocument | null) => void
): Unsubscribe {
  if (!db || !pupilId) return () => {};
  const pupilRef = doc(db, "pupils", pupilId);

  return onSnapshot(
    pupilRef,
    (snap) => {
      if (snap.exists()) {
        callback({
          ...(snap.data() as PupilDocument),
          pupilId: snap.id,
        });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("subscribeToPupil error:", err);
    }
  );
}

/**
 * ----------------------------------------------------
 * SAVINGS POTS (/pots)
 * ----------------------------------------------------
 */
export async function savePotToFirestore(pot: SavingsPotDocument): Promise<void> {
  if (!db || !pot.potId) return;
  try {
    await setDoc(doc(db, "pots", pot.potId), {
      ...pot,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("savePotToFirestore warning:", err);
  }
}

export async function savePotsBatchToFirestore(pots: SavingsPotDocument[]): Promise<void> {
  if (!db || pots.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const pot of pots) {
      if (!pot.potId) continue;
      const ref = doc(db, "pots", pot.potId);
      batch.set(ref, {
        ...pot,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("savePotsBatchToFirestore warning:", err);
    await Promise.allSettled(pots.map((p) => savePotToFirestore(p)));
  }
}

export async function updatePotBalanceInFirestore(
  potId: string,
  currentAmountCents: number,
  status?: PotStatus,
  note?: string
): Promise<void> {
  if (!db || !potId) return;
  const updates: Record<string, unknown> = {
    currentAmountCents,
    lastInteractionAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (status) updates.status = status;
  if (note !== undefined) updates.potNote = note;

  try {
    await updateDoc(doc(db, "pots", potId), updates);
  } catch (err) {
    console.warn("updatePotBalanceInFirestore warning:", err);
  }
}

export async function deletePotFromFirestore(potId: string): Promise<void> {
  if (!db || !potId) return;
  try {
    await deleteDoc(doc(db, "pots", potId));
  } catch (err) {
    console.warn("deletePotFromFirestore warning:", err);
  }
}

export function subscribeToPots(
  callback: (pots: SavingsPotDocument[]) => void,
  pupilId?: string,
  classId?: string
): Unsubscribe {
  if (!db) return () => {};
  const potsCol = collection(db, "pots");
  let q = query(potsCol);

  if (pupilId) {
    q = query(potsCol, where("pupilId", "==", pupilId));
  } else if (classId) {
    q = query(potsCol, where("classId", "==", classId));
  }

  return onSnapshot(
    q,
    (snap) => {
      const list: SavingsPotDocument[] = [];
      snap.forEach((d) => {
        list.push({
          ...(d.data() as SavingsPotDocument),
          potId: d.id,
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToPots error:", err);
    }
  );
}

/**
 * ----------------------------------------------------
 * CLASSROOM JOBS (/jobs)
 * ----------------------------------------------------
 */
export async function saveJobToFirestore(job: JobPostingDocument): Promise<void> {
  if (!db || !job.jobId) return;
  try {
    await setDoc(doc(db, "jobs", job.jobId), {
      ...job,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("saveJobToFirestore warning:", err);
  }
}

export async function saveJobsBatchToFirestore(jobs: JobPostingDocument[]): Promise<void> {
  if (!db || jobs.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const job of jobs) {
      if (!job.jobId) continue;
      const ref = doc(db, "jobs", job.jobId);
      batch.set(ref, {
        ...job,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("saveJobsBatchToFirestore warning:", err);
    await Promise.allSettled(jobs.map((j) => saveJobToFirestore(j)));
  }
}

export function subscribeToJobs(
  callback: (jobs: JobPostingDocument[]) => void,
  classId?: string
): Unsubscribe {
  if (!db) return () => {};
  const jobsCol = collection(db, "jobs");
  const q = classId ? query(jobsCol, where("classId", "==", classId)) : jobsCol;

  return onSnapshot(
    q,
    (snap) => {
      const list: JobPostingDocument[] = [];
      snap.forEach((d) => {
        list.push({
          ...(d.data() as JobPostingDocument),
          jobId: d.id,
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToJobs error:", err);
    }
  );
}

/**
 * ----------------------------------------------------
 * CLASSROOM MARKETPLACE & REWARDS (/marketplace)
 * ----------------------------------------------------
 */
export async function saveRewardToFirestore(reward: MarketplaceRewardDocument): Promise<void> {
  if (!db || !reward.rewardId) return;
  try {
    await setDoc(doc(db, "marketplace", reward.rewardId), {
      ...reward,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("saveRewardToFirestore warning:", err);
  }
}

export async function saveRewardsBatchToFirestore(
  rewards: MarketplaceRewardDocument[]
): Promise<void> {
  if (!db || rewards.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const reward of rewards) {
      if (!reward.rewardId) continue;
      const ref = doc(db, "marketplace", reward.rewardId);
      batch.set(ref, {
        ...reward,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("saveRewardsBatchToFirestore warning:", err);
    await Promise.allSettled(rewards.map((r) => saveRewardToFirestore(r)));
  }
}

export async function savePurchaseToFirestore(
  purchase: MarketplacePurchaseDocument
): Promise<void> {
  if (!db || !purchase.purchaseId) return;
  try {
    await setDoc(doc(db, "purchases", purchase.purchaseId), purchase, { merge: true });
  } catch (err) {
    console.warn("savePurchaseToFirestore warning:", err);
  }
}

export function subscribeToRewards(
  callback: (rewards: MarketplaceRewardDocument[]) => void,
  classId?: string
): Unsubscribe {
  if (!db) return () => {};
  const col = collection(db, "marketplace");
  const q = classId ? query(col, where("classId", "==", classId)) : col;

  return onSnapshot(
    q,
    (snap) => {
      const list: MarketplaceRewardDocument[] = [];
      snap.forEach((d) => {
        list.push({
          ...(d.data() as MarketplaceRewardDocument),
          rewardId: d.id,
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToRewards error:", err);
    }
  );
}

/**
 * ----------------------------------------------------
 * WHITEBOARD BONUSES & LEDGER TRANSACTIONS
 * ----------------------------------------------------
 */
export async function recordBonusAwardInFirestore(award: BonusAwardDocument): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, "bonus_awards"), {
      ...award,
      awardedAt: award.awardedAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn("recordBonusAwardInFirestore warning:", err);
  }
}

export async function recordTransactionInFirestore(tx: PotLedgerEntry): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, "transactions"), {
      ...tx,
      timestamp: tx.timestamp || new Date().toISOString(),
    });
  } catch (err) {
    console.warn("recordTransactionInFirestore warning:", err);
  }
}

export async function saveBehaviourToFirestore(
  behaviour: PositiveBehaviourDocument
): Promise<void> {
  if (!db || !behaviour.behaviourId) return;
  try {
    await setDoc(doc(db, "behaviours", behaviour.behaviourId), {
      ...behaviour,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("saveBehaviourToFirestore warning:", err);
  }
}

export async function saveBehavioursBatchToFirestore(
  behaviours: PositiveBehaviourDocument[]
): Promise<void> {
  if (!db || behaviours.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const b of behaviours) {
      if (!b.behaviourId) continue;
      const ref = doc(db, "behaviours", b.behaviourId);
      batch.set(ref, {
        ...b,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("saveBehavioursBatchToFirestore warning:", err);
    await Promise.allSettled(behaviours.map((b) => saveBehaviourToFirestore(b)));
  }
}

export async function deleteBehaviourFromFirestore(behaviourId: string): Promise<void> {
  if (!db || !behaviourId) return;
  try {
    await deleteDoc(doc(db, "behaviours", behaviourId));
  } catch (err) {
    console.warn("deleteBehaviourFromFirestore warning:", err);
  }
}

export function subscribeToBehaviours(
  callback: (behaviours: PositiveBehaviourDocument[]) => void,
  classId?: string
): Unsubscribe {
  if (!db) return () => {};
  const col = collection(db, "behaviours");
  const q = classId ? query(col, where("classId", "==", classId)) : col;

  return onSnapshot(
    q,
    (snap) => {
      const list: PositiveBehaviourDocument[] = [];
      snap.forEach((d) => {
        list.push({
          ...(d.data() as PositiveBehaviourDocument),
          behaviourId: d.id,
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToBehaviours error:", err);
    }
  );
}
