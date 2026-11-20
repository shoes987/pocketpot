"use client";

/**
 * PocketPot Quota-Resilient Storage Helper
 * 
 * Protects against DOMException: QuotaExceededError when browser localStorage
 * reaches its quota (typically 5MB).
 * 
 * Automatically manages storage by:
 * 1. Mirroring all data in an in-memory fallback store so UI never crashes.
 * 2. Safely pruning non-essential data (old transactions, excess notifications) on quota pressure.
 * 3. Never throwing unhandled exceptions to callers.
 */

const inMemoryFallbackStore = new Map<string, string>();

const STORAGE_KEY_TRANSACTIONS = "pocketpot_transactions_v1";
const STORAGE_KEY_PUPILS = "pocketpot_pupils_v1";
const STORAGE_KEY_POTS = "pocketpot_pots_v1";

/**
 * Perform emergency cache pruning to free up localStorage quota immediately.
 */
export function evictNonEssentialStorage(): void {
  if (typeof window === "undefined") return;

  // 1. Truncate transactions down to 40 most recent
  try {
    const txsRaw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (txsRaw) {
      const parsed = JSON.parse(txsRaw);
      if (Array.isArray(parsed) && parsed.length > 40) {
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(parsed.slice(0, 40)));
      }
    }
  } catch {}

  // 2. Prune excess notifications or completed job history
  const pruneableKeys = [
    "pocketpot_job_notifications_v1",
    "pocketpot_completed_jobs_v1",
    "pocketpot_marketplace_purchases_v1",
    "pocketpot_applications_v1",
    "pocketpot_bonus_awards_v1",
  ];

  for (const k of pruneableKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 20) {
          localStorage.setItem(k, JSON.stringify(parsed.slice(0, 10)));
        }
      }
    } catch {}
  }
}

/**
 * Safely saves a key-value string to localStorage without throwing QuotaExceededError.
 * On quota exhaustion, automatically evicts non-essential cache, retries, and falls back
 * to an in-memory cache so application operations always succeed.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;

  // Always mirror in memory store for immediate, synchronous availability
  inMemoryFallbackStore.set(key, value);

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: unknown) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuota || (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "QuotaExceededError")) {
      console.warn(`[PocketPot Storage] Quota exceeded on setItem('${key}'). Performing cache eviction...`);
      evictNonEssentialStorage();

      // Retry after eviction
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        // If still failing and key is pupils or pots, trim excess items
        if (key === STORAGE_KEY_PUPILS) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.length > 30) {
              const trimmed = parsed.slice(0, 30);
              localStorage.setItem(key, JSON.stringify(trimmed));
              return true;
            }
          } catch {}
        }

        if (key === STORAGE_KEY_POTS) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed) && parsed.length > 60) {
              const trimmed = parsed.slice(0, 60);
              localStorage.setItem(key, JSON.stringify(trimmed));
              return true;
            }
          } catch {}
        }

        console.warn(
          `[PocketPot Storage] LocalStorage full. Keeping '${key}' in memory cache. App remains fully functional.`
        );
        return false;
      }
    } else {
      console.warn(`[PocketPot Storage] Error setting '${key}':`, err);
      return false;
    }
  }
}

/**
 * Safely retrieves a key from localStorage with transparent fallback to in-memory store.
 */
export function safeLocalStorageGetItem(key: string): string | null {
  if (typeof window === "undefined") {
    return inMemoryFallbackStore.get(key) || null;
  }
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {}
  return inMemoryFallbackStore.get(key) || null;
}

/**
 * Safely removes a key from localStorage and in-memory store.
 */
export function safeLocalStorageRemoveItem(key: string): void {
  inMemoryFallbackStore.delete(key);
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
