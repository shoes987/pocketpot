/**
 * PocketPot Adversarial Stress & Currency Integrity Verification Suite
 * 
 * Tests:
 * 1. Transaction Pruning & Quota Safety:
 *    - 2,000 transactions fed to saveTransactions
 *    - Strict cap at 1,000 entries
 *    - Strict preservation of newest by timestamp
 *    - ID deduplication
 *    - Simulated QuotaExceededError fallback to 300 entries
 *    - Secondary quota exception safety (no crash)
 *    - Non-quota error handling (no crash)
 * 2. Real Cash Currency Standard:
 *    - Full scan of src/ ensuring zero active priceCoins references
 *    - Legacy backward compatibility fallback verification
 *    - formatCurrency() compatibility across minor unit boundary values
 *    - Complete marketplace purchase & refund lifecycle with pricePence
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Setup browser-like environment for Node
class MockLocalStorage {
  constructor() {
    this.store = new Map();
    this.quotaErrorOnKeys = new Set();
    this.throwGenericError = false;
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    if (this.throwGenericError) {
      throw new Error("Generic I/O storage failure");
    }
    if (this.quotaErrorOnKeys.has(key)) {
      const err = new Error("QuotaExceededError: DOM storage limit reached");
      err.name = "QuotaExceededError";
      err.code = 22;
      throw err;
    }
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
    this.quotaErrorOnKeys.clear();
    this.throwGenericError = false;
  }
}

const mockStorage = new MockLocalStorage();
global.window = global;
global.localStorage = mockStorage;
global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type;
    this.detail = eventInitDict?.detail;
  }
};
global.dispatchEvent = () => true;

// Load TypeScript modules via jiti
const jiti = require("jiti")(__dirname);
const classService = jiti("./src/lib/services/class-service.ts");
const marketplaceService = jiti("./src/lib/services/marketplace-service.ts");
const zeroPii = jiti("./src/lib/firebase/zero-pii.ts");

console.log("================================================================================");
console.log("POCKETPOT ADVERSARIAL STRESS & CURRENCY INTEGRITY TEST SUITE");
console.log("================================================================================\n");

let passedCount = 0;
let totalCount = 0;

function runAdversarialTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] Test ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalCount}: ${name}`);
    console.error(`       Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split("\n").slice(1, 4).join("\n"));
    }
  }
}

// -----------------------------------------------------------------------------------------
// SECTION 1: TRANSACTION PRUNING & QUOTA STRESS HARNESS
// -----------------------------------------------------------------------------------------
console.log("--- Section 1: Transaction Pruning & Quota Safety ---");

runAdversarialTest("saveTransactions: 2,000 transactions capped strictly to 1,000", () => {
  mockStorage.clear();
  const txs = [];
  const baseTime = Date.now() - 2000 * 60000;

  for (let i = 0; i < 2000; i++) {
    txs.push({
      transactionId: `tx-cap-${i}`,
      pupilId: `pupil-${i % 20}`,
      classId: "class-year-4-teal",
      title: `Transaction ${i}`,
      deltaCents: 50,
      type: "reward",
      category: "income",
      nonPunitiveNote: `Test note ${i}`,
      timestamp: new Date(baseTime + i * 60000).toISOString(),
    });
  }

  classService.saveTransactions(txs);

  const rawSaved = mockStorage.getItem("pocketpot_transactions_v1");
  assert.ok(rawSaved, "Transactions must be saved in localStorage");
  const saved = JSON.parse(rawSaved);

  assert.strictEqual(saved.length, 1000, `Expected exactly 1,000 transactions, received ${saved.length}`);
});

runAdversarialTest("saveTransactions: preserves newest 1,000 by timestamp in descending order", () => {
  mockStorage.clear();
  const txs = [];
  const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();

  // Create 2,000 transactions in randomized order
  for (let i = 0; i < 2000; i++) {
    txs.push({
      transactionId: `tx-order-${i}`,
      pupilId: `pupil-${i % 10}`,
      classId: "class-year-4-teal",
      title: `Transaction ${i}`,
      deltaCents: 100,
      type: "allowance",
      category: "income",
      nonPunitiveNote: `Test entry ${i}`,
      // index 1999 is newest, index 0 is oldest
      timestamp: new Date(baseTime + i * 3600000).toISOString(),
    });
  }

  // Shuffle input to simulate un-ordered arrival
  const shuffled = [...txs].sort(() => Math.random() - 0.5);

  classService.saveTransactions(shuffled);

  const saved = JSON.parse(mockStorage.getItem("pocketpot_transactions_v1"));
  assert.strictEqual(saved.length, 1000, "Must be capped at 1,000");

  // Verify descending sort
  for (let j = 0; j < saved.length - 1; j++) {
    const current = new Date(saved[j].timestamp).getTime();
    const next = new Date(saved[j + 1].timestamp).getTime();
    assert.ok(
      current >= next,
      `Saved transactions must be sorted descending: index ${j} (${saved[j].timestamp}) vs index ${j+1} (${saved[j+1].timestamp})`
    );
  }

  // Verify the saved entries are strictly the newest 1,000 (indices 1000 to 1999)
  const savedIds = new Set(saved.map((t) => t.transactionId));
  for (let i = 1000; i < 2000; i++) {
    assert.ok(
      savedIds.has(`tx-order-${i}`),
      `Expected newest transaction tx-order-${i} to be retained in saved transactions`
    );
  }
  for (let i = 0; i < 1000; i++) {
    assert.ok(
      !savedIds.has(`tx-order-${i}`),
      `Expected older transaction tx-order-${i} to be pruned`
    );
  }
});

runAdversarialTest("saveTransactions: deduplicates transaction IDs across 2,000 entries", () => {
  mockStorage.clear();
  const txs = [];
  const baseTime = Date.now();

  // 500 distinct IDs, each repeated 4 times with varying timestamps = 2,000 items
  for (let dup = 0; dup < 4; dup++) {
    for (let id = 0; id < 500; id++) {
      txs.push({
        transactionId: `tx-dedup-${id}`,
        pupilId: "pupil-1",
        classId: "class-year-4-teal",
        title: `Dedup ${id} (copy ${dup})`,
        deltaCents: 25,
        type: "bonus",
        category: "income",
        nonPunitiveNote: `Dedup test`,
        timestamp: new Date(baseTime - (dup * 500 + id) * 1000).toISOString(),
      });
    }
  }

  assert.strictEqual(txs.length, 2000, "Input must have 2,000 entries");
  classService.saveTransactions(txs);

  const saved = JSON.parse(mockStorage.getItem("pocketpot_transactions_v1"));
  assert.strictEqual(saved.length, 500, `All duplicate IDs must be deduplicated: expected 500, got ${saved.length}`);

  const idSet = new Set(saved.map((t) => t.transactionId));
  assert.strictEqual(idSet.size, saved.length, "Saved list must contain zero duplicate transaction IDs");
});

runAdversarialTest("saveTransactions: duplicate ID timestamp precedence behavior analysis", () => {
  mockStorage.clear();
  // Adversarial case: Duplicate ID where older timestamp appears BEFORE newer timestamp
  const olderTx = {
    transactionId: "tx-dup-precedence",
    pupilId: "p1",
    classId: "class-year-4-teal",
    title: "Older version of duplicate",
    deltaCents: 10,
    type: "reward",
    category: "income",
    nonPunitiveNote: "Older",
    timestamp: "2026-01-01T10:00:00.000Z",
  };
  const newerTx = {
    transactionId: "tx-dup-precedence",
    pupilId: "p1",
    classId: "class-year-4-teal",
    title: "Newer version of duplicate",
    deltaCents: 10,
    type: "reward",
    category: "income",
    nonPunitiveNote: "Newer",
    timestamp: "2026-06-01T10:00:00.000Z",
  };

  // Test standard application pattern: newer transaction prepended [newerTx, olderTx]
  classService.saveTransactions([newerTx, olderTx]);
  const savedPrepended = JSON.parse(mockStorage.getItem("pocketpot_transactions_v1"));
  assert.strictEqual(savedPrepended.length, 1);
  assert.strictEqual(
    savedPrepended[0].timestamp,
    "2026-06-01T10:00:00.000Z",
    "Prepending newer transaction preserves the newer timestamp"
  );

  // Test inverted pattern: [olderTx, newerTx]
  classService.saveTransactions([olderTx, newerTx]);
  const savedInverted = JSON.parse(mockStorage.getItem("pocketpot_transactions_v1"));
  assert.strictEqual(savedInverted.length, 1);
  // Note: pruneTransactions iterates txs before sorting, keeping first seen ID
  const keptTimestamp = savedInverted[0].timestamp;
  console.log(`       [Adversarial Note] Inverted order [older, newer] preserved: ${keptTimestamp} (${keptTimestamp === newerTx.timestamp ? "newer" : "older (first-seen)"})`);
});

runAdversarialTest("saveTransactions: extreme edge case: 2,000 entries with identical ID collapses to 1", () => {
  mockStorage.clear();
  const txs = [];
  const now = Date.now();
  for (let i = 0; i < 2000; i++) {
    txs.push({
      transactionId: "constant-duplicate-id",
      pupilId: "pupil-1",
      classId: "class-year-4-teal",
      title: "Identical",
      deltaCents: 10,
      type: "reward",
      category: "income",
      nonPunitiveNote: "Note",
      timestamp: new Date(now - i * 1000).toISOString(),
    });
  }

  classService.saveTransactions(txs);
  const saved = JSON.parse(mockStorage.getItem("pocketpot_transactions_v1"));
  assert.strictEqual(saved.length, 1, `Collapsed count must be 1, got ${saved.length}`);
  assert.strictEqual(saved[0].transactionId, "constant-duplicate-id");
});

runAdversarialTest("saveTransactions: QuotaExceededError triggers graceful fallback to 300 entries", () => {
  mockStorage.clear();
  const txs = [];
  const baseTime = Date.now();

  for (let i = 0; i < 2000; i++) {
    txs.push({
      transactionId: `tx-quota-${i}`,
      pupilId: `pupil-${i % 5}`,
      classId: "class-year-4-teal",
      title: `Quota Tx ${i}`,
      deltaCents: 50,
      type: "reward",
      category: "income",
      nonPunitiveNote: `Quota test note ${i}`,
      timestamp: new Date(baseTime + i * 1000).toISOString(),
    });
  }

  // Intercept setItem to throw QuotaExceededError on the first attempt (1,000 entries),
  // but succeed on the second attempt (fallback 300 entries).
  let attempts = 0;
  const originalSetItem = mockStorage.setItem.bind(mockStorage);
  mockStorage.setItem = (key, val) => {
    if (key === "pocketpot_transactions_v1") {
      attempts++;
      if (attempts === 1) {
        const parsed = JSON.parse(val);
        assert.strictEqual(parsed.length, 1000, "First attempt must try saving 1,000 entries");
        const quotaErr = new Error("QuotaExceededError: Storage quota exceeded");
        quotaErr.name = "QuotaExceededError";
        quotaErr.code = 22;
        throw quotaErr;
      }
    }
    return originalSetItem(key, val);
  };

  // Must not throw an unhandled exception
  assert.doesNotThrow(() => {
    classService.saveTransactions(txs);
  }, "saveTransactions must not throw unhandled error on QuotaExceededError");

  // Restore setItem
  mockStorage.setItem = originalSetItem;

  assert.strictEqual(attempts, 2, "Expected exactly 2 setItem attempts (1 full + 1 fallback)");

  const saved = JSON.parse(mockStorage.getItem("pocketpot_transactions_v1"));
  assert.strictEqual(saved.length, 300, `Fallback window must save exactly 300 entries, received ${saved.length}`);

  // Verify that the 300 entries are the 300 newest of the 2,000 (indices 1700 to 1999)
  const savedIds = new Set(saved.map((t) => t.transactionId));
  for (let i = 1700; i < 2000; i++) {
    assert.ok(
      savedIds.has(`tx-quota-${i}`),
      `Expected newest transaction tx-quota-${i} in quota fallback window`
    );
  }
  for (let i = 0; i < 1700; i++) {
    assert.ok(
      !savedIds.has(`tx-quota-${i}`),
      `Expected older transaction tx-quota-${i} to be pruned in quota fallback`
    );
  }
});

runAdversarialTest("saveTransactions: QuotaExceededError on fallback also does not crash process", () => {
  mockStorage.clear();
  const txs = [];
  for (let i = 0; i < 500; i++) {
    txs.push({
      transactionId: `tx-hard-fail-${i}`,
      pupilId: "pupil-1",
      classId: "class-year-4-teal",
      title: "Hard fail",
      deltaCents: 10,
      type: "reward",
      category: "income",
      nonPunitiveNote: "Note",
      timestamp: new Date().toISOString(),
    });
  }

  // Always throw QuotaExceededError
  const originalSetItem = mockStorage.setItem.bind(mockStorage);
  mockStorage.setItem = () => {
    const quotaErr = new Error("QuotaExceededError: Permanent limit");
    quotaErr.name = "QuotaExceededError";
    quotaErr.code = 22;
    throw quotaErr;
  };

  assert.doesNotThrow(() => {
    classService.saveTransactions(txs);
  }, "saveTransactions must handle catastrophic persistent storage quota failure gracefully");

  mockStorage.setItem = originalSetItem;
});

runAdversarialTest("saveTransactions: Generic storage error (non-quota) caught gracefully", () => {
  mockStorage.clear();
  const txs = [
    {
      transactionId: "tx-err-1",
      pupilId: "p1",
      classId: "c1",
      title: "Error test",
      deltaCents: 10,
      type: "reward",
      category: "income",
      nonPunitiveNote: "Note",
      timestamp: new Date().toISOString(),
    },
  ];

  mockStorage.throwGenericError = true;
  assert.doesNotThrow(() => {
    classService.saveTransactions(txs);
  }, "saveTransactions must not throw on generic storage error");
  mockStorage.throwGenericError = false;
});

// -----------------------------------------------------------------------------------------
// SECTION 2: REAL CASH CURRENCY STANDARD AUDIT & VALIDATION
// -----------------------------------------------------------------------------------------
console.log("\n--- Section 2: Real Cash Currency Standard Audit & Validation ---");

runAdversarialTest("Codebase scan: zero active priceCoins references across src/", () => {
  const srcDir = path.join(__dirname, "src");

  function getFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFiles(fullPath));
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allFiles = getFiles(srcDir);
  const violations = [];

  for (const file of allFiles) {
    const relative = path.relative(__dirname, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      if (line.includes("priceCoins")) {
        // Allowed ONLY in marketplace-service.ts for legacy fallback getter
        if (
          relative === "src/lib/services/marketplace-service.ts" &&
          line.includes("(item as any).priceCoins")
        ) {
          // Permitted backward-compatibility fallback
          return;
        }
        violations.push(`${relative}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found unauthorized active priceCoins references in src/:\n${violations.join("\n")}`
  );
});

runAdversarialTest("formatCurrency: accurately formats boundary pence values in GBP format", () => {
  const { formatCurrency } = zeroPii;

  assert.strictEqual(formatCurrency(0), "£0.00", "0p must be formatted as £0.00");
  assert.strictEqual(formatCurrency(1), "£0.01", "1p must be formatted as £0.01");
  assert.strictEqual(formatCurrency(9), "£0.09", "9p must be formatted as £0.09");
  assert.strictEqual(formatCurrency(10), "£0.10", "10p must be formatted as £0.10");
  assert.strictEqual(formatCurrency(50), "£0.50", "50p must be formatted as £0.50");
  assert.strictEqual(formatCurrency(75), "£0.75", "75p must be formatted as £0.75");
  assert.strictEqual(formatCurrency(99), "£0.99", "99p must be formatted as £0.99");
  assert.strictEqual(formatCurrency(100), "£1.00", "100p must be formatted as £1.00");
  assert.strictEqual(formatCurrency(150), "£1.50", "150p must be formatted as £1.50");
  assert.strictEqual(formatCurrency(250), "£2.50", "250p must be formatted as £2.50");
  assert.strictEqual(formatCurrency(500), "£5.00", "500p must be formatted as £5.00");
  assert.strictEqual(formatCurrency(10000), "£100.00", "10000p must be formatted as £100.00");

  // Negative values (debits / spends)
  assert.strictEqual(formatCurrency(-50), "-£0.50", "-50p must be formatted as -£0.50");
  assert.strictEqual(formatCurrency(-150), "-£1.50", "-150p must be formatted as -£1.50");
  assert.strictEqual(formatCurrency(-300), "-£3.00", "-300p must be formatted as -£3.00");
});

runAdversarialTest("DEFAULT_MARKETPLACE_REWARDS: all rewards use positive integer pricePence", () => {
  const { DEFAULT_MARKETPLACE_REWARDS } = marketplaceService;
  const { formatCurrency } = zeroPii;

  assert.ok(
    Array.isArray(DEFAULT_MARKETPLACE_REWARDS) && DEFAULT_MARKETPLACE_REWARDS.length > 0,
    "DEFAULT_MARKETPLACE_REWARDS must exist and contain items"
  );

  DEFAULT_MARKETPLACE_REWARDS.forEach((reward, i) => {
    assert.strictEqual(
      typeof reward.pricePence,
      "number",
      `Reward ${i} ("${reward.title}") must have numeric pricePence`
    );
    assert.ok(
      Number.isInteger(reward.pricePence) && reward.pricePence > 0,
      `Reward ${i} pricePence must be a positive integer in pence, received ${reward.pricePence}`
    );
    assert.strictEqual(
      (reward).priceCoins,
      undefined,
      `Reward ${i} must NOT contain priceCoins property`
    );

    const formatted = formatCurrency(reward.pricePence);
    assert.ok(
      formatted.startsWith("£"),
      `Reward ${i} formatted currency must start with £, got ${formatted}`
    );
  });
});

runAdversarialTest("marketplaceService: backward-compatible deserialization of legacy priceCoins rewards", () => {
  mockStorage.clear();
  // Simulate legacy stored rewards with priceCoins instead of pricePence
  const legacyRewards = [
    {
      rewardId: "rew-legacy-1",
      classId: "class-year-4-teal",
      title: "Legacy Golden Ticket",
      description: "Legacy reward description",
      priceCoins: 350, // Legacy field
      icon: "🎫",
      tier: "long_term",
      purchasesCount: 2,
      isAvailable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  mockStorage.setItem("pocketpot_marketplace_rewards_v2", JSON.stringify(legacyRewards));

  const retrieved = marketplaceService.getSavedRewards("class-year-4-teal");
  assert.strictEqual(retrieved.length, 1);
  assert.strictEqual(retrieved[0].pricePence, 350, "Legacy priceCoins (350) must map to pricePence (350)");
  assert.strictEqual(zeroPii.formatCurrency(retrieved[0].pricePence), "£3.50");
});

runAdversarialTest("marketplaceService: backward-compatible deserialization of legacy priceCoins purchases", () => {
  mockStorage.clear();
  // Simulate legacy stored purchases with priceCoins
  const legacyPurchases = [
    {
      purchaseId: "purch-legacy-1",
      rewardId: "rew-legacy-1",
      rewardTitle: "Legacy Reward",
      rewardIcon: "🎫",
      priceCoins: 275, // Legacy field
      classId: "class-year-4-teal",
      pupilId: "pupil-legacy-1",
      pupilCodename: "Brave Otter #101",
      status: "pending",
      purchasedAt: new Date().toISOString(),
    },
  ];
  mockStorage.setItem("pocketpot_marketplace_purchases_v2", JSON.stringify(legacyPurchases));

  const retrieved = marketplaceService.getSavedPurchases("class-year-4-teal");
  assert.strictEqual(retrieved.length, 1);
  assert.strictEqual(retrieved[0].pricePence, 275, "Legacy purchase priceCoins (275) must map to pricePence (275)");
  assert.strictEqual(zeroPii.formatCurrency(retrieved[0].pricePence), "£2.75");
});

runAdversarialTest("Full purchase and refund lifecycle operates purely on pricePence in real cash", () => {
  mockStorage.clear();
  const pupilId = "pupil-test-cash-1";
  const classId = "class-year-4-teal";

  // Setup test pupil with £10.00 (1000 cents) balance
  const pupil = {
    pupilId,
    classId,
    deskBadgeNumber: 1,
    educationalCodename: "Sunny Beaver #42",
    mainBalanceCents: 1000,
    totalSavedCents: 0,
    activePotsCount: 0,
    anonymized: true,
    cardLastFour: "5555",
    pinNumber: "5555",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  classService.savePupils([pupil]);

  // Setup test reward with pricePence = 250 (£2.50)
  const reward = {
    rewardId: "rew-cash-test",
    classId,
    title: "Classroom DJ Pass",
    description: "Choose tidy-up music",
    pricePence: 250,
    icon: "🎵",
    tier: "short_term",
    purchasesCount: 0,
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  marketplaceService.saveRewards([reward]);

  // 1. Purchase reward
  const purchaseResult = marketplaceService.purchaseReward(pupilId, reward.rewardId);
  assert.ok(purchaseResult.success, `Purchase should succeed: ${purchaseResult.error}`);
  assert.ok(purchaseResult.purchase, "Purchase document must be returned");
  assert.strictEqual(purchaseResult.purchase.pricePence, 250, "Purchase pricePence must be 250");

  // Verify pupil balance deducted by 250 (1000 -> 750)
  const pupilsAfterBuy = classService.getSavedPupils();
  const updatedPupil = pupilsAfterBuy.find((p) => p.pupilId === pupilId);
  assert.strictEqual(updatedPupil.mainBalanceCents, 750, "Pupil balance must be 750 after £2.50 purchase");

  // Verify ledger entry
  const txs = classService.getSavedTransactions();
  const buyTx = txs.find((t) => t.type === "marketplace_purchase");
  assert.ok(buyTx, "Marketplace purchase ledger entry must be recorded");
  assert.strictEqual(buyTx.deltaCents, -250, "Ledger deltaCents must be -250");
  assert.ok(buyTx.nonPunitiveNote.includes("£2.50"), "Ledger note must reference £2.50");

  // 2. Refund purchase without explicit reason (tests default microcopy with formatCurrency)
  const refundResult = marketplaceService.refundPurchase(purchaseResult.purchase.purchaseId);
  assert.ok(refundResult.success, `Refund should succeed: ${refundResult.error}`);

  // Verify pupil balance restored to 1000
  const pupilsAfterRefund = classService.getSavedPupils();
  const refundedPupil = pupilsAfterRefund.find((p) => p.pupilId === pupilId);
  assert.strictEqual(refundedPupil.mainBalanceCents, 1000, "Pupil balance must be restored to 1000 after refund");

  // Verify refund ledger entry uses formatCurrency
  const txsAfterRefund = classService.getSavedTransactions();
  const refundTx = txsAfterRefund.find((t) => t.type === "marketplace_refund");
  assert.ok(refundTx, "Marketplace refund ledger entry must be recorded");
  assert.strictEqual(refundTx.deltaCents, 250, "Ledger deltaCents must be +250");
  assert.ok(
    refundTx.nonPunitiveNote.includes("£2.50"),
    `Ledger note must reference £2.50, got "${refundTx.nonPunitiveNote}"`
  );
});

runAdversarialTest("createPotForReward sets targetAmountCents equal to reward.pricePence", () => {
  mockStorage.clear();
  const reward = {
    rewardId: "rew-expensive",
    classId: "class-year-4-teal",
    title: "VIP Pizza Party",
    description: "End of term celebration",
    pricePence: 1500, // £15.00
    icon: "🍕",
    tier: "long_term",
    purchasesCount: 0,
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pot = marketplaceService.createPotForReward("pupil-1", "class-year-4-teal", reward);
  assert.ok(pot, "Pot must be created");
  assert.strictEqual(
    pot.targetAmountCents,
    1500,
    `Target amount cents (${pot.targetAmountCents}) must equal reward.pricePence (1500)`
  );
  assert.strictEqual(zeroPii.formatCurrency(pot.targetAmountCents), "£15.00");
});

// -----------------------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`STRESS & CURRENCY TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
console.log("================================================================================\n");

if (passedCount !== totalCount) {
  process.exit(1);
}
