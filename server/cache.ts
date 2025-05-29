
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries before returning size
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Auto-cleanup every 10 minutes
  startCleanupTimer(): void {
    setInterval(() => {
      this.cleanExpired();
    }, 10 * 60 * 1000);
  }
}

export const analysisCache = new InMemoryCache();
export const botMoveCache = new InMemoryCache();

// Start cleanup timers
analysisCache.startCleanupTimer();
botMoveCache.startCleanupTimer();

// Helper functions to generate cache keys
export function generateAnalysisCacheKey(fen: string, depth: number): string {
  return `analysis:${fen}:${depth}`;
}

export function generateBotMoveCacheKey(fen: string, level: number): string {
  return `botmove:${fen}:${level}`;
}
