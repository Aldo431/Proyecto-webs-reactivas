import { useHashRouter } from "./hooks/useHashRouter.ts";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProductDetailPage } from "./pages/ProductDetailPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

export function App() {
  const route = useHashRouter();

  if (route.name === "register") return <RegisterPage />;
  if (route.name === "login") return <LoginPage />;
  if (route.name === "product")
    return <ProductDetailPage productId={route.productId} />;
  return <HomePage />;
}