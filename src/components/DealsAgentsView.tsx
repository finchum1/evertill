import type { CSSProperties } from "react";
import { DEAL_STATUS_COLOR, DEAL_STATUSES } from "../types";
import type { Deal } from "../types";
import { formatCurrency } from "../lib/format";

interface DealsAgentsViewProps {
  deals: Deal[];
  onOpenDeal: (id: string) => void;
}

// A transaction coordinator's actual mental model isn't "all deals" or "all
// deals in one status" (the Board/List views) - it's "what does each agent
// I work for have open right now". This groups every deal by agent_name so
// that view exists without having to flip the List view's Agent filter back
// and forth one agent at a time.
const NO_AGENT_LABEL = "No agent assigned";

export function DealsAgentsView({ deals, onOpenDeal }: DealsAgentsViewProps) {
  const groups = new Map<string, Deal[]>();
  for (const deal of deals) {
    const key = deal.agent_name?.trim() || NO_AGENT_LABEL;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(deal);
  }

  // Alphabetical, but deals with no agent set fall to the bottom - that
  // bucket is a "still needs an agent name" prompt, not a peer of the
  // actual agents being tracked.
  const agentNames = Array.from(groups.keys())
    .filter((name) => name !== NO_AGENT_LABEL)
    .sort((a, b) => a.localeCompare(b));
  if (groups.has(NO_AGENT_LABEL)) agentNames.push(NO_AGENT_LABEL);

  if (agentNames.length === 0) {
    return (
      <div style={{ padding: "0 24px 24px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
        No deals yet.
      </div>
    );
  }

  return (
    <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      {agentNames.map((name) => {
        const agentDeals = groups.get(name)!;
        const openDeals = agentDeals.filter((d) => d.status !== "Closed");
        const openValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
        // Open deals first (by pipeline order), closed ones trail at the
        // bottom of each agent's group rather than mixed in.
        const sorted = [...agentDeals].sort((a, b) => {
          const aClosed = a.status === "Closed";
          const bClosed = b.status === "Closed";
          if (aClosed !== bClosed) return aClosed ? 1 : -1;
          return DEAL_STATUSES.indexOf(a.status) - DEAL_STATUSES.indexOf(b.status);
        });

        return (
          <div key={name} style={groupCardStyle}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: name === NO_AGENT_LABEL ? "var(--text-muted)" : "var(--text-primary)" }}>
                {name}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
                {openDeals.length} open listing{openDeals.length === 1 ? "" : "s"}
                {openValue > 0 ? ` · ${formatCurrency(openValue)}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {sorted.map((deal, i) => {
                const statusColor = DEAL_STATUS_COLOR[deal.status];
                return (
                  <div key={deal.id} onClick={() => onOpenDeal(deal.id)} style={rowStyle(i > 0)}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: deal.type === "Buyer" ? "#3b82f6" : "#a855f7", flexShrink: 0, width: 56 }}>
                      {deal.type.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {deal.address}
                    </span>
                    {deal.value > 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)", flexShrink: 0 }}>{formatCurrency(deal.value)}</span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: statusColor,
                        background: `${statusColor}20`,
                        borderRadius: 99,
                        padding: "3px 10px",
                        flexShrink: 0,
                      }}
                    >
                      {deal.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const groupCardStyle: CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 18px",
};

const rowStyle = (divider: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 2px",
  cursor: "pointer",
  borderTop: divider ? "1px solid var(--border)" : "none",
});
