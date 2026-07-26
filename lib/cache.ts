import { revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  categories: "menu-categories",
  items: "menu-items",
  outlets: "outlets",
  users: "users",
  dashboard: "dashboard-summary",
} as const;

export type CacheStrategyOptions = { ttl?: number; swr?: number; tags?: string[] };

export const CACHE_STRATEGIES: Record<string, CacheStrategyOptions> = {
  /** Static reference data (1 hour TTL, 5 min SWR) */
  static: { ttl: 3600, swr: 300 },
  /** Catalog & Reference data (5 min TTL, 1 min SWR) */
  standard: { ttl: 300, swr: 60 },
  /** Fast changing listing / users (3 min TTL, 30s SWR) */
  short: { ttl: 180, swr: 30 },
  /** Dashboard & Real-time analytics (1 min TTL, 30s SWR) */
  dashboard: { ttl: 60, swr: 30 },
};

/**
 * Safely purge Next.js Data Cache tags
 */
export function purgeCacheTag(tag: keyof typeof CACHE_TAGS | (string & {})) {
  try {
    const tagName = CACHE_TAGS[tag as keyof typeof CACHE_TAGS] || tag;
    (revalidateTag as any)(tagName);
  } catch (error) {
    // revalidateTag may throw if called outside a request context (e.g. scripts/seed)
    console.warn(`[Cache] Revalidation skipped for tag "${tag}":`, error);
  }
}
