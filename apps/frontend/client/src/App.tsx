import { useHashRouter } from "./hooks/useHashRouter.ts";
import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";

export function App() {
  const route = useHashRouter();

  if (route === "register") return <RegisterPage />;
  if (route === "login") return <LoginPage />;
  return <HomePage />;
}