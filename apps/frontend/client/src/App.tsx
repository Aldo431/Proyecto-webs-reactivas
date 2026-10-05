import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { CatalogPage } from "./pages/CatalogPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProductDetailPage } from "./pages/ProductDetailPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

// Maps each URL path to its page. HashRouter keeps navigation client-side
// (everything after # never reaches a server), and "*" renders home
// for any unknown path.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/iniciar-sesion" element={<LoginPage />} />
      <Route path="/producto/:id" element={<ProductDetailPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

// MotionConfig with reducedMotion="user" makes every Motion animation honor
// prefers-reduced-motion (transforms and layout are skipped). Effects that
// Motion does not drive (timers, blur) add their own guards.
// LazyMotion loads only the `domAnimation` features (animations, variants,
// exit, in-view), leaving out layout and drag to keep the bundle within
// budget (plan R6). `strict` fails fast if a full `motion.*` sneaks in.
export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </LazyMotion>
    </MotionConfig>
  );
}
