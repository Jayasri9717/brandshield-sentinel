import type { ReactNode } from "react";

export function Layout({ className, children, ...props }: { className: string; children: ReactNode; onPointerMove: React.PointerEventHandler<HTMLDivElement>; onPointerLeave: React.PointerEventHandler<HTMLDivElement> }) {
  return <div className={className} {...props}>{children}</div>;
}
