import { LRUCache } from "lru-cache";

interface CacheEntry {
  data: any;
  timestamp: number;
}

class SimpleCache {
  private cache: LRUCache<string, CacheEntry>;
  private ttl: number;

  constructor(maxSize = 100, ttlMinutes = 30) {
    this.cache = new LRUCache<string, CacheEntry>({
      max: maxSize,
    });
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Create a global cache instance
export const cache = new SimpleCache(100, 30); // 100 entries, 30 minutes TTL

// Helper function to generate cache keys
export function generateCacheKey(type: string, ...parts: string[]): string {
  return `${type}:${parts.join(":")}`;
}
