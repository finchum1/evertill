import { LIST_COLOR_HEX } from "../types";
import type { ListColor } from "../types";
import { formatCurrency } from "../lib/format";

interface BoardColumnLike {
  id: string;
  label: string;
  color: ListColor;
}

interface BoardCardLike {
  column_id: string;
  value: number;
}

// Shared by Leads and Pipeline — one stat card per column (label, color dot,
// total value, count). Generic over the same minimal column/card shape as
// BoardListView.
export function BoardValueView({
  columns,
  cards,
  itemNoun,
}: {
  columns: BoardColumnLike[];
  cards: BoardCardLike[];
  itemNoun: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
      {columns.map((column) => {
        const columnCards = cards.filter((c) => c.column_id === column.id);
        const total = columnCards.reduce((sum, c) => sum + Number(c.value), 0);
        return (
          <div
            key={column.id}
            style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: LIST_COLOR_HEX[column.color], flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#cbd5e1",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {column.label}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{formatCurrency(total)}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {columnCards.length} {itemNoun}
              {columnCards.length === 1 ? "" : "s"}
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
