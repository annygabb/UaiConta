import { useEffect, useState } from "react";
import { ROUTES } from "./constants.js";

const validRoutes = new Set(Object.values(ROUTES));

export function normalizePath(pathname) {
  if (!pathname || pathname === "/") return ROUTES.dashboard;
  return validRoutes.has(pathname) ? pathname : ROUTES.dashboard;
}

export function navigate(path) {
  const target = normalizePath(path);
  if (window.location.pathname === target) return;
  window.history.pushState({}, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [route, setRoute] = useState(() => normalizePath(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    if (window.location.pathname === "/") window.history.replaceState({}, "", ROUTES.dashboard);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return route;
}
