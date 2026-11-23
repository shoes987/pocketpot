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
  limit,
  Unsubscribe,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ClassDocument,
  PupilDocument,
  SavingsPotDocument,
  JobPostingDocument,
  JobApplicationDocument,
  MarketplaceRewardDocument,
  MarketplacePurchaseDocument,
  BonusAwardDocument,
  PotLedgerEntry,
  PositiveBehaviourDocument,
  PupilNotificationDocument,
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
    displayName: pupil.displayName || pupil.localDisplayName || pupil.educationalCodename,
    localDisplayName: pupil.localDisplayName || pupil.displayName || "",
    anonymized: pupil.anonymized !== undefined ? Boolean(pupil.anonymized) : false,
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
    const q = query(staffColRef, limit(50));
    return onSnapshot(
      q,
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

export async function deleteClassByNameFromFirestore(className: string): Promise<void> {
  if (!db || !className) return;
  try {
    const targetNorm = className.trim().toLowerCase();
    const snap = await getDocs(query(collection(db, "classes"), limit(50)));
    const promises: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (
        data.className &&
        data.className.trim().toLowerCase() === targetNorm
      ) {
        promises.push(deleteDoc(d.ref));
      }
    });
    await Promise.all(promises);
  } catch (err) {
    console.warn("deleteClassByNameFromFirestore warning:", err);
  }
}

export function subscribeToClasses(
  callback: (classes: ClassDocument[]) => void,
  tenantId?: string
): Unsubscribe {
  if (!db) return () => {};
  const classesCol = collection(db, "classes");
  const q = tenantId
    ? query(classesCol, where("tenantId", "==", tenantId), limit(50))
    : query(classesCol, limit(50));

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
          anonymizeNames: data.anonymizeNames !== undefined ? data.anonymizeNames : true,
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

/**
 * Atomically increments a pupil's main balance in Cloud Firestore.
 * Triggers live onSnapshot listeners on connected pupil devices immediately without race conditions.
 */
export async function awardMicroBonusInFirestore(
  pupilId: string,
  bonusAmountCents: number
): Promise<void> {
  if (!db || !pupilId) return;
  try {
    await updateDoc(doc(db, "pupils", pupilId), {
      mainBalanceCents: increment(bonusAmountCents),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("awardMicroBonusInFirestore warning:", err);
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
  const q = classId
    ? query(pupilsCol, where("classId", "==", classId), limit(50))
    : query(pupilsCol, limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const list: PupilDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as PupilDocument;
        list.push({
          ...data,
          pupilId: d.id,
          displayName: data.displayName || data.localDisplayName || data.educationalCodename,
          localDisplayName: data.localDisplayName || data.displayName || undefined,
          anonymized: data.anonymized !== undefined ? data.anonymized : true,
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
        const data = snap.data() as PupilDocument;
        callback({
          ...data,
          pupilId: snap.id,
          displayName: data.displayName || data.localDisplayName || data.educationalCodename,
          localDisplayName: data.localDisplayName || data.displayName || undefined,
          anonymized: data.anonymized !== undefined ? data.anonymized : true,
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
  let q = query(potsCol, limit(50));

  if (pupilId) {
    q = query(potsCol, where("pupilId", "==", pupilId), limit(50));
  } else if (classId) {
    q = query(potsCol, where("classId", "==", classId), limit(50));
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
  const q = classId
    ? query(jobsCol, where("classId", "==", classId), limit(50))
    : query(jobsCol, limit(50));

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

export async function deleteJobFromFirestore(jobId: string): Promise<void> {
  if (!db || !jobId) return;
  try {
    await deleteDoc(doc(db, "jobs", jobId));
  } catch (err) {
    console.warn("deleteJobFromFirestore warning:", err);
  }
}

export async function saveApplicationToFirestore(app: JobApplicationDocument): Promise<void> {
  if (!db || !app.applicationId) return;
  try {
    const copy = { ...app };
    delete (copy as any).pupilName; // Zero-PII strict requirement
    await setDoc(doc(db, "job_applications", app.applicationId), {
      ...copy,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn("saveApplicationToFirestore warning:", err);
  }
}

export async function saveApplicationsBatchToFirestore(apps: JobApplicationDocument[]): Promise<void> {
  if (!db || apps.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const app of apps) {
      if (!app.applicationId) continue;
      const copy = { ...app };
      delete (copy as any).pupilName;
      const ref = doc(db, "job_applications", app.applicationId);
      batch.set(ref, {
        ...copy,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn("saveApplicationsBatchToFirestore warning:", err);
    await Promise.allSettled(apps.map((a) => saveApplicationToFirestore(a)));
  }
}

export function subscribeToApplications(
  callback: (apps: JobApplicationDocument[]) => void,
  classId?: string,
  pupilId?: string
): Unsubscribe {
  if (!db) return () => {};
  const appsCol = collection(db, "job_applications");
  let q = query(appsCol, limit(50));
  if (classId && pupilId) {
    q = query(appsCol, where("classId", "==", classId), where("pupilId", "==", pupilId), limit(50));
  } else if (classId) {
    q = query(appsCol, where("classId", "==", classId), limit(50));
  } else if (pupilId) {
    q = query(appsCol, where("pupilId", "==", pupilId), limit(50));
  }

  return onSnapshot(
    q,
    (snap) => {
      const list: JobApplicationDocument[] = [];
      snap.forEach((d) => {
        list.push({
          ...(d.data() as JobApplicationDocument),
          applicationId: d.id,
        });
      });
      callback(list);
    },
    (err) => {
      console.warn("subscribeToApplications error:", err);
    }
  );
}

export async function deleteApplicationFromFirestore(applicationId: string): Promise<void> {
  if (!db || !applicationId) return;
  try {
    await deleteDoc(doc(db, "job_applications", applicationId));
  } catch (err) {
    console.warn("deleteApplicationFromFirestore warning:", err);
  }
}

export async function deleteJobsAndApplicationsForClassInFirestore(classId: string): Promise<void> {
  if (!db || !classId) return;
  try {
    // Delete jobs for this class
    const jobsSnap = await getDocs(query(collection(db, "jobs"), where("classId", "==", classId), limit(50)));
    const batch = writeBatch(db);
    jobsSnap.forEach((d) => {
      batch.delete(d.ref);
    });
    // Delete applications for this class
    const appsSnap = await getDocs(query(collection(db, "job_applications"), where("classId", "==", classId), limit(50)));
    appsSnap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn("deleteJobsAndApplicationsForClassInFirestore warning:", err);
  }
}

export async function deletePupilsForClassInFirestore(classId: string): Promise<void> {
  if (!db || !classId) return;
  try {
    const snap = await getDocs(query(collection(db, "pupils"), where("classId", "==", classId), limit(50)));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn("deletePupilsForClassInFirestore warning:", err);
  }
}

export async function deletePotsForClassInFirestore(classId: string): Promise<void> {
  if (!db || !classId) return;
  try {
    const snap = await getDocs(query(collection(db, "pots"), where("classId", "==", classId), limit(50)));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn("deletePotsForClassInFirestore warning:", err);
  }
}

/**
 * ----------------------------------------------------
 * CLASSROOM MARKETPLACE & REWARDS (/marketplace)
 * ----------------------------------------------------
 */

/** Helper to strip undefined values so Firestore WriteBatch and setDoc never throw */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as Partial<T>;
}

export async function saveRewardToFirestore(reward: MarketplaceRewardDocument): Promise<void> {
  if (!db || !reward.rewardId) return;
  try {
    const cleanReward = sanitizeForFirestore(reward);
    await setDoc(doc(db, "marketplace", reward.rewardId), {
      ...cleanReward,
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
      if (!reward || !reward.rewardId) continue;
      const cleanReward = sanitizeForFirestore(reward);
      const ref = doc(db, "marketplace", reward.rewardId);
      batch.set(ref, {
        ...cleanReward,
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
    const cleanPurchase = sanitizeForFirestore(purchase);
    await setDoc(doc(db, "purchases", purchase.purchaseId), cleanPurchase, { merge: true });
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
  const q = classId
    ? query(col, where("classId", "==", classId), limit(50))
    : query(col, limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const list: MarketplaceRewardDocument[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (!raw) return;
        list.push({
          rewardId: d.id,
          classId: raw.classId || classId || "",
          title: raw.title || "Classroom Privilege",
          description: raw.description || "",
          pricePence: typeof raw.pricePence === "number" && !isNaN(raw.pricePence)
            ? raw.pricePence
            : typeof raw.priceCoins === "number" && !isNaN(raw.priceCoins)
            ? raw.priceCoins
            : 150,
          icon: raw.icon || "🚀",
          tier: raw.tier === "long_term" ? "long_term" : "short_term",
          isAvailable: raw.isAvailable !== false,
          purchasesCount: typeof raw.purchasesCount === "number" ? raw.purchasesCount : 0,
          stockQuantity: typeof raw.stockQuantity === "number" ? raw.stockQuantity : undefined,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString(),
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
    const cleanAward = sanitizeForFirestore(award);
    await addDoc(collection(db, "bonus_awards"), {
      ...cleanAward,
      awardedAt: award.awardedAt || new Date().toISOString(),
    });
  } catch (err) {
    console.warn("recordBonusAwardInFirestore warning:", err);
  }
}

export async function recordTransactionInFirestore(tx: PotLedgerEntry): Promise<void> {
  if (!db) return;
  try {
    const txId = tx.transactionId || crypto.randomUUID();
    const cleanTx = sanitizeForFirestore(tx);
    await setDoc(
      doc(db, "transactions", txId),
      {
        ...cleanTx,
        transactionId: txId,
        timestamp: tx.timestamp || new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("recordTransactionInFirestore warning:", err);
  }
}

export function subscribeToTransactions(
  pupilId: string,
  callback: (txs: PotLedgerEntry[]) => void
): Unsubscribe {
  if (!db || !pupilId) return () => {};
  const txCol = collection(db, "transactions");
  const q = query(txCol, where("pupilId", "==", pupilId), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const list: PotLedgerEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as PotLedgerEntry;
        list.push({
          ...data,
          transactionId: d.id || data.transactionId,
        });
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    },
    (err) => {
      console.warn("subscribeToTransactions error:", err);
    }
  );
}

/**
 * ----------------------------------------------------
 * NOTIFICATIONS (CROSS-DEVICE REAL-TIME PERSISTENCE)
 * ----------------------------------------------------
 */
export async function saveNotificationToFirestore(
  notif: PupilNotificationDocument
): Promise<void> {
  if (!db) return;
  try {
    const notifId = notif.notificationId || crypto.randomUUID();
    await setDoc(
      doc(db, "notifications", notifId),
      {
        ...notif,
        notificationId: notifId,
        createdAt: notif.createdAt || new Date().toISOString(),
        read: notif.read ?? false,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("saveNotificationToFirestore warning:", err);
  }
}

export async function markNotificationReadInFirestore(
  notificationId: string
): Promise<void> {
  if (!db || !notificationId) return;
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("markNotificationReadInFirestore warning:", err);
  }
}

export async function markAllNotificationsReadInFirestore(
  pupilId?: string,
  forTeacher?: boolean,
  classId?: string
): Promise<void> {
  if (!db) return;
  try {
    const notifCol = collection(db, "notifications");
    let q = query(notifCol, where("read", "==", false), limit(50));
    if (forTeacher) {
      if (classId) {
        q = query(
          notifCol,
          where("isTeacherNotification", "==", true),
          where("classId", "==", classId),
          where("read", "==", false),
          limit(50)
        );
      } else {
        q = query(
          notifCol,
          where("isTeacherNotification", "==", true),
          where("read", "==", false),
          limit(50)
        );
      }
    } else if (pupilId) {
      q = query(
        notifCol,
        where("pupilId", "==", pupilId),
        where("read", "==", false),
        limit(50)
      );
    }
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        read: true,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn("markAllNotificationsReadInFirestore warning:", err);
  }
}

export function subscribeToNotifications(
  callback: (notifs: PupilNotificationDocument[]) => void,
  pupilId?: string,
  forTeacher?: boolean,
  classId?: string
): Unsubscribe {
  if (!db) return () => {};
  const notifCol = collection(db, "notifications");
  let q = query(notifCol, limit(50));

  if (forTeacher) {
    if (classId) {
      q = query(
        notifCol,
        where("classId", "==", classId),
        where("isTeacherNotification", "==", true),
        limit(50)
      );
    } else {
      q = query(
        notifCol,
        where("isTeacherNotification", "==", true),
        limit(50)
      );
    }
  } else if (pupilId) {
    q = query(
      notifCol,
      where("pupilId", "==", pupilId),
      limit(50)
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const list: PupilNotificationDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as PupilNotificationDocument;
        list.push({
          ...data,
          notificationId: d.id || data.notificationId,
        });
      });
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(list);
    },
    (err) => {
      console.warn("subscribeToNotifications error:", err);
    }
  );
}

export async function saveBehaviourToFirestore(
  behaviour: PositiveBehaviourDocument
): Promise<void> {
  if (!db || !behaviour.behaviourId) return;
  try {
    const cleanBehaviour = sanitizeForFirestore(behaviour);
    await setDoc(doc(db, "behaviours", behaviour.behaviourId), {
      ...cleanBehaviour,
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
      const cleanB = sanitizeForFirestore(b);
      const ref = doc(db, "behaviours", b.behaviourId);
      batch.set(ref, {
        ...cleanB,
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
  const q = classId
    ? query(col, where("classId", "==", classId), limit(50))
    : query(col, limit(50));

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
