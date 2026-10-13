import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardStats } from "../types";

const platformLabels: Record<string, string> = {
  social: "Social",
  apps: "Apps",
  domains: "Domains",
};

export function ThreatChart({ stats }: { stats: DashboardStats | null }) {
  const data = stats?.platforms.map((item) => ({
    platform: platformLabels[item.platform] ?? item.platform,
    threats: item.threats,
  })) ?? [];

  return (
    <section className="panel threat-chart-panel" aria-label="Threats by detection type">
      <div className="section-heading">
        <div><p className="eyebrow">DETECTION ACTIVITY</p><h2>Threats by channel</h2></div>
        <span className="quiet-badge">All saved runs</span>
      </div>
      {data.length ? (
        <div className="threat-chart">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="platform" stroke="var(--muted)" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="var(--muted)" tickLine={false} axisLine={false} width={34} />
              <Tooltip cursor={{ fill: "var(--surface-hover)" }} />
              <Bar dataKey="threats" name="Candidates analyzed" fill="#78a5f8" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty">{stats ? "Run a candidate analysis to see channel activity." : "Dashboard chart is unavailable until the API responds."}</div>
      )}
    </section>
  );
}
