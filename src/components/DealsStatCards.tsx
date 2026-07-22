import type { CSSProperties } from "react";
import { DEAL_STATUS_COLOR } from "../types";
import type { Deal, DealStatus } from "../types";

interface DealsStatCardsProps {
  deals: Deal[];
}

// The 4 "open" stages get their own stat card; Closed is deliberately
// excluded (revealed only via DealsListView's "Show closed files" toggle).
const STAT_STATUSES: DealStatus[] = ["Active", "In Escrow", "Inspections", "Pre-Closing"];

// Shown once above the List/Board/Calendar/Value view tabs so the at-a-glance
// counts stay visible no matter which view is active, instead of only
// appearing inside the List view the way it used to.
export function DealsStatCards({ deals }: DealsStatCardsProps) {
  const openDeals = deals.filter((d) => d.status !== "Closed");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 24px", marginBottom: 16 }}>
      {STAT_STATUSES.map((status) => {
        const count = openDeals.filter((d) => d.status === status).length;
        return (
          <div key={status} style={statCardStyle}>
            <div style={{ fontSize: 26, fontWeight: 800, color: DEAL_STATUS_COLOR[status] }}>{count}</div>
            <div style={statLabelStyle}>{status.toUpperCase()}</div>
          </div>
        );
      })}
    </div>
  );
}

const statCardStyle: CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "18px 20px",
};

const statLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  letterSpacing: "0.06em",
  marginTop: 4,
};
