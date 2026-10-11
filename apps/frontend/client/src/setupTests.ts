import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import {
  addMediaChangeListener,
  matchesMediaQuery,
  removeMediaChangeListener,
  setPrefersReducedMotion,
} from "./testMedia.ts";

afterEach(() => {
  cleanup();
  setPrefersReducedMotion(false);
});

// jsdom does not implement window.scrollTo (used to restore scroll on
// navigation); stub it so tests stay free of "not implemented" noise.
window.scrollTo = () => {};

// jsdom lacks matchMedia, IntersectionObserver and ResizeObserver, which
// Motion and the animated components rely on. The stubs below keep those
// components rendering; matchMedia answers from testMedia.ts so a test can
// simulate `prefers-reduced-motion: reduce`. `matches` is read live and
// "change" listeners are notified when a test flips the preference.
type MediaListener = (event: MediaQueryListEvent) => void;

window.matchMedia = (query: string): MediaQueryList => {
  const wrappers = new Map<MediaListener, () => void>();
  const mediaQueryList = {
    get matches() {
      return matchesMediaQuery(query);
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      const wrapper = () =>
        listener({ matches: matchesMediaQuery(query), media: query } as
          MediaQueryListEvent);
      wrappers.set(listener, wrapper);
      addMediaChangeListener(wrapper);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      const wrapper = wrappers.get(listener);
      if (wrapper) removeMediaChangeListener(wrapper);
      wrappers.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  return mediaQueryList as unknown as MediaQueryList;
};

// Reports every observed element as visible, so "animate when in view"
// components start their (test-time) animations.
class IntersectionObserverStub {
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
    } as IntersectionObserverEntry;
    queueMicrotask(() => {
      this.callback([entry], this as unknown as IntersectionObserver);
    });
  }

  unobserve(): void {}

  disconnect(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class ResizeObserverStub {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

window.IntersectionObserver =
  IntersectionObserverStub as unknown as typeof IntersectionObserver;
window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
