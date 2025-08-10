// Calendar Event Cache System
// Improves performance by caching Firebase queries

class CalendarEventCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
    this.debugMode = false;
  }

  // Generate unique cache key
  generateKey(collection, serviceId, startDate, endDate) {
    const start = startDate instanceof Date ? startDate.toISOString() : startDate;
    const end = endDate instanceof Date ? endDate.toISOString() : endDate;
    return `${collection}:${serviceId}:${start}:${end}`;
  }

  // Set cache entry
  set(key, data) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
      expiresAt: expiresAt,
      hits: 0
    });
    
    if (this.debugMode) {
      console.log(`[Cache] Stored: ${key}, expires in ${this.ttl/1000}s`);
    }
  }

  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.debugMode) console.log(`[Cache] Miss: ${key}`);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.debugMode) console.log(`[Cache] Expired: ${key}`);
      return null;
    }

    // Update hit count
    entry.hits++;
    
    if (this.debugMode) {
      console.log(`[Cache] Hit: ${key} (${entry.hits} hits)`);
    }
    
    return entry.data;
  }

  // Clear specific service cache
  clearService(serviceId) {
    const keysToDelete = [];
    
    for (const [key, _] of this.cache) {
      if (key.includes(`:${serviceId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (this.debugMode) {
      console.log(`[Cache] Cleared ${keysToDelete.length} entries for service ${serviceId}`);
    }
  }

  // Clear all cache
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    
    if (this.debugMode) {
      console.log(`[Cache] Cleared all ${size} entries`);
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      size: this.cache.size,
      entries: []
    };

    for (const [key, entry] of this.cache) {
      stats.entries.push({
        key: key,
        hits: entry.hits,
        age: Date.now() - entry.timestamp,
        expiresIn: entry.expiresAt - Date.now()
      });
    }

    return stats;
  }

  // Automatic cleanup of expired entries
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (this.debugMode && keysToDelete.length > 0) {
      console.log(`[Cache] Cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  // Enable/disable debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

// Cached Firebase query wrapper
class CachedFirebaseQuery {
  constructor(db, cache) {
    this.db = db;
    this.cache = cache;
  }

  async getAppointments(serviceId, startDate, endDate) {
    const cacheKey = this.cache.generateKey('appointments', serviceId, startDate, endDate);
    
    // Check cache first
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, query Firebase
    try {
      const snapshot = await this.db.collection('appointments')
        .where('serviceId', '==', serviceId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date')
        .get();

      const appointments = [];
      snapshot.forEach(doc => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Cache the results
      this.cache.set(cacheKey, appointments);
      
      return appointments;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  }

  async getClassSchedules(serviceId, startDate, endDate) {
    const cacheKey = this.cache.generateKey('classSchedules', serviceId, startDate, endDate);
    
    // Check cache first
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, query Firebase
    try {
      const snapshot = await this.db.collection('classSchedules')
        .where('serviceId', '==', serviceId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date')
        .get();

      const schedules = [];
      snapshot.forEach(doc => {
        schedules.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Cache the results
      this.cache.set(cacheKey, schedules);
      
      return schedules;
    } catch (error) {
      console.error('Error fetching class schedules:', error);
      throw error;
    }
  }

  // Invalidate cache when data changes
  invalidateServiceCache(serviceId) {
    this.cache.clearService(serviceId);
  }

  // Force refresh - bypasses cache
  async forceRefresh(queryFn, ...args) {
    // Execute query without checking cache
    const result = await queryFn.apply(this, args);
    return result;
  }
}

// Initialize global cache instance
window.calendarEventCache = new CalendarEventCache();
window.cachedFirebaseQuery = new CachedFirebaseQuery(db, window.calendarEventCache);

// Auto cleanup expired entries every minute
setInterval(() => {
  window.calendarEventCache.cleanup();
}, 60000);

// Log cache stats in development
if (window.location.hostname === 'localhost') {
  window.calendarEventCache.setDebugMode(true);
  
  // Add console command for cache stats
  window.showCacheStats = () => {
    const stats = window.calendarEventCache.getStats();
    console.table(stats.entries);
    console.log(`Total cache entries: ${stats.size}`);
  };
}

console.log('Calendar cache system initialized');