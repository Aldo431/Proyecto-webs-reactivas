import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement window.scrollTo (used to restore scroll on
// navigation); stub it so tests stay free of "not implemented" noise.
window.scrollTo = () => {};