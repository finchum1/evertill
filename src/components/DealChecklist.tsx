import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { DealChecklistItem, DealChecklistKind } from "../types";

interface DealChecklistProps {
  items: DealChecklistItem[];
  onAdd: (kind: DealChecklistKind, title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DealChecklist({ items, onAdd, onToggle, onDelete }: DealChecklistProps) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Checklist</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChecklistColumn kind="task" label="Tasks" items={items.filter((i) => i.kind === "task")} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} />
        <ChecklistColumn kind="document" label="Documents" items={items.filter((i) => i.kind === "document")} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} />
      </div>
    </div>
  );
}

function ChecklistColumn({
  kind,
  label,
  items,
  onAdd,
  onToggle,
  onDelete,
}: {
  kind: DealChecklistKind;
  label: string;
  items: DealChecklistItem[];
  onAdd: (kind: DealChecklistKind, title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const done = items.filter((i) => i.done).length;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(kind, trimmed);
    setTitle("");
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        {label} {items.length > 0 && `(${done}/${items.length})`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
        {items.length === 0 && <span style={{ fontSize: 12, color: "var(--border-strong)" }}>None yet.</span>}
        {items.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} style={{ cursor: "pointer" }} />
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: item.done ? "var(--text-muted)" : "var(--text-body)",
                textDecoration: item.done ? "line-through" : "none",
              }}
            >
              {item.title}
            </span>
            <button onClick={() => onDelete(item.id)} style={removeButtonStyle}>
              ×
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Add ${kind}…`}
          style={inputStyle}
        />
        <button type="submit" style={addButtonStyle}>
          Add
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  color: "var(--text-primary)",
  fontSize: 12,
  padding: "6px 8px",
  outline: "none",
  fontFamily: "inherit",
};

const addButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  color: "var(--text-body)",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 10px",
  cursor: "pointer",
  flexShrink: 0,
};

const removeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 13,
  flexShrink: 0,
};
