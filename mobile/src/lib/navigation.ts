/**
 * Navigation helpers that live outside `src/app/` so screens stay declarative.
 */
import { router, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * A back handler that always goes somewhere.
 *
 * `router.back()` is a silent no-op when the stack has nothing to pop — on web
 * that happens after a refresh or when a route is opened directly, which leaves
 * the nav header's chevron looking broken. Every screen that shows a back
 * affordance passes the parent it logically belongs to, so a missing history
 * entry degrades into a sensible jump instead of a dead button.
 */
export function useGoBack(fallback: Href): () => void {
    return useCallback(() => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace(fallback);
    }, [fallback]);
}
