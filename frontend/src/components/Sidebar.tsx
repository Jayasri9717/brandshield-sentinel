import type { ReactNode } from "react";

export function Sidebar({ className, children, ...props }: { className: string; children: ReactNode; id?: string; "aria-label": string }) {
  return <aside className={className} {...props}>{children}</aside>;
}
