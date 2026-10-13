import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { DetectionResponse } from "../types";

export function DetectionStatus<T>({
  loading,
  error,
  result,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  result: DetectionResponse<T> | null;
  onRetry: () => void;
  children?: ReactNode;
}) {
  if (loading) return <div className="action-feedback" role="status">Analyzing candidate data…</div>;
  if (error) {
    return (
      <div className="api-alert detection-error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    );
  }
  if (!result) {
    return <div className="action-feedback" role="status">Save a brand profile before analyzing candidates. <Link to="/profile">Configure profile</Link></div>;
  }
  return (
    <div className="action-feedback detection-summary" role="status">
      Analysis complete: {result.total} candidates · {result.high_risk_count} high-risk matches.
      {children}
    </div>
  );
}
