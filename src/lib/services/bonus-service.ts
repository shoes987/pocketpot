/**
 * PocketPot (Invest in the Future)
 * Instant Rewards & Classroom Recognition: Positive Behaviours & Bonuses
 * 
 * Strict Compliance:
 * - KS2 Zero-PII GDPR/COPPA Architecture
 * - Audio-visual celebration for Interactive Whiteboard (IWB) usage
 * - Automatic credit into child's account ledger as 'Bonus - (description of behaviour)'
 */

import {
  PositiveBehaviourDocument,
  BonusAwardDocument,
  PotLedgerEntry,
  PupilDocument,
} from "../firebase/types";
import { formatCurrency, assertZeroPII, getPupilDisplayName } from "../firebase/zero-pii";
import {
  getSavedPupils,
  savePupils,
  getSavedTransactions,
  saveTransactions,
} from "./class-service";
import { addNotification } from "./jobs-service";
import {
  updatePupilBalanceInFirestore,
  awardMicroBonusInFirestore,
  recordBonusAwardInFirestore,
  recordTransactionInFirestore,
  saveBehavioursBatchToFirestore,
  deleteBehaviourFromFirestore,
} from "../firebase/firestore-service";
import {
  safeLocalStorageSetItem,
  safeLocalStorageGetItem,
} from "./storage-helper";

const STORAGE_KEY_BEHAVIOURS = "pocketpot_positive_behaviours_v1";
const STORAGE_KEY_BONUS_AWARDS = "pocketpot_bonus_awards_v1";

/**
 * Default Preset Positive Behaviours with 1-2 word definitions and micro-incentives.
 */
export const DEFAULT_POSITIVE_BEHAVIOURS: PositiveBehaviourDocument[] = [
  {
    behaviourId: "preset-kind-helper",
    title: "Kind Helper",
    definition: "Kindness",
    amountCents: 10, // 10p
    icon: "🤝",
    colorTheme: "sageGreen",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-great-focus",
    title: "Great Focus",
    definition: "Focus",
    amountCents: 15, // 15p
    icon: "🎯",
    colorTheme: "calmingTeal",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-team-player",
    title: "Team Player",
    definition: "Teamwork",
    amountCents: 20, // 20p
    icon: "⭐",
    colorTheme: "warmAmber",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-tidy-space",
    title: "Tidy Space",
    definition: "Responsibility",
    amountCents: 10, // 10p
    icon: "🧹",
    colorTheme: "sageGreen",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-creative-spark",
    title: "Creative Spark",
    definition: "Creativity",
    amountCents: 20, // 20p
    icon: "💡",
    colorTheme: "electricIndigo",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-kept-trying",
    title: "Kept Trying",
    definition: "Perseverance",
    amountCents: 15, // 15p
    icon: "🌱",
    colorTheme: "calmingTeal",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-good-listener",
    title: "Good Listener",
    definition: "Respect",
    amountCents: 10, // 10p
    icon: "👂",
    colorTheme: "sageGreen",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    behaviourId: "preset-active-participation",
    title: "Courageous Voice",
    definition: "Participation",
    amountCents: 15, // 15p
    icon: "💬",
    colorTheme: "warmAmber",
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Retrieve saved positive behaviours (seeded with defaults on first run).
 */
export function getSavedBehaviours(classId?: string): PositiveBehaviourDocument[] {
  if (typeof window === "undefined") return DEFAULT_POSITIVE_BEHAVIOURS;

  let behaviours: PositiveBehaviourDocument[] = [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_BEHAVIOURS);
  if (stored) {
    try {
      const parsed: PositiveBehaviourDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        behaviours = parsed;
      }
    } catch {
      // Fallback
    }
  }

  // If no saved behaviours or empty, seed with DEFAULT_POSITIVE_BEHAVIOURS
  if (behaviours.length === 0) {
    behaviours = [...DEFAULT_POSITIVE_BEHAVIOURS];
    safeLocalStorageSetItem(STORAGE_KEY_BEHAVIOURS, JSON.stringify(behaviours));
    try {
      saveBehavioursBatchToFirestore(behaviours);
    } catch {
      // ignore
    }
  } else {
    // Ensure all default presets are available even if custom behaviours were added
    const existingIds = new Set(behaviours.map((b) => b.behaviourId));
    let hasNewPresets = false;
    for (const preset of DEFAULT_POSITIVE_BEHAVIOURS) {
      if (!existingIds.has(preset.behaviourId)) {
        behaviours.push(preset);
        hasNewPresets = true;
      }
    }
    if (hasNewPresets) {
      safeLocalStorageSetItem(STORAGE_KEY_BEHAVIOURS, JSON.stringify(behaviours));
    }
  }

  if (classId) {
    const normClassId = classId.trim().toLowerCase();
    const cleanClassId = normClassId.replace(/[^a-z0-9]/g, "");
    return behaviours.filter((b) => {
      // Global presets or wildcard behaviours match every class
      if (!b.classId || b.classId === "*" || b.classId === "all") return true;
      if (b.classId === classId) return true;
      const bNorm = b.classId.trim().toLowerCase();
      if (bNorm === normClassId) return true;
      if (bNorm.replace(/[^a-z0-9]/g, "") === cleanClassId) return true;
      return false;
    });
  }

  return behaviours;
}

/**
 * Merges incoming behaviours (e.g. from Firestore listener) into local storage.
 */
export function cacheBehavioursLocally(incoming: PositiveBehaviourDocument[]): void {
  if (typeof window === "undefined" || !Array.isArray(incoming) || incoming.length === 0) return;
  const current = getSavedBehaviours();
  const map = new Map<string, PositiveBehaviourDocument>();

  DEFAULT_POSITIVE_BEHAVIOURS.forEach((b) => map.set(b.behaviourId, b));
  current.forEach((b) => map.set(b.behaviourId, b));
  incoming.forEach((b) => {
    if (b && b.behaviourId) {
      const existing = map.get(b.behaviourId);
      map.set(b.behaviourId, existing ? { ...existing, ...b } : b);
    }
  });

  const merged = Array.from(map.values());
  safeLocalStorageSetItem(STORAGE_KEY_BEHAVIOURS, JSON.stringify(merged));
}

/**
 * Save behaviours to localStorage.
 */
export function saveBehaviours(behaviours: PositiveBehaviourDocument[]): void {
  if (typeof window === "undefined") return;
  behaviours.forEach((b) => assertZeroPII(b as unknown as Record<string, unknown>));
  safeLocalStorageSetItem(STORAGE_KEY_BEHAVIOURS, JSON.stringify(behaviours));
  try {
    saveBehavioursBatchToFirestore(behaviours);
  } catch (err) {
    console.warn("Firestore saveBehaviours warning:", err);
  }
}

/**
 * Create a new custom Positive Behaviour.
 */
export function createBehaviour(payload: {
  classId?: string;
  title: string;
  definition: string;
  amountCents: number;
  icon?: string;
  colorTheme?: "calmingTeal" | "warmAmber" | "sageGreen" | "electricIndigo";
}): PositiveBehaviourDocument {
  const title = payload.title.trim();
  const definition = payload.definition.trim();

  if (!title) throw new Error("Please enter a behaviour name.");
  if (!definition) throw new Error("Please enter a 1 or 2 word definition (e.g. Kindness, Focus).");
  if (payload.amountCents <= 0) throw new Error("Reward amount must be greater than zero.");

  const all = getSavedBehaviours();
  const now = new Date().toISOString();

  const newBehaviour: PositiveBehaviourDocument = {
    behaviourId: `custom-behaviour-${crypto.randomUUID()}`,
    classId: payload.classId,
    title,
    definition,
    amountCents: Math.round(payload.amountCents),
    icon: payload.icon || "⭐",
    colorTheme: payload.colorTheme || "calmingTeal",
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  assertZeroPII(newBehaviour as unknown as Record<string, unknown>);
  saveBehaviours([newBehaviour, ...all]);
  return newBehaviour;
}

/**
 * Update an existing Positive Behaviour (e.g. changing reward amount or definition).
 */
export function updateBehaviour(
  behaviourId: string,
  updates: Partial<Omit<PositiveBehaviourDocument, "behaviourId" | "createdAt">>
): PositiveBehaviourDocument {
  const all = getSavedBehaviours();
  const index = all.findIndex((b) => b.behaviourId === behaviourId);
  if (index === -1) throw new Error("Behaviour not found.");

  const current = all[index];
  const updated: PositiveBehaviourDocument = {
    ...current,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : current.title,
    definition: updates.definition !== undefined ? updates.definition.trim() : current.definition,
    amountCents: updates.amountCents !== undefined ? Math.round(updates.amountCents) : current.amountCents,
    updatedAt: new Date().toISOString(),
  };

  assertZeroPII(updated as unknown as Record<string, unknown>);
  all[index] = updated;
  saveBehaviours(all);
  return updated;
}

/**
 * Delete a Positive Behaviour.
 */
export function deleteBehaviour(behaviourId: string): void {
  const all = getSavedBehaviours();
  const filtered = all.filter((b) => b.behaviourId !== behaviourId);
  saveBehaviours(filtered);
  try {
    deleteBehaviourFromFirestore(behaviourId);
  } catch (err) {
    console.warn("Firestore deleteBehaviour warning:", err);
  }
}

/**
 * Get recent bonus awards log.
 */
export function getSavedBonusAwards(classId?: string, limit: number = 20): BonusAwardDocument[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_BONUS_AWARDS);
  if (stored) {
    try {
      const parsed: BonusAwardDocument[] = JSON.parse(stored);
      const filtered = classId ? parsed.filter((a) => a.classId === classId) : parsed;
      return filtered.slice(0, limit);
    } catch {
      // Fallback
    }
  }
  return [];
}

/**
 * Save bonus awards log.
 */
export function saveBonusAwards(awards: BonusAwardDocument[]): void {
  if (typeof window === "undefined") return;
  awards.forEach((a) => assertZeroPII(a as unknown as Record<string, unknown>));
  safeLocalStorageSetItem(STORAGE_KEY_BONUS_AWARDS, JSON.stringify(awards));
}

export interface AwardBonusResult {
  success: boolean;
  behaviour: PositiveBehaviourDocument;
  pupilCount: number;
  totalCentsAwarded: number;
  pupilDisplayNames: string[];
  awardRecord: BonusAwardDocument;
}

/**
 * INSTANT REWARD ENGINE (Whiteboard / Tablet Interaction)
 * 1. Credits amount directly to each selected pupil's card balance
 * 2. Creates a ledger entry titled: 'Bonus - (description of behaviour)'
 * 3. Sends in-app celebratory notification to each pupil
 * 4. Logs the award for classroom history
 */
export function awardBonusToPupils(params: {
  behaviourId: string;
  pupilIds: string[];
  classId: string;
  behaviour?: PositiveBehaviourDocument;
  pupils?: PupilDocument[];
}): AwardBonusResult {
  if (!params.pupilIds || params.pupilIds.length === 0) {
    throw new Error("Please select at least one pupil to receive the bonus.");
  }

  // 1. Resolve Target Behaviour via multi-tier fallback
  let targetBehaviour: PositiveBehaviourDocument | undefined = params.behaviour;

  if (!targetBehaviour && params.classId) {
    const classBehaviours = getSavedBehaviours(params.classId);
    targetBehaviour = classBehaviours.find((b) => b.behaviourId === params.behaviourId);
  }

  if (!targetBehaviour) {
    const allBehaviours = getSavedBehaviours();
    targetBehaviour = allBehaviours.find((b) => b.behaviourId === params.behaviourId);
  }

  if (!targetBehaviour) {
    targetBehaviour = DEFAULT_POSITIVE_BEHAVIOURS.find((b) => b.behaviourId === params.behaviourId);
  }

  if (!targetBehaviour && params.behaviourId) {
    const all = [...getSavedBehaviours(), ...DEFAULT_POSITIVE_BEHAVIOURS];
    const cleanId = params.behaviourId.toLowerCase().replace(/^(preset-|custom-behaviour-)/, "").replace(/[^a-z0-9]/g, "");
    targetBehaviour = all.find((b) => {
      const bCleanId = b.behaviourId.toLowerCase().replace(/^(preset-|custom-behaviour-)/, "").replace(/[^a-z0-9]/g, "");
      const bTitle = b.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const bDef = b.definition.toLowerCase().replace(/[^a-z0-9]/g, "");
      return bCleanId === cleanId || bTitle === cleanId || bDef === cleanId;
    });
  }

  if (!targetBehaviour) {
    // Final emergency fallback: default to first preset
    targetBehaviour = DEFAULT_POSITIVE_BEHAVIOURS[0];
  }

  // 2. Resolve Selected Pupils
  let allPupils = getSavedPupils();
  if (params.pupils && params.pupils.length > 0) {
    const pMap = new Map<string, PupilDocument>();
    allPupils.forEach((p) => pMap.set(p.pupilId, p));
    params.pupils.forEach((p) => {
      const existing = pMap.get(p.pupilId);
      pMap.set(p.pupilId, existing ? { ...existing, ...p } : p);
    });
    allPupils = Array.from(pMap.values());
  }

  const selectedPupilIdsSet = new Set(params.pupilIds);
  let selectedPupils = allPupils.filter((p) => selectedPupilIdsSet.has(p.pupilId));

  // If some selected pupils were not in allPupils, create placeholders so bonus is never lost
  if (selectedPupils.length === 0) {
    params.pupilIds.forEach((pid, idx) => {
      const fallbackPupil: PupilDocument = {
        pupilId: pid,
        classId: params.classId,
        deskBadgeNumber: idx + 1,
        educationalCodename: `Pupil ${idx + 1}`,
        displayName: `Pupil ${idx + 1}`,
        avatarIconKey: "badge-otter",
        cardLastFour: "1234",
        mainBalanceCents: 0,
        totalSavedCents: 0,
        activePotsCount: 0,
        anonymized: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      allPupils.push(fallbackPupil);
      selectedPupils.push(fallbackPupil);
    });
  }

  const now = new Date().toISOString();
  const newTransactions: PotLedgerEntry[] = [];
  const pupilDisplayNames: string[] = [];

  // 3. Update pupils' main balances and generate ledger entries
  const updatedPupils = allPupils.map((pupil) => {
    if (selectedPupilIdsSet.has(pupil.pupilId)) {
      const name = getPupilDisplayName(pupil);
      pupilDisplayNames.push(name);

      const updatedMainBalance = (pupil.mainBalanceCents || 0) + targetBehaviour.amountCents;

      // Requirement 5: Shows in their transactions as 'Bonus - (description of behaviour)'
      const behaviourDesc = targetBehaviour.definition || targetBehaviour.title;
      const transactionTitle = `Bonus - ${behaviourDesc}`;

      const tx: PotLedgerEntry = {
        transactionId: crypto.randomUUID(),
        pupilId: pupil.pupilId,
        classId: pupil.classId || params.classId,
        title: transactionTitle,
        deltaCents: targetBehaviour.amountCents,
        type: "bonus",
        category: "income",
        nonPunitiveNote: `Awarded by teacher for ${targetBehaviour.title} (${targetBehaviour.definition})`,
        timestamp: now,
      };

      assertZeroPII(tx as unknown as Record<string, unknown>);
      newTransactions.push(tx);

      // Send celebratory pupil notification
      try {
        addNotification({
          classId: pupil.classId || params.classId,
          pupilId: pupil.pupilId,
          isTeacherNotification: false,
          title: `🌟 Bonus Awarded: +${formatCurrency(targetBehaviour.amountCents)}`,
          message: `Your teacher awarded you a ${formatCurrency(targetBehaviour.amountCents)} bonus for ${targetBehaviour.title} (${targetBehaviour.definition})!`,
          type: "bonus",
          amountCents: targetBehaviour.amountCents,
        });
      } catch (err) {
        console.warn("Notification send warning:", err);
      }

      return {
        ...pupil,
        mainBalanceCents: updatedMainBalance,
        updatedAt: now,
      };
    }
    return pupil;
  });

  // Save updated pupils and prepend transactions
  savePupils(updatedPupils);
  const existingTxs = getSavedTransactions();
  saveTransactions([...newTransactions, ...existingTxs]);

  // Log award record
  const awardRecord: BonusAwardDocument = {
    awardId: crypto.randomUUID(),
    classId: params.classId,
    behaviourId: targetBehaviour.behaviourId,
    behaviourTitle: targetBehaviour.title,
    definition: targetBehaviour.definition,
    amountCents: targetBehaviour.amountCents,
    pupilIds: params.pupilIds,
    awardedAt: now,
  };

  assertZeroPII(awardRecord as unknown as Record<string, unknown>);
  const existingAwards = getSavedBonusAwards();
  saveBonusAwards([awardRecord, ...existingAwards]);

  // Real-time Firestore sync for Whiteboard Mode bonuses (Atomic increment)
  try {
    params.pupilIds.forEach((pid) => {
      awardMicroBonusInFirestore(pid, targetBehaviour.amountCents);
      const p = updatedPupils.find((item) => item.pupilId === pid);
      if (p) {
        updatePupilBalanceInFirestore(pid, p.mainBalanceCents, p.totalSavedCents);
      }
    });
    recordBonusAwardInFirestore(awardRecord);
    newTransactions.forEach((tx) => recordTransactionInFirestore(tx));
  } catch (err) {
    console.warn("Firestore bonus award sync warning:", err);
  }

  return {
    success: true,
    behaviour: targetBehaviour,
    pupilCount: selectedPupils.length,
    totalCentsAwarded: targetBehaviour.amountCents * selectedPupils.length,
    pupilDisplayNames,
    awardRecord,
  };
}
