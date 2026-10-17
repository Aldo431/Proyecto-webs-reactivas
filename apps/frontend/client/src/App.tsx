import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { CartDrawer } from "./components/CartDrawer.tsx";
import { OnlyAnonymousRoute } from "./components/OnlyAnonymousRoute.tsx";
import { OnlyAuthenticatedRoute } from "./components/OnlyAuthenticatedRoute.tsx";
import { CatalogPage } from "./pages/CatalogPage.tsx";
import { EditProductPage } from "./pages/EditProductPage.tsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { MyProductsPage } from "./pages/MyProductsPage.tsx";
import { ProductDetailPage } from "./pages/ProductDetailPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { PublishProductPage } from "./pages/PublishProductPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.tsx";

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
      <Route path="/recuperar-clave" element={<ForgotPasswordPage />} />
      <Route path="/resetear-clave/:token" element={<ResetPasswordPage />} />
      <Route path="/producto/:id" element={<ProductDetailPage />} />
      <Route path="/catalogo" element={<CatalogPage />} />
      <Route
        path="/perfil"
        element={
          <OnlyAuthenticatedRoute>
            <ProfilePage />
          </OnlyAuthenticatedRoute>
        }
      />
      <Route
        path="/publicar"
        element={
          <OnlyAuthenticatedRoute>
            <PublishProductPage />
          </OnlyAuthenticatedRoute>
        }
      />
      <Route
        path="/mis-publicaciones"
        element={
          <OnlyAuthenticatedRoute>
            <MyProductsPage />
          </OnlyAuthenticatedRoute>
        }
      />
      <Route
        path="/publicaciones/:id/editar"
        element={
          <OnlyAuthenticatedRoute>
            <EditProductPage />
          </OnlyAuthenticatedRoute>
        }
      />
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
