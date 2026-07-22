import { useState } from "react";
import type { CSSProperties } from "react";
import { DEAL_STATUS_COLOR } from "../types";
import type { Deal, DealChecklistItem, DealStatus, DealType } from "../types";
import { todayKey } from "../lib/dates";
import { DealProgressBadge } from "./DealProgressBadge";

interface DealsListViewProps {
  deals: Deal[];
  checklistItems: DealChecklistItem[];
  onOpenDeal: (id: string) => void;
}

// The 4 "open" stages get their own filter option; Closed is deliberately
// excluded (revealed only via "Show closed files").
const STAT_STATUSES: DealStatus[] = ["Active", "In Escrow", "Inspections", "Pre-Closing"];

export function DealsListView({ deals, checklistItems, onOpenDeal }: DealsListViewProps) {
  const [typeFilter, setTypeFilter] = useState<"All" | DealType>("All");
  const [statusFilter, setStatusFilter] = useState<"All Active" | DealStatus>("All Active");
  const [agentFilter, setAgentFilter] = useState<string>("All Agents");
  const [showClosed, setShowClosed] = useState(false);

  const agents = Array.from(new Set(deals.map((d) => d.agent_name).filter((a): a is string => !!a))).sort();

  const openDeals = deals.filter((d) => d.status !== "Closed");
  const closedDeals = deals.filter((d) => d.status === "Closed");

  const filtered = openDeals.filter((d) => {
    if (typeFilter !== "All" && d.type !== typeFilter) return false;
    if (statusFilter !== "All Active" && d.status !== statusFilter) return false;
    if (agentFilter !== "All Agents" && d.agent_name !== agentFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: "0 24px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={filterLabelStyle}>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "All" | DealType)} style={selectStyle}>
            <option value="All">All</option>
            <option value="Buyer">Buyer</option>
            <option value="Listing">Listing</option>
          </select>
        </label>
        <label style={filterLabelStyle}>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All Active" | DealStatus)} style={selectStyle}>
            <option value="All Active">All Active</option>
            {STAT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((deal) => (
          <DealListRow key={deal.id} deal={deal} checklistItems={checklistItems.filter((i) => i.deal_id === deal.id)} onOpen={onOpenDeal} />
        ))}
        {filtered.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>No deals match these filters.</div>
        )}
      </div>

      {closedDeals.length > 0 && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={() => setShowClosed((s) => !s)} style={showClosedButtonStyle}>
            {showClosed ? "Hide" : "Show"} closed files ({closedDeals.length})
          </button>
        </div>
      )}

      {showClosed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {closedDeals.map((deal) => (
            <DealListRow key={deal.id} deal={deal} checklistItems={checklistItems.filter((i) => i.deal_id === deal.id)} onOpen={onOpenDeal} />
          ))}
        </div>
      )}
    </div>
  );
}

const MILESTONES: { key: "acceptance_date" | "inspection_date" | "appraisal_date" | "closing_date"; label: string }[] = [
  { key: "acceptance_date", label: "Acceptance" },
  { key: "inspection_date", label: "Inspection" },
  { key: "appraisal_date", label: "Appraisal" },
  { key: "closing_date", label: "Closing" },
];

function DealListRow({
  deal,
  checklistItems,
  onOpen,
}: {
  deal: Deal;
  checklistItems: DealChecklistItem[];
  onOpen: (id: string) => void;
}) {
  const tkey = todayKey();
  // Highlight whichever milestone is the first not-yet-passed date (today or
  // future); if every set date has already passed, highlight the last one
  // that has a date at all.
  const withDates = MILESTONES.map((m) => ({ ...m, date: deal[m.key] }));
  const upcoming = withDates.find((m) => m.date && m.date >= tkey);
  const lastSet = [...withDates].reverse().find((m) => m.date);
  const currentKey = (upcoming ?? lastSet)?.key;
  const statusColor = DEAL_STATUS_COLOR[deal.status];

  return (
    <div
      onClick={() => onOpen(deal.id)}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        rowGap: 12,
        gap: 20,
        padding: "18px 20px",
        borderRadius: 12,
        border: `1px solid ${deal.status === "Closed" ? "var(--border)" : `${statusColor}40`}`,
        background: "var(--bg-panel)",
        cursor: "pointer",
      }}
    >
      <div style={{ minWidth: 220, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", marginBottom: 4 }}>
          {deal.type === "Listing" ? "LISTING SIDE" : "BUYER SIDE"}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {deal.address}
        </div>
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            color: statusColor,
            background: `${statusColor}20`,
            borderRadius: 99,
            padding: "3px 10px",
          }}
        >
          {deal.status}
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", position: "relative", padding: "0 10px", minWidth: 260 }}>
        <div style={{ position: "absolute", left: 10, right: 10, top: 5, height: 1, background: "var(--border)" }} />
        {withDates.map((m) => {
          const active = m.key === currentKey;
          return (
            <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 1 }}>
              <div
                style={{
                  width: active ? 12 : 8,
                  height: active ? 12 : 8,
                  borderRadius: 99,
                  background: active ? statusColor : "var(--border-strong)",
                }}
              />
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>{m.label.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.date ? formatMilestoneDate(m.date) : "—"}</div>
            </div>
          );
        })}
      </div>

      <DealProgressBadge items={checklistItems} />

      {deal.agent_name && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", minWidth: 120, flexShrink: 0, textAlign: "right" }}>
          Agent: {deal.agent_name}
        </div>
      )}
    </div>
  );
}

function formatMilestoneDate(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const filterLabelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  letterSpacing: "0.04em",
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

const showClosedButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-tertiary)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  padding: "8px 16px",
  cursor: "pointer",
};
