export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <span className="loading-indicator" role="status"><span className="spinner" aria-hidden="true" />{label}</span>;
}
