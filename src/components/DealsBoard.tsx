import { useState } from "react";
import type { CSSProperties } from "react";
import { DEAL_STATUSES } from "../types";
import type { Deal, DealChecklistItem } from "../types";
import { DealCardMini } from "./DealCardMini";

interface DealsBoardProps {
  deals: Deal[];
  checklistItems: DealChecklistItem[];
  onOpenDeal: (id: string) => void;
}

export function DealsBoard({ deals, checklistItems, onOpenDeal }: DealsBoardProps) {
  // Same "All Agents" self-contained filter DealsListView already has -
  // without it there was no way to see just one agent's listings on the
  // board, only in the list view.
  const [agentFilter, setAgentFilter] = useState<string>("All Agents");
  const agents = Array.from(new Set(deals.map((d) => d.agent_name).filter((a): a is string => !!a))).sort();
  const visibleDeals = agentFilter === "All Agents" ? deals : deals.filter((d) => d.agent_name === agentFilter);

  return (
    <div style={{ padding: "0 24px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      {agents.length > 0 && (
        <label style={filterLabelStyle}>
          Agent
          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} style={selectStyle}>
            <option value="All Agents">All Agents</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      )}
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12 }}>
        {DEAL_STATUSES.map((status) => {
          const statusDeals = visibleDeals.filter((d) => d.status === status);
          const statusValue = statusDeals.reduce((sum, d) => sum + Number(d.value), 0);
          return (
            <div key={status} style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-body)", flex: 1 }}>{status}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{statusDeals.length}</span>
              </div>
              {statusValue > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -6 }}>
                  {statusDeals.length} deal{statusDeals.length === 1 ? "" : "s"} · ${statusValue.toLocaleString()}
                </span>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {statusDeals.map((deal) => (
                  <DealCardMini
                    key={deal.id}
                    deal={deal}
                    checklistItems={checklistItems.filter((i) => i.deal_id === deal.id)}
                    onOpen={onOpenDeal}
                  />
                ))}
                {statusDeals.length === 0 && (
                  <div style={{ color: "var(--border-strong)", fontSize: 12, padding: "12px 0" }}>No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const filterLabelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  letterSpacing: "0.04em",
  marginBottom: 16,
  width: "fit-content",
};

const selectStyle: CSSProperties = {
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "6px 10px",
  outline: "none",
  fontFamily: "inherit",
};
