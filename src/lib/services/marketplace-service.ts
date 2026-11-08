/**
 * PocketPot Classroom Market & Rewards Service (Zero-PII Compliant)
 * 
 * Manages customizable teacher rewards, delayed gratification tiers (short-term vs long-term),
 * mindful purchase execution with ledger synchronization, and automatic savings pot generation.
 * Strictly operates in real cash values (£ and p), never refers to "coins".
 */

import {
  MarketplaceRewardDocument,
  MarketplacePurchaseDocument,
  SavingsPotDocument,
  PupilDocument,
  PotLedgerEntry,
} from "../firebase/types";
import {
  getSavedPupils,
  savePupils,
  getSavedPots,
  savePots,
  getSavedTransactions,
  saveTransactions,
} from "./class-service";
import { formatCurrency } from "../firebase/zero-pii";

const STORAGE_KEY_REWARDS = "pocketpot_marketplace_rewards_v2";
const STORAGE_KEY_PURCHASES = "pocketpot_marketplace_purchases_v2";

/**
 * Normalizes class identifiers to ensure seamless linking between
 * teacher and pupil accounts (e.g. "class-year4-teal" vs "class-year-4-teal").
 */
export function normalizeClassId(id?: string): string {
  if (!id) return "class-year-4-teal";
  return id.replace(/^class-year(\d+)/i, "class-year-$1").toLowerCase();
}

/**
 * Pre-filled pedagogical examples illustrating short-term quick wins
 * vs long-term delayed gratification goals for Key Stage 2 pupils.
 * Inactive by default until teacher activates them.
 */
export const DEFAULT_MARKETPLACE_REWARDS: Omit<
  MarketplaceRewardDocument,
  "rewardId" | "classId" | "purchasesCount" | "createdAt" | "updatedAt"
>[] = [
  {
    title: "Move to the front of the line for a week",
    description: "Lead your class line proudly to assemblies, lunch hall, and break times for one whole week.",
    priceCoins: 150, // £1.50
    icon: "🚀",
    tier: "short_term",
    stockQuantity: 2,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Choose your own desk",
    description: "Pick any desk and seating spot in the classroom to work from for an entire week.",
    priceCoins: 300, // £3.00
    icon: "🪑",
    tier: "long_term",
    stockQuantity: 4,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Class DJ: Pick Friday Tidy Music (15 mins)",
    description: "Select the upbeat song playlist for our Friday afternoon classroom tidy-up session.",
    priceCoins: 100, // £1.00
    icon: "🎵",
    tier: "short_term",
    stockQuantity: 1,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Bring a Soft Toy / Reading Mascot for Friday",
    description: "Bring your favorite cuddly friend to sit peacefully on your desk during Friday afternoon reading.",
    priceCoins: 75, // 75p
    icon: "🧸",
    tier: "short_term",
    isAvailable: false, // Inactive by default
  },
  {
    title: "VIP Squash & Biscuits with Headteacher",
    description: "Enjoy a special afternoon snack break with school leadership to share pupil council ideas.",
    priceCoins: 500, // £5.00
    icon: "☕",
    tier: "long_term",
    stockQuantity: 3,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Homework Pass for One Night",
    description: "Enjoy a restful evening off from one weekday reading or times-table practice assignment.",
    priceCoins: 400, // £4.00
    icon: "🎟️",
    tier: "long_term",
    isAvailable: false, // Inactive by default
  },
  {
    title: "First Pick of Playground Sports Gear",
    description: "Get first choice of the football, jump ropes, or swingball bats during morning and lunch break.",
    priceCoins: 50, // 50p
    icon: "⚽",
    tier: "short_term",
    isAvailable: false, // Inactive by default
  },
];

/**
 * Returns saved rewards for a given class or globally.
 * Seeds defaults on first run (all inactive by default).
 */
export function getSavedRewards(classId?: string): MarketplaceRewardDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_REWARDS);
  let rewards: MarketplaceRewardDocument[] = [];

  if (stored) {
    try {
      rewards = JSON.parse(stored);
    } catch {
      rewards = [];
    }
  }

  // Seed default rewards if empty
  if (rewards.length === 0) {
    const targetClass = normalizeClassId(classId);
    const now = new Date().toISOString();
    rewards = DEFAULT_MARKETPLACE_REWARDS.map((item, idx) => ({
      ...item,
      rewardId: `rew-${targetClass}-${idx + 1}`,
      classId: targetClass,
      purchasesCount: 0,
      isAvailable: false, // Inactive by default
      createdAt: now,
      updatedAt: now,
    }));
    saveRewards(rewards);
  }

  if (classId) {
    const target = normalizeClassId(classId);
    return rewards.filter((r) => normalizeClassId(r.classId) === target);
  }
  return rewards;
}

/**
 * Persists rewards list to local storage and dispatches update event.
 */
export function saveRewards(rewards: MarketplaceRewardDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_REWARDS, JSON.stringify(rewards));
  window.dispatchEvent(new CustomEvent("pocketpot_marketplace_updated"));
}

/**
 * Creates a new teacher-configured marketplace reward.
 * Inactive by default until teacher toggles it on.
 */
export function createReward(
  rewardData: Omit<
    MarketplaceRewardDocument,
    "rewardId" | "purchasesCount" | "createdAt" | "updatedAt"
  >
): MarketplaceRewardDocument {
  const existing = getSavedRewards();
  const now = new Date().toISOString();
  const normalizedClassId = normalizeClassId(rewardData.classId);

  const newReward: MarketplaceRewardDocument = {
    ...rewardData,
    classId: normalizedClassId,
    rewardId: `rew-${normalizedClassId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    purchasesCount: 0,
    isAvailable: rewardData.isAvailable ?? false, // Inactive by default
    createdAt: now,
    updatedAt: now,
  };

  saveRewards([newReward, ...existing]);
  return newReward;
}

/**
 * Updates an existing reward and triggers active sync.
 */
export function updateReward(
  rewardId: string,
  updates: Partial<MarketplaceRewardDocument>
): MarketplaceRewardDocument | null {
  const all = getSavedRewards();
  const idx = all.findIndex((r) => r.rewardId === rewardId);
  if (idx === -1) return null;

  const updated: MarketplaceRewardDocument = {
    ...all[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updated;
  saveRewards(all);
  return updated;
}

/**
 * Deletes a reward by ID.
 */
export function deleteReward(rewardId: string): boolean {
  const all = getSavedRewards();
  const filtered = all.filter((r) => r.rewardId !== rewardId);
  if (filtered.length !== all.length) {
    saveRewards(filtered);
    return true;
  }
  return false;
}

/**
 * Returns purchase records (Zero-PII compliant).
 */
export function getSavedPurchases(
  classId?: string,
  pupilId?: string
): MarketplacePurchaseDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_PURCHASES);
  let purchases: MarketplacePurchaseDocument[] = [];

  if (stored) {
    try {
      purchases = JSON.parse(stored);
    } catch {
      purchases = [];
    }
  }

  const targetClass = classId ? normalizeClassId(classId) : undefined;

  if (targetClass && pupilId) {
    return purchases.filter(
      (p) => normalizeClassId(p.classId) === targetClass && p.pupilId === pupilId
    );
  }
  if (targetClass) {
    return purchases.filter((p) => normalizeClassId(p.classId) === targetClass);
  }
  if (pupilId) {
    return purchases.filter((p) => p.pupilId === pupilId);
  }
  return purchases;
}

/**
 * Persists purchase records to storage and dispatches update event.
 */
export function savePurchases(purchases: MarketplacePurchaseDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(purchases));
  window.dispatchEvent(new CustomEvent("pocketpot_marketplace_updated"));
}

/**
 * Executes a mindful reward purchase:
 * - Checks stock & balance (represented in cash cents/pence)
 * - Deducts cash from pupil card account
 * - Appends ledger entry (Zero-PII)
 * - Records purchase order
 * - Increments reward purchase counter
 */
export function purchaseReward(
  pupilId: string,
  rewardId: string
): { success: boolean; error?: string; purchase?: MarketplacePurchaseDocument } {
  const pupils = getSavedPupils();
  const pupil = pupils.find((p) => p.pupilId === pupilId);
  if (!pupil) {
    return { success: false, error: "Pupil profile could not be found." };
  }

  const rewards = getSavedRewards();
  const reward = rewards.find((r) => r.rewardId === rewardId);
  if (!reward) {
    return { success: false, error: "Market reward could not be found." };
  }

  if (!reward.isAvailable) {
    return { success: false, error: "This reward is taking a quiet pause right now." };
  }

  // Stock check
  if (reward.stockQuantity !== undefined && reward.stockQuantity !== null) {
    const activePurchases = getSavedPurchases(reward.classId).filter(
      (p) => p.rewardId === reward.rewardId && p.status !== "refunded"
    );
    if (activePurchases.length >= reward.stockQuantity) {
      return {
        success: false,
        error: "All allocated spots for this reward are currently filled for this cycle.",
      };
    }
  }

  // Cash balance check (Non-punitive microcopy)
  const costCents = reward.priceCoins;
  if ((pupil.mainBalanceCents || 0) < costCents) {
    const neededCents = costCents - (pupil.mainBalanceCents || 0);
    return {
      success: false,
      error: `Taking a quiet moment: You need ${formatCurrency(neededCents)} more to unlock this goal. Set up a Pot to start saving!`,
    };
  }

  const now = new Date().toISOString();

  // 1. Deduct cash value from pupil card balance
  pupil.mainBalanceCents = (pupil.mainBalanceCents || 0) - costCents;
  savePupils([...pupils]);

  // 2. Append Zero-PII Ledger Entry
  const tx: PotLedgerEntry = {
    transactionId: `tx-market-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pupilId: pupil.pupilId,
    classId: pupil.classId,
    title: `Market: ${reward.title}`,
    deltaCents: -costCents,
    type: "marketplace_purchase",
    category: "spend",
    nonPunitiveNote: `Redeemed ${reward.title} for ${formatCurrency(costCents)}.`,
    timestamp: now,
  };
  saveTransactions([tx, ...getSavedTransactions()]);

  // 3. Create Purchase Order
  const purchase: MarketplacePurchaseDocument = {
    purchaseId: `purch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rewardId: reward.rewardId,
    rewardTitle: reward.title,
    rewardIcon: reward.icon,
    priceCoins: costCents,
    classId: pupil.classId,
    pupilId: pupil.pupilId,
    pupilCodename: pupil.educationalCodename || "Learner",
    status: "pending",
    purchasedAt: now,
  };
  savePurchases([purchase, ...getSavedPurchases()]);

  // 4. Increment reward purchase count
  reward.purchasesCount = (reward.purchasesCount || 0) + 1;
  saveRewards([...rewards]);

  return { success: true, purchase };
}

/**
 * Refunding a Purchased Marketplace Item:
 * - Restores cash value to the pupil's card balance
 * - Creates an audited refund ledger entry
 * - Marks purchase as 'refunded'
 */
export function refundPurchase(
  purchaseId: string,
  refundReason?: string
): { success: boolean; error?: string } {
  const purchases = getSavedPurchases();
  const purchase = purchases.find((p) => p.purchaseId === purchaseId);
  if (!purchase) {
    return { success: false, error: "Purchase record could not be found." };
  }

  if (purchase.status === "refunded") {
    return { success: false, error: "This purchase has already been refunded." };
  }

  const pupils = getSavedPupils();
  const pupil = pupils.find((p) => p.pupilId === purchase.pupilId);
  if (!pupil) {
    return { success: false, error: "Pupil profile could not be found." };
  }

  const now = new Date().toISOString();
  const refundAmount = purchase.priceCoins;

  // 1. Re-credit cash value to pupil's card balance
  pupil.mainBalanceCents = (pupil.mainBalanceCents || 0) + refundAmount;
  savePupils([...pupils]);

  // 2. Append Refund Ledger Entry
  const refundTx: PotLedgerEntry = {
    transactionId: `tx-refund-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pupilId: pupil.pupilId,
    classId: pupil.classId,
    title: `Refund: ${purchase.rewardTitle}`,
    deltaCents: refundAmount,
    type: "marketplace_refund",
    category: "income",
    nonPunitiveNote:
      refundReason ||
      `Market reward refunded (+${formatCurrency(refundAmount)} returned to card balance).`,
    timestamp: now,
  };
  saveTransactions([refundTx, ...getSavedTransactions()]);

  // 3. Mark purchase as refunded
  purchase.status = "refunded";
  purchase.refundedAt = now;
  purchase.refundReason = refundReason || "Teacher processed refund";
  savePurchases([...purchases]);

  return { success: true };
}

/**
 * Marks a reward purchase as fulfilled by teacher.
 */
export function fulfillPurchase(purchaseId: string): { success: boolean; error?: string } {
  const purchases = getSavedPurchases();
  const purchase = purchases.find((p) => p.purchaseId === purchaseId);
  if (!purchase) {
    return { success: false, error: "Purchase record not found." };
  }

  purchase.status = "fulfilled";
  purchase.fulfilledAt = new Date().toISOString();
  savePurchases([...purchases]);
  return { success: true };
}

/**
 * Pot Integration:
 * Automatically creates a dedicated Savings Pot for an unaffordable reward,
 * actively teaching delayed gratification and financial planning habits.
 */
export function createPotForReward(
  pupilId: string,
  classId: string,
  reward: MarketplaceRewardDocument
): SavingsPotDocument {
  const pots = getSavedPots();
  const potTitle = `Goal: ${reward.title}`;

  // If pupil already has an active pot for this reward, return it directly
  const existing = pots.find(
    (p) => p.pupilId === pupilId && p.title.toLowerCase() === potTitle.toLowerCase() && p.status !== "taking_a_pause"
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const newPot: SavingsPotDocument = {
    potId: `pot-reward-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pupilId: pupilId,
    classId: normalizeClassId(classId),
    title: potTitle,
    targetAmountCents: reward.priceCoins,
    currentAmountCents: 0,
    theme: reward.tier === "short_term" ? "calmingTeal" : "warmAmber",
    status: "active",
    potNote: `Saving up for "${reward.title}". Every week's wage and bonus brings you closer!`,
    categoryLabel: "Market Goal",
    lastInteractionAt: now,
    createdAt: now,
    updatedAt: now,
  };

  savePots([newPot, ...pots]);
  return newPot;
}
