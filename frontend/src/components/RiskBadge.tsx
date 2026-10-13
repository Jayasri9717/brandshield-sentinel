import type { Severity } from "../types";

export function RiskBadge({ score, severity }: { score: number; severity?: Severity }) {
  const level = severity ?? (score >= 0.85 ? "Critical" : score >= 0.7 ? "High" : score >= 0.4 ? "Medium" : "Low");
  return <span className={`severity-pill ${level.toLowerCase()}`} aria-label={`${level} risk, ${Math.round(score * 100)} percent`}>{level} · {Math.round(score * 100)}%</span>;
}
