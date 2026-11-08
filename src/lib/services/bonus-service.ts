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
import { formatCurrency, assertZeroPII } from "../firebase/zero-pii";
import {
  getSavedPupils,
  savePupils,
  getSavedTransactions,
  saveTransactions,
} from "./class-service";
import { addNotification } from "./jobs-service";

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

  const stored = localStorage.getItem(STORAGE_KEY_BEHAVIOURS);
  if (stored) {
    try {
      const parsed: PositiveBehaviourDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (classId) {
          return parsed.filter((b) => !b.classId || b.classId === classId);
        }
        return parsed;
      }
    } catch {
      // Fallback
    }
  }

  // Seed defaults if empty
  saveBehaviours(DEFAULT_POSITIVE_BEHAVIOURS);
  return DEFAULT_POSITIVE_BEHAVIOURS;
}

/**
 * Save behaviours to localStorage.
 */
export function saveBehaviours(behaviours: PositiveBehaviourDocument[]): void {
  if (typeof window === "undefined") return;
  behaviours.forEach((b) => assertZeroPII(b as unknown as Record<string, unknown>));
  localStorage.setItem(STORAGE_KEY_BEHAVIOURS, JSON.stringify(behaviours));
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
}

/**
 * Get recent bonus awards log.
 */
export function getSavedBonusAwards(classId?: string, limit: number = 20): BonusAwardDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_BONUS_AWARDS);
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
  localStorage.setItem(STORAGE_KEY_BONUS_AWARDS, JSON.stringify(awards));
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
}): AwardBonusResult {
  if (!params.pupilIds || params.pupilIds.length === 0) {
    throw new Error("Please select at least one pupil to receive the bonus.");
  }

  const behaviours = getSavedBehaviours(params.classId);
  const targetBehaviour = behaviours.find((b) => b.behaviourId === params.behaviourId);
  if (!targetBehaviour) {
    throw new Error("The selected positive behaviour could not be found.");
  }

  const allPupils = getSavedPupils();
  const selectedPupils = allPupils.filter((p) => params.pupilIds.includes(p.pupilId));
  if (selectedPupils.length === 0) {
    throw new Error("No matching pupils were found for this class.");
  }

  const now = new Date().toISOString();
  const newTransactions: PotLedgerEntry[] = [];
  const pupilDisplayNames: string[] = [];

  // Update pupils' main balances and generate ledger entries
  const updatedPupils = allPupils.map((pupil) => {
    if (params.pupilIds.includes(pupil.pupilId)) {
      const name = pupil.localDisplayName || pupil.educationalCodename;
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
      addNotification({
        classId: pupil.classId || params.classId,
        pupilId: pupil.pupilId,
        isTeacherNotification: false,
        title: `🌟 Bonus Awarded: +${formatCurrency(targetBehaviour.amountCents)}`,
        message: `Your teacher awarded you a ${formatCurrency(targetBehaviour.amountCents)} bonus for ${targetBehaviour.title} (${targetBehaviour.definition})!`,
        type: "job_hired",
      });

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

  return {
    success: true,
    behaviour: targetBehaviour,
    pupilCount: selectedPupils.length,
    totalCentsAwarded: targetBehaviour.amountCents * selectedPupils.length,
    pupilDisplayNames,
    awardRecord,
  };
}
