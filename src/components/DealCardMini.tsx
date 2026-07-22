import type { Deal } from "../types";
import { formatCurrency } from "../lib/format";
import { formatDueDate } from "../lib/dates";

interface DealCardMiniProps {
  deal: Deal;
  onOpen: (id: string) => void;
}

export function DealCardMini({ deal, onOpen }: DealCardMiniProps) {
  return (
    <div
      onClick={() => onOpen(deal.id)}
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {deal.address}
        </span>
        {deal.value > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", flexShrink: 0 }}>
            {formatCurrency(deal.value)}
          </span>
        )}
      </div>

      <span style={tagStyle(deal.type === "Buyer" ? "#3b82f6" : "#a855f7")}>{deal.type}</span>

      {deal.last_activity_text && (
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {deal.last_activity_text}
        </span>
      )}

      {deal.closing_date && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
          Closing: {formatDueDate(deal.closing_date)}
        </span>
      )}
    </div>
  );
}

function tagStyle(color: string) {
  return {
    fontSize: 10,
    fontWeight: 700,
    color,
    background: `${color}20`,
    borderRadius: 5,
    padding: "2px 6px",
    width: "fit-content" as const,
  };
}
