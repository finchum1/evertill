import type { PipelineCard } from "../types";
import { formatCurrency } from "../lib/format";
import { formatDueDate, isOverdue } from "../lib/dates";

interface PipelineCardMiniProps {
  card: PipelineCard;
  onOpen: (id: string) => void;
}

export function PipelineCardMini({ card, onOpen }: PipelineCardMiniProps) {
  const overdue = !!card.due_date && isOverdue(card.due_date);

  return (
    <div
      onClick={() => onOpen(card.id)}
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
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
            color: "#f1f5f9",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.title}
        </span>
        {card.value > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>
            {formatCurrency(card.value)}
          </span>
        )}
      </div>

      {(card.tag_buyer || card.tag_listing) && (
        <div style={{ display: "flex", gap: 6 }}>
          {card.tag_buyer && <span style={tagStyle("#3b82f6")}>Buyer</span>}
          {card.tag_listing && <span style={tagStyle("#a855f7")}>Listing</span>}
        </div>
      )}

      {card.last_activity_text && (
        <span
          style={{
            fontSize: 12,
            color: "#475569",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.last_activity_text}
        </span>
      )}

      {card.due_date && (
        <span style={{ fontSize: 11, fontWeight: 600, color: overdue ? "#ef4444" : "#64748b" }}>
          Next: {formatDueDate(card.due_date)}
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
  };
}
