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

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
