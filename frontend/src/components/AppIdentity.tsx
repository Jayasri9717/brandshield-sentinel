import { useAppIdentity } from "../context/AppContext";

export function AppIdentity({ compact = false }: { compact?: boolean }) {
  const identity = useAppIdentity();
  return (
    <>
      <span className="avatar" aria-hidden="true">{identity.initials}</span>
      {!compact && <span><strong>{identity.name}</strong><small>{identity.role}</small></span>}
    </>
  );
}
