import { apiCache } from './apiCache';

/**
 * Cache utility functions for manual cache management
 */

export const cacheUtils = {
    /**
     * Clear all cache
     */
    clearAll: () => {
        apiCache.clear();
        console.log('All API cache cleared');
    },

    /**
     * Clear cache for specific endpoint pattern
     */
    clearPattern: (pattern: string) => {
        apiCache.removePattern(pattern);
        console.log(`Cache cleared for pattern: ${pattern}`);
    },

    /**
     * Clear schedule-related cache
     */
    clearScheduleCache: () => {
        apiCache.removePattern('/schedules');
        console.log('Schedule cache cleared');
    },

    /**
     * Clear attendance-related cache
     */
    clearAttendanceCache: () => {
        apiCache.removePattern('/attendance');
        console.log('Attendance cache cleared');
    },

    /**
     * Clear user-related cache
     */
    clearUserCache: () => {
        apiCache.removePattern('/users');
        console.log('User cache cleared');
    },

    /**
     * Get cache statistics
     */
    getStats: () => {
        return apiCache.getStats();
    },

    /**
     * Run cache cleanup (remove expired entries)
     */
    cleanup: () => {
        apiCache.cleanup();
        console.log('Cache cleanup completed');
    },
};

// Export for global access (useful for debugging)
if (typeof window !== 'undefined') {
    (window as unknown as { cacheUtils: typeof cacheUtils }).cacheUtils = cacheUtils;
}

export default cacheUtils;
