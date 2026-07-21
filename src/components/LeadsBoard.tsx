import type { CSSProperties } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { LeadCard, LeadColumn } from "../types";
import { LeadCardMini } from "./LeadCardMini";

interface LeadsBoardProps {
  columns: LeadColumn[];
  cards: LeadCard[];
  onAddColumn: () => void;
  onRenameColumn: (id: string, label: string) => void;
  onDeleteColumn: (id: string) => void;
  onAddCard: (columnId: string) => void;
  onOpenCard: (id: string) => void;
}

export function LeadsBoard({
  columns,
  cards,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddCard,
  onOpenCard,
}: LeadsBoardProps) {
  return (
    <div style={{ padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Leads</h1>
        <button onClick={onAddColumn} style={primaryButtonStyle}>
          + Add Column
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12 }}>
        {columns.map((column) => {
          const columnCards = cards.filter((c) => c.column_id === column.id);
          const columnValue = columnCards.reduce((sum, c) => sum + Number(c.value), 0);
          return (
            <div key={column.id} style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: LIST_COLOR_HEX[column.color], flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {column.label}
                </span>
                <span style={{ fontSize: 11, color: "#475569" }}>{columnCards.length}</span>
                <button
                  title="Rename or delete column"
                  onClick={() => {
                    const action = window.prompt(
                      `"${column.label}" — type "delete" to delete (its cards go too), or type a new name to rename:`,
                      column.label
                    );
                    if (action === null) return;
                    if (action.trim().toLowerCase() === "delete") {
                      if (window.confirm(`Delete column "${column.label}" and all its cards? This can't be undone.`)) {
                        onDeleteColumn(column.id);
                      }
                    } else if (action.trim()) {
                      onRenameColumn(column.id, action.trim());
                    }
                  }}
                  style={menuButtonStyle}
                >
                  ⋯
                </button>
              </div>
              {columnValue > 0 && (
                <span style={{ fontSize: 11, color: "#475569", marginTop: -6 }}>
                  {columnCards.length} lead{columnCards.length === 1 ? "" : "s"} · ${columnValue.toLocaleString()}
                </span>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {columnCards.map((card) => (
                  <LeadCardMini key={card.id} card={card} onOpen={onOpenCard} />
                ))}
              </div>

              <button onClick={() => onAddCard(column.id)} style={addCardButtonStyle}>
                + Add lead
              </button>
            </div>
          );
        })}

        {columns.length === 0 && (
          <div style={{ color: "#475569", fontSize: 13, padding: "40px 0" }}>
            No columns yet — click "+ Add Column" to start your board.
          </div>
        )}
      </div>
    </div>
  );
}

const primaryButtonStyle: CSSProperties = {
  background: "#4f46e5",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const addCardButtonStyle: CSSProperties = {
  background: "none",
  border: "1px dashed #334155",
  borderRadius: 10,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px",
  cursor: "pointer",
};

const menuButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#475569",
  fontSize: 14,
  cursor: "pointer",
  padding: "2px 4px",
  flexShrink: 0,
};
