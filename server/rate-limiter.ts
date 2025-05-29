
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(clientId);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(clientId: string): number {
    const entry = this.requests.get(clientId);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(clientId: string): number {
    const entry = this.requests.get(clientId);
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs;
    }
    return entry.resetTime;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [clientId, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(clientId);
      }
    }
  }
}

// Different rate limiters for different endpoints
export const generalLimiter = new RateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes
export const stockfishLimiter = new RateLimiter(20, 60 * 1000); // 20 requests per minute for Stockfish
export const gameLimiter = new RateLimiter(50, 60 * 1000); // 50 game operations per minute

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (req: any, res: any, next: any) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!limiter.isAllowed(clientId)) {
      const resetTime = limiter.getResetTime(clientId);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      res.status(429).json({
        message: 'Too many requests',
        retryAfter,
        resetTime: new Date(resetTime).toISOString()
      });
      return;
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Remaining': limiter.getRemainingRequests(clientId).toString(),
      'X-RateLimit-Reset': limiter.getResetTime(clientId).toString()
    });

    next();
  };
}
