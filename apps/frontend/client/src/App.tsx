import type { ReactNode } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { CartDrawer } from "./components/CartDrawer.tsx";
import { CatalogPage } from "./pages/CatalogPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProductDetailPage } from "./pages/ProductDetailPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

interface GuardProps {
  children: ReactNode;
}

// Auth routes are only for anonymous visitors (RF-8): while the session is
// still being restored nothing is rendered (no authenticated flash), and once
// it is known an authenticated user is sent home.
function OnlyAnonymousRoute({ children }: GuardProps) {
  const { state } = useAuth();
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "authenticated") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Maps each URL path to its page. HashRouter keeps navigation client-side
// (everything after # never reaches a server), and "*" renders home
// for any unknown path.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/registro"
        element={
          <OnlyAnonymousRoute>
            <RegisterPage />
          </OnlyAnonymousRoute>
        }
      />
      <Route
        path="/iniciar-sesion"
        element={
          <OnlyAnonymousRoute>
            <LoginPage />
          </OnlyAnonymousRoute>
        }
      />
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
          <AuthProvider>
            <CartProvider>
              <AppRoutes />
              <CartDrawer />
            </CartProvider>
          </AuthProvider>
        </HashRouter>
      </LazyMotion>
    </MotionConfig>
  );
}
