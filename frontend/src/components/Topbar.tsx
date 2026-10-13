import type { ReactNode } from "react";

export function Topbar({ className, children }: { className: string; children: ReactNode }) {
  return <header className={className}>{children}</header>;
}
