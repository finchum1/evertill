import type { CSSProperties } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { PipelineCard, PipelineColumn, ListColor } from "../types";
import { PipelineCardMini } from "./PipelineCardMini";
import { ListMenu } from "./ListMenu";

interface PipelineBoardProps {
  columns: PipelineColumn[];
  cards: PipelineCard[];
  onAddColumn: () => void;
  onRenameColumn: (id: string, label: string) => void;
  onSetColumnColor: (id: string, color: ListColor) => void;
  onDeleteColumn: (id: string) => void;
  onAddCard: (columnId: string) => void;
  onOpenCard: (id: string) => void;
}

export function PipelineBoard({
  columns,
  cards,
  onAddColumn,
  onRenameColumn,
  onSetColumnColor,
  onDeleteColumn,
  onAddCard,
  onOpenCard,
}: PipelineBoardProps) {
  return (
    <div style={{ padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Pipeline</h1>
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
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-body)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {column.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{columnCards.length}</span>
                <ListMenu
                  name={column.label}
                  color={column.color}
                  onRename={(label) => onRenameColumn(column.id, label)}
                  onSetColor={(color) => onSetColumnColor(column.id, color)}
                  onDelete={() => onDeleteColumn(column.id)}
                  itemNoun="clients"
                />
              </div>
              {columnValue > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -6 }}>
                  {columnCards.length} client{columnCards.length === 1 ? "" : "s"} · ${columnValue.toLocaleString()}
                </span>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {columnCards.map((card) => (
                  <PipelineCardMini key={card.id} card={card} onOpen={onOpenCard} />
                ))}
              </div>

              <button onClick={() => onAddCard(column.id)} style={addCardButtonStyle}>
                + Add client
              </button>
            </div>
          );
        })}

        {columns.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "40px 0" }}>
            No columns yet — click "+ Add Column" to start your board.
          </div>
        )}
      </div>
    </div>
  );
}

const primaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
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
  border: "1px dashed var(--border-strong)",
  borderRadius: 10,
  color: "var(--text-secondary)",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px",
  cursor: "pointer",
};
