/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." resolves from the Vite root ("/src"), so no node:path import
  // (and no @types/node) is needed. Required by the shadcn CLI.
  resolve: {
    alias: { "@": "/src" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    // Vitest skips CSS by default, so `styles.css?raw` would be empty;
    // motionTokens.test.ts reads it to keep CSS and TS motion tokens in sync.
    css: { include: [/styles\.css/] },
  },
});