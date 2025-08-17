import { useEffect } from 'react';

/** Prefetch side-effects (e.g., fetch discount codes) once user hovers/focuses cart button */
export function usePrefetchCartDrawer(ref, onPrefetch) {
  useEffect(() => {
    if (!ref?.current) return;
    const el = ref.current;
    let done = false;
    const run = () => { if (!done) { done = true; onPrefetch?.(); } };
    el.addEventListener('mouseenter', run, { passive: true });
    el.addEventListener('focus', run, { passive: true });
    return () => { el.removeEventListener('mouseenter', run); el.removeEventListener('focus', run); };
  }, [ref, onPrefetch]);
}
