import { StatusBadge } from "./status-badge";
import type { CustomerBadge } from "@/lib/service-workflow";

export function CustomerBadges({ badges }: { badges: CustomerBadge[] }) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <StatusBadge key={badge} value={badge} />
      ))}
    </div>
  );
}
