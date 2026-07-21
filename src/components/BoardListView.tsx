import type { ReactNode } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { ListColor } from "../types";

interface BoardColumnLike {
  id: string;
  label: string;
  color: ListColor;
}

interface BoardCardLike {
  id: string;
  column_id: string;
  value: number;
}

// Shared by Leads and Pipeline: same columns/cards as the Board view, just
// stacked as full-width sections instead of side-by-side — LeadColumn/
// PipelineColumn and LeadCard/PipelineCard are structurally identical for
// what this view needs, so one generic component covers both.
export function BoardListView<C extends BoardCardLike>({
  columns,
  cards,
  renderCard,
  itemNoun,
}: {
  columns: BoardColumnLike[];
  cards: C[];
  renderCard: (card: C) => ReactNode;
  itemNoun: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {columns.map((column) => {
        const columnCards = cards.filter((c) => c.column_id === column.id);
        const columnValue = columnCards.reduce((sum, c) => sum + Number(c.value), 0);
        return (
          <div key={column.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: LIST_COLOR_HEX[column.color], flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1" }}>{column.label}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>
                {columnCards.length} {itemNoun}
                {columnCards.length === 1 ? "" : "s"}
                {columnValue > 0 ? ` · $${columnValue.toLocaleString()}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {columnCards.map((card) => renderCard(card))}
              {columnCards.length === 0 && (
                <div style={{ color: "#475569", fontSize: 12, padding: "4px 0" }}>Nothing in this stage.</div>
              )}
            </div>
          </div>
        );
      })}
      {columns.length === 0 && (
        <div style={{ color: "#475569", fontSize: 13, padding: "40px 0" }}>No columns yet.</div>
      )}
    </div>
  );
}
