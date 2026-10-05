// Test-only state for the matchMedia stub installed in setupTests.ts.
// Tests call setPrefersReducedMotion(true) to simulate
// `prefers-reduced-motion: reduce`; setupTests resets it after each test.
// Motion asks for the boolean form "(prefers-reduced-motion)", which a real
// browser matches only under `reduce`, so both forms are answered.
// Motion reads the preference once and then follows "change" events, so a
// change here notifies the registered listeners, as a browser would. A
// component reads the value when it mounts: call setPrefersReducedMotion(true)
// before rendering.

let prefersReducedMotion = false;
const changeListeners = new Set<() => void>();

export function setPrefersReducedMotion(enabled: boolean): void {
  if (prefersReducedMotion === enabled) return;
  prefersReducedMotion = enabled;
  changeListeners.forEach((listener) => listener());
}

export function matchesMediaQuery(query: string): boolean {
  return (
    prefersReducedMotion &&
    /\(\s*prefers-reduced-motion\s*(?::\s*reduce\s*)?\)/.test(query)
  );
}

export function addMediaChangeListener(listener: () => void): void {
  changeListeners.add(listener);
}

export function removeMediaChangeListener(listener: () => void): void {
  changeListeners.delete(listener);
}
