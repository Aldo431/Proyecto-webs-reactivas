import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/inter";
import { App } from "./App.tsx";
import "./styles.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}