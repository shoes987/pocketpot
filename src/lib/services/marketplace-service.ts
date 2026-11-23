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
import { addNotification } from "./jobs-service";
import {
  saveRewardsBatchToFirestore,
  savePurchaseToFirestore,
  updatePupilBalanceInFirestore,
  recordTransactionInFirestore,
} from "../firebase/firestore-service";
import {
  safeLocalStorageSetItem,
  safeLocalStorageGetItem,
} from "./storage-helper";

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
    pricePence: 150, // £1.50
    icon: "🚀",
    tier: "short_term",
    stockQuantity: 2,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Choose your own desk",
    description: "Pick any desk and seating spot in the classroom to work from for an entire week.",
    pricePence: 300, // £3.00
    icon: "🪑",
    tier: "long_term",
    stockQuantity: 4,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Class DJ: Pick Friday Tidy Music (15 mins)",
    description: "Select the upbeat song playlist for our Friday afternoon classroom tidy-up session.",
    pricePence: 100, // £1.00
    icon: "🎵",
    tier: "short_term",
    stockQuantity: 1,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Bring a Soft Toy / Reading Mascot for Friday",
    description: "Bring your favorite cuddly friend to sit peacefully on your desk during Friday afternoon reading.",
    pricePence: 75, // 75p
    icon: "🧸",
    tier: "short_term",
    isAvailable: false, // Inactive by default
  },
  {
    title: "VIP Squash & Biscuits with Headteacher",
    description: "Enjoy a special afternoon snack break with school leadership to share pupil council ideas.",
    pricePence: 500, // £5.00
    icon: "☕",
    tier: "long_term",
    stockQuantity: 3,
    isAvailable: false, // Inactive by default
  },
  {
    title: "Homework Pass for One Night",
    description: "Enjoy a restful evening off from one weekday reading or times-table practice assignment.",
    pricePence: 400, // £4.00
    icon: "🎟️",
    tier: "long_term",
    isAvailable: false, // Inactive by default
  },
  {
    title: "First Pick of Playground Sports Gear",
    description: "Get first choice of the football, jump ropes, or swingball bats during morning and lunch break.",
    pricePence: 50, // 50p
    icon: "⚽",
    tier: "short_term",
    isAvailable: false, // Inactive by default
  },
];

/**
 * Returns saved rewards for a given class or globally.
 * Uses flexible class matching and sanitizes all reward documents.
 */
export function getSavedRewards(classId?: string): MarketplaceRewardDocument[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_REWARDS);
  let rewards: MarketplaceRewardDocument[] = [];

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        rewards = parsed
          .filter((item) => item && typeof item === "object" && typeof item.rewardId === "string" && item.rewardId.trim() !== "")
          .map((item) => ({
            ...item,
            title: item.title?.trim() || "Classroom Privilege",
            description: item.description?.trim() || "",
            icon: item.icon || "🚀",
            tier: item.tier === "long_term" ? "long_term" : "short_term",
            isAvailable: item.isAvailable !== false,
            pricePence: typeof item.pricePence === "number" && !isNaN(item.pricePence)
              ? item.pricePence
              : typeof (item as any).priceCoins === "number" && !isNaN((item as any).priceCoins)
              ? (item as any).priceCoins
              : 150,
            purchasesCount: typeof item.purchasesCount === "number" ? item.purchasesCount : 0,
          }));
      }
    } catch {
      rewards = [];
    }
  }

  if (classId) {
    const target = classId.trim().toLowerCase();
    const normalizedTarget = normalizeClassId(classId);
    return rewards.filter((r) => {
      if (!r.classId || r.classId === "*") return true;
      const rClass = r.classId.trim().toLowerCase();
      const rNorm = normalizeClassId(r.classId);
      return (
        rClass === target ||
        rNorm === normalizedTarget ||
        rClass === normalizedTarget ||
        rNorm === target
      );
    });
  }
  return rewards;
}

/**
 * Cache rewards from Firestore snapshot without wiping out locally created rewards.
 */
export function cacheRewardsLocally(incomingRewards: MarketplaceRewardDocument[]): void {
  if (typeof window === "undefined" || !incomingRewards || incomingRewards.length === 0) return;
  const localRewards = getSavedRewards();
  const rewardMap = new Map<string, MarketplaceRewardDocument>();

  localRewards.forEach((r) => {
    if (r && r.rewardId) rewardMap.set(r.rewardId, r);
  });

  incomingRewards.forEach((r) => {
    if (r && r.rewardId) {
      const existing = rewardMap.get(r.rewardId);
      rewardMap.set(r.rewardId, {
        ...(existing || {}),
        ...r,
        // Preserve local availability if already set
        isAvailable: r.isAvailable !== undefined ? r.isAvailable : existing?.isAvailable ?? true,
      });
    }
  });

  const merged = Array.from(rewardMap.values());
  safeLocalStorageSetItem(STORAGE_KEY_REWARDS, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent("pocketpot_marketplace_updated"));
}

/**
 * Seeds pedagogical starter marketplace rewards for a classroom and writes them to Firestore.
 */
export function seedDefaultRewardsForClass(classId: string): MarketplaceRewardDocument[] {
  const normalizedClassId = normalizeClassId(classId);
  const existing = getSavedRewards(normalizedClassId);
  if (existing.length > 0) {
    try {
      saveRewardsBatchToFirestore(existing);
    } catch (err) {
      console.warn("Firestore seedDefaultRewardsForClass existing sync warning:", err);
    }
    return existing;
  }

  const now = new Date().toISOString();
  const seeded: MarketplaceRewardDocument[] = DEFAULT_MARKETPLACE_REWARDS.map((r, i) => ({
    ...r,
    rewardId: `rew-${normalizedClassId}-seed-${i + 1}-${crypto.randomUUID().slice(0, 6)}`,
    classId: normalizedClassId,
    purchasesCount: 0,
    createdAt: now,
    updatedAt: now,
  }));

  const all = getSavedRewards();
  saveRewards([...seeded, ...all]);
  return seeded;
}

/**
 * Persists rewards list to local storage and dispatches update event.
 */
export function saveRewards(rewards: MarketplaceRewardDocument[]): void {
  if (typeof window === "undefined") return;
  const validRewards = rewards.filter((r) => r && typeof r === "object" && typeof r.rewardId === "string");
  safeLocalStorageSetItem(STORAGE_KEY_REWARDS, JSON.stringify(validRewards));
  window.dispatchEvent(new CustomEvent("pocketpot_marketplace_updated"));
  try {
    saveRewardsBatchToFirestore(validRewards);
  } catch (err) {
    console.warn("Firestore saveRewards warning:", err);
  }
}

/**
 * Creates a new teacher-configured marketplace reward.
 * Available and live on pupil accounts by default!
 */
export function createReward(
  rewardData: Omit<
    MarketplaceRewardDocument,
    "rewardId" | "purchasesCount" | "createdAt" | "updatedAt"
  >
): MarketplaceRewardDocument {
  const existing = getSavedRewards();
  const now = new Date().toISOString();
  const rawClassId = rewardData.classId || "class-year-4-teal";
  const normalizedClassId = normalizeClassId(rawClassId);
  const cleanDocClassId = normalizedClassId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const newReward: MarketplaceRewardDocument = {
    classId: rawClassId,
    title: rewardData.title?.trim() || "New Privilege",
    description: rewardData.description?.trim() || "",
    pricePence: typeof rewardData.pricePence === "number" && !isNaN(rewardData.pricePence)
      ? Math.max(10, Math.round(rewardData.pricePence))
      : 150,
    icon: rewardData.icon || "🚀",
    tier: rewardData.tier === "long_term" ? "long_term" : "short_term",
    rewardId: `rew-${cleanDocClassId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    purchasesCount: 0,
    isAvailable: rewardData.isAvailable ?? true, // Active and live by default!
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
  const stored = safeLocalStorageGetItem(STORAGE_KEY_PURCHASES);
  let purchases: MarketplacePurchaseDocument[] = [];

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      purchases = Array.isArray(parsed)
        ? parsed.map((item) => ({
            ...item,
            pricePence: (item as any).pricePence ?? (item as any).priceCoins ?? 0,
          }))
        : [];
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
  safeLocalStorageSetItem(STORAGE_KEY_PURCHASES, JSON.stringify(purchases));
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
  const costCents = reward.pricePence;
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
    pricePence: costCents,
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

  // 5. Send celebratory pupil notification and teacher notification
  addNotification({
    pupilId: pupil.pupilId,
    classId: pupil.classId,
    isTeacherNotification: false,
    title: `🛍️ Reward Redeemed: ${reward.title}`,
    message: `You redeemed "${reward.title}" for ${formatCurrency(costCents)}! Show your desk badge to your teacher when ready.`,
    type: "marketplace",
    amountCents: costCents,
  });

  addNotification({
    classId: pupil.classId,
    isTeacherNotification: true,
    title: `New Reward Request: ${reward.title}`,
    message: `${pupil.displayName || pupil.educationalCodename || "A pupil"} redeemed "${reward.title}" (${formatCurrency(costCents)}).`,
    type: "marketplace",
    amountCents: costCents,
  });

  // Real-time Firestore sync
  try {
    updatePupilBalanceInFirestore(pupil.pupilId, pupil.mainBalanceCents);
    savePurchaseToFirestore(purchase);
    recordTransactionInFirestore(tx);
  } catch (err) {
    console.warn("Firestore purchaseReward warning:", err);
  }

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
  const refundAmount = purchase.pricePence;

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

  // 4. Send refund notification to pupil
  addNotification({
    pupilId: pupil.pupilId,
    classId: pupil.classId,
    isTeacherNotification: false,
    title: `Refund: ${purchase.rewardTitle}`,
    message: `${formatCurrency(refundAmount)} was refunded back to your card balance for "${purchase.rewardTitle}".`,
    type: "marketplace",
    amountCents: refundAmount,
  });

  // Real-time Firestore sync
  try {
    updatePupilBalanceInFirestore(pupil.pupilId, pupil.mainBalanceCents, pupil.totalSavedCents);
    savePurchaseToFirestore(purchase);
    recordTransactionInFirestore(refundTx);
  } catch (err) {
    console.warn("Firestore refundPurchase warning:", err);
  }

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

  // Send delivery notification to pupil
  addNotification({
    pupilId: purchase.pupilId,
    classId: purchase.classId,
    isTeacherNotification: false,
    title: `🎉 Reward Delivered: ${purchase.rewardTitle}`,
    message: `Your teacher has fulfilled your reward "${purchase.rewardTitle}"! Enjoy!`,
    type: "marketplace",
  });

  // Real-time Firestore sync
  try {
    savePurchaseToFirestore(purchase);
  } catch (err) {
    console.warn("Firestore fulfillPurchase warning:", err);
  }

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
  const safePotTitle = potTitle.trim().toLowerCase();
  const existing = pots.find(
    (p) =>
      p &&
      p.pupilId === pupilId &&
      typeof p.title === "string" &&
      p.title.trim().toLowerCase() === safePotTitle &&
      p.status !== "taking_a_pause"
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
    targetAmountCents: reward.pricePence,
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
