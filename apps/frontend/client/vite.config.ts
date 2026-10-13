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
  // En desarrollo el backend escucha en 3001; /api se proxya para que la
  // cookie de sesión sea del mismo sitio (plan D6).
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    // Vitest skips CSS by default, so `styles.css?raw` would be empty;
    // motionTokens.test.ts reads it to keep CSS and TS motion tokens in sync.
    css: { include: [/styles\.css/] },
  },
});