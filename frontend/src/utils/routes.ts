import type { PageId } from "../types";

export const routeByPage: Record<PageId, string> = {
  dashboard: "/",
  profile: "/profile",
  social: "/social",
  apps: "/apps",
  domains: "/domains",
};

export function pageFromPath(pathname: string): PageId | null {
  const route = Object.entries(routeByPage).find(([, path]) => path === pathname);
  return route ? route[0] as PageId : null;
}
