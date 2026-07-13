import { lazy, type ComponentType } from 'react';

/**
 * A helper to wrap React.lazy with retry logic for dynamic imports.
 * This handles the "Failed to fetch dynamically imported module" error
 * which often occurs when a new version is deployed or the dev server restarts.
 */
export const lazyLoad = (importFn: () => Promise<{ default: ComponentType<any> }>) => {
    return lazy(async () => {
        try {
            return await importFn();
        } catch (error) {
            console.error('Initial load failed, retrying...', error);

            // Check if we've already tried to reload the page in this session
            const hasRefreshed = sessionStorage.getItem('page-refreshed-on-error');

            if (!hasRefreshed) {
                sessionStorage.setItem('page-refreshed-on-error', 'true');
                window.location.reload();
                // Return a promise that never resolves while the page is reloading
                return new Promise(() => { });
            }

            // If we already refreshed once and it still fails, throw the error
            throw error;
        }
    });
};
