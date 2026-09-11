import type { CSSProperties } from "react";
import type { Deal, LeadCard, PipelineCard } from "../types";
import { formatCurrency } from "../lib/format";
import { addDays, dateToKey, formatDueDate, isOverdue, todayKey } from "../lib/dates";

interface HomeDashboardProps {
  leads: LeadCard[];
  pipelineCards: PipelineCard[];
  deals: Deal[];
  onOpenLeadCard: (id: string) => void;
  onOpenPipelineCard: (id: string) => void;
}

type ReachOutModule = "leads" | "pipeline";

interface ReachOutItem {
  id: string;
  module: ReachOutModule;
  title: string;
  dueDate: string;
  lastActivityText: string | null;
}

// How far out a "Next activity" date still counts as worth surfacing here —
// wide enough that the list isn't empty most days, but still a real
// this-week horizon rather than every future date on the board.
const REACH_OUT_WINDOW_DAYS = 7;

// The one landing page for the whole app now (App.tsx defaults `page` to
// "home") — a single glance across all three modules, plus the "who do I
// need to follow up with" list that used to require checking Leads and
// Pipeline separately. Clicking a row deep-links into that card's own
// module (see App.tsx's openLeadCard/openPipelineCard) rather than trying
// to edit anything about the card here.
export function HomeDashboard({ leads, pipelineCards, deals, onOpenLeadCard, onOpenPipelineCard }: HomeDashboardProps) {
  const openTransactions = deals.filter((d) => d.status !== "Closed");
  const openTransactionsValue = openTransactions.reduce((sum, d) => sum + Number(d.value), 0);

  const windowEndKey = dateToKey(addDays(new Date(), REACH_OUT_WINDOW_DAYS));
  const reachOutItems: ReachOutItem[] = [
    ...leads
      .filter((c): c is LeadCard & { due_date: string } => !!c.due_date && c.due_date <= windowEndKey)
      .map((c) => ({ id: c.id, module: "leads" as const, title: c.title, dueDate: c.due_date, lastActivityText: c.last_activity_text })),
    ...pipelineCards
      .filter((c): c is PipelineCard & { due_date: string } => !!c.due_date && c.due_date <= windowEndKey)
      .map((c) => ({ id: c.id, module: "pipeline" as const, title: c.title, dueDate: c.due_date, lastActivityText: c.last_activity_text })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div style={{ padding: "20px 24px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Home</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
          A look at everything across Leads, Pipeline, and Transactions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard label="LEADS" value={String(leads.length)} color={MODULE_COLOR.leads} />
        <StatCard label="PIPELINE" value={String(pipelineCards.length)} color={MODULE_COLOR.pipeline} />
        <StatCard label="OPEN TRANSACTIONS" value={String(openTransactions.length)} color="var(--accent-strong)" />
        <StatCard label="OPEN VALUE" value={formatCurrency(openTransactionsValue)} color="var(--accent-strong)" />
      </div>

      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>Reach out</h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px" }}>
          Leads and Pipeline clients whose next-activity date is overdue, due today, or coming up this week.
        </p>
        {reachOutItems.length === 0 ? (
          <div style={emptyStateStyle}>Nothing due right now — set a "Next activity" date on a lead or client to see it here.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 12 }}>
            {reachOutItems.map((item, i) => (
              <ReachOutRow
                key={`${item.module}:${item.id}`}
                item={item}
                divider={i > 0}
                onOpen={() => (item.module === "leads" ? onOpenLeadCard(item.id) : onOpenPipelineCard(item.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Fixed hexes, not var(--accent) - these label which module a row came
// from regardless of the visitor's own accent color choice, same reasoning
// as LandingPage.tsx's own per-module MODULE_COLOR.
const MODULE_COLOR: Record<ReachOutModule, string> = { leads: "#0284c7", pipeline: "#7c3aed" };
const MODULE_LABEL: Record<ReachOutModule, string> = { leads: "Lead", pipeline: "Pipeline" };

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

function ReachOutRow({ item, divider, onOpen }: { item: ReachOutItem; divider: boolean; onOpen: () => void }) {
  const overdue = isOverdue(item.dueDate);
  const dueToday = item.dueDate === todayKey();
  const dateColor = overdue ? "var(--danger)" : dueToday ? "var(--accent-light)" : "var(--text-secondary)";
  return (
    <div onClick={onOpen} style={rowStyle(divider)}>
      <span style={tagStyle(MODULE_COLOR[item.module])}>{MODULE_LABEL[item.module]}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.title}
      </span>
      {item.lastActivityText && (
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.lastActivityText}
        </span>
      )}
      <span style={{ fontSize: 12, fontWeight: 700, color: dateColor, flexShrink: 0 }}>
        {overdue ? "Overdue · " : dueToday ? "Today · " : ""}
        {formatDueDate(item.dueDate)}
      </span>
    </div>
  );
}

const statCardStyle: CSSProperties = {
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 18px",
};

const statLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  letterSpacing: "0.06em",
  marginTop: 4,
};

const emptyStateStyle: CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "24px 16px",
  textAlign: "center",
  border: "1px dashed var(--border)",
  borderRadius: 12,
};

const rowStyle = (divider: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  cursor: "pointer",
  borderTop: divider ? "1px solid var(--border)" : "none",
});

function tagStyle(color: string): CSSProperties {
  return {
    fontSize: 10,
    fontWeight: 700,
    color,
    background: `${color}20`,
    borderRadius: 5,
    padding: "2px 6px",
    flexShrink: 0,
  };
}
