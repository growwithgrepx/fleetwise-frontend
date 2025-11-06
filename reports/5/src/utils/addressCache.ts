// Address Cache Management Utility
export interface CacheEntry {
  result: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export class AddressCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly expiryMs: number;

  constructor(maxSize = 100, expiryMs = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.expiryMs = expiryMs;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > this.expiryMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.result;
  }

  set(key: string, result: any): void {
    const now = Date.now();
    
    // Clean up before adding if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.cleanup();
    }

    this.cache.set(key, {
      result,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > this.expiryMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries first
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.expiryMs) {
        this.cache.delete(key);
      }
    });

    // If still over capacity, remove least recently used entries
    if (this.cache.size > this.maxSize) {
      const remaining = Array.from(this.cache.entries());
      remaining.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      const toRemove = remaining.slice(0, this.cache.size - this.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      averageAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length / 1000 / 60 // in minutes
        : 0,
      oldestEntry: entries.length > 0 
        ? Math.max(...entries.map(entry => now - entry.timestamp)) / 1000 / 60 // in minutes
        : 0,
      hitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    // For now, return a placeholder
    return 0;
  }

  // Preload frequently used postal codes
  preload(postalCodes: string[], lookupFunction: (code: string) => Promise<any>): Promise<void[]> {
    const promises = postalCodes
      .filter(code => !this.has(`sg:${code}`))
      .map(async (code) => {
        try {
          const result = await lookupFunction(code);
          if (result) {
            this.set(`sg:${code}`, result);
          }
        } catch (error) {
          console.warn(`Failed to preload postal code ${code}:`, error);
        }
      });

    return Promise.all(promises);
  }
}

// Note: Global instance deprecated in favor of context-based caching
// Use AddressCacheProvider and useAddressCache hook instead
// export const globalAddressCache = new AddressCache();

// Cache performance monitoring - now requires cache instance
export const logCachePerformance = (cache: AddressCache) => {
  const stats = cache.getStats();
  console.log('[AddressCache] Performance Stats:', {
    ...stats,
    memoryUsageApprox: `${(stats.size * 200 / 1024).toFixed(2)} KB` // Rough estimate
  });
};

// Utility to warm up cache with common Singapore postal codes - now requires cache instance
export const warmUpCache = async (cache: AddressCache, lookupFunction: (code: string) => Promise<any>) => {
  const commonPostalCodes = [
    '018989', // Raffles Place
    '039594', // Marina Bay
    '018956', // CBD
    '228208', // Orchard
    '307506', // Jurong East
    '730090', // Tampines
    '560090', // Toa Payoh
    '310090'  // Bedok
  ];

  console.log('[AddressCache] Warming up cache with common postal codes...');
  await cache.preload(commonPostalCodes, lookupFunction);
  logCachePerformance(cache);
};