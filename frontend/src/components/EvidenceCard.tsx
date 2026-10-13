import type { ReactNode } from "react";

export function EvidenceCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <article className="panel evidence-card"><header><strong>{title}</strong>{action}</header><div>{children}</div></article>;
}
