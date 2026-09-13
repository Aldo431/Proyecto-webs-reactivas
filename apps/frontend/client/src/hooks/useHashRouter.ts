import { useEffect, useState } from "react";
import { parseRoute, type Route } from "../logic/routeParser.ts";

export const ROUTE_HOME = "#/";
export const ROUTE_REGISTER = "#/registro";
export const ROUTE_LOGIN = "#/iniciar-sesion";

export function useHashRouter(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.hash),
  );

  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return route;
}

export function navigate(hash: string): void {
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}