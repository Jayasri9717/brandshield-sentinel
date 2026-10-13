import { Icon } from "./Icon";

export function StatCard({ label, value, note, icon, tone = "default" }: { label: string; value: string; note: string; icon: string; tone?: string }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={17} /></span></div><strong className="stat-value">{value}</strong><p className="stat-note">{note}</p></article>;
}
