export type Route = "home" | "register" | "login" | "unknown";

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, "");
  if (path === "" || path === "/") return "home";
  if (path === "/registro") return "register";
  if (path === "/iniciar-sesion") return "login";
  return "unknown";
}