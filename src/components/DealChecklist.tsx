import { useMemo, useState } from "react";
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

// Groups items by their group_label (in first-seen order, matching the
// underlying sort_order), keeping ungrouped items ("" label) as their own
// unlabeled bucket rendered without a collapsible header.
function groupItems(items: DealChecklistItem[]) {
  const groups: { label: string; items: DealChecklistItem[] }[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.label === item.group_label);
    if (!group) {
      group = { label: item.group_label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupItems(items), [items]);
  const done = items.filter((i) => i.done).length;

  function toggleCollapsed(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

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
        {groups.map((group) =>
          group.label ? (
            <ChecklistGroup
              key={group.label}
              label={group.label}
              items={group.items}
              collapsed={collapsed.has(group.label)}
              onToggleCollapsed={() => toggleCollapsed(group.label)}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ) : (
            <div key="__ungrouped" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {group.items.map((item) => (
                <ChecklistItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
              ))}
            </div>
          )
        )}
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

function ChecklistGroup({
  label,
  items,
  collapsed,
  onToggleCollapsed,
  onToggle,
  onDelete,
}: {
  label: string;
  items: DealChecklistItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <button onClick={onToggleCollapsed} style={groupHeaderStyle}>
        <span style={{ transform: collapsed ? "rotate(-90deg)" : "none", display: "inline-block", transition: "transform 0.1s" }}>▾</span>
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
          {done}/{items.length}
        </span>
      </button>
      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 16, marginTop: 2 }}>
          {items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: DealChecklistItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  background: "none",
  border: "none",
  color: "var(--text-body)",
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 0",
  cursor: "pointer",
  textAlign: "left",
};
