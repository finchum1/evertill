import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { useDealTemplates } from "../hooks/useDealTemplates";
import type { DealChecklistKind } from "../types";

interface DealTemplatesManagerProps {
  dealTemplatesData: ReturnType<typeof useDealTemplates>;
  onBack: () => void;
}

export function DealTemplatesManager({ dealTemplatesData, onBack }: DealTemplatesManagerProps) {
  const { templates, items, addTemplate, renameTemplate, deleteTemplate, setDefaultTemplate, addItem, deleteItem } = dealTemplatesData;
  const [activeId, setActiveId] = useState<string | null>(templates[0]?.id ?? null);
  const [newTemplateName, setNewTemplateName] = useState("");

  const active = templates.find((t) => t.id === activeId) ?? templates[0];

  // Templates load in async (and the very first one is auto-seeded on first
  // visit), so keep a selection once they arrive instead of staying stuck
  // on the empty initial render.
  useEffect(() => {
    if (!activeId && templates.length > 0) setActiveId(templates[0].id);
  }, [activeId, templates]);

  async function handleAddTemplate(e: FormEvent) {
    e.preventDefault();
    const name = newTemplateName.trim();
    if (!name) return;
    const created = await addTemplate(name);
    setNewTemplateName("");
    if (created) setActiveId(created.id);
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 760, fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={backButtonStyle}>
          ← Settings
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Deal Templates</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              style={{
                ...templateRowStyle,
                background: active?.id === t.id ? "var(--border)" : "none",
                color: active?.id === t.id ? "var(--text-primary)" : "var(--text-body)",
              }}
            >
              <span style={{ color: t.is_default ? "#facc15" : "var(--border-strong)" }}>{t.is_default ? "★" : "☆"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
            </button>
          ))}
          <form onSubmit={handleAddTemplate} style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="New template…"
              style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}
            />
            <button type="submit" style={addButtonStyle}>
              Add
            </button>
          </form>
        </div>

        {active && (
          <TemplateEditor
            key={active.id}
            template={active}
            items={items.filter((i) => i.template_id === active.id)}
            onRename={(name) => renameTemplate(active.id, name)}
            onDelete={() => {
              if (!window.confirm(`Delete template "${active.name}"?`)) return;
              deleteTemplate(active.id);
              setActiveId(null);
            }}
            onSetDefault={() => setDefaultTemplate(active.id)}
            onAddItem={(kind, title) => addItem(active.id, kind, title)}
            onDeleteItem={deleteItem}
          />
        )}
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  items,
  onRename,
  onDelete,
  onSetDefault,
  onAddItem,
  onDeleteItem,
}: {
  template: { id: string; name: string; is_default: boolean };
  items: { id: string; kind: DealChecklistKind; title: string }[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onAddItem: (kind: DealChecklistKind, title: string) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [name, setName] = useState(template.name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== template.name && onRename(name.trim())}
          style={{ ...inputStyle, fontSize: 15, fontWeight: 700, flex: 1 }}
        />
        {!template.is_default && (
          <button onClick={onSetDefault} style={ghostButtonStyle}>
            Make default
          </button>
        )}
        <button onClick={onDelete} style={dangerButtonStyle}>
          Delete
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ItemColumn kind="task" label="Tasks" items={items.filter((i) => i.kind === "task")} onAdd={onAddItem} onDelete={onDeleteItem} />
        <ItemColumn kind="document" label="Documents" items={items.filter((i) => i.kind === "document")} onAdd={onAddItem} onDelete={onDeleteItem} />
      </div>
    </div>
  );
}

function ItemColumn({
  kind,
  label,
  items,
  onAdd,
  onDelete,
}: {
  kind: DealChecklistKind;
  label: string;
  items: { id: string; title: string }[];
  onAdd: (kind: DealChecklistKind, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(kind, trimmed);
    setTitle("");
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {items.length === 0 && <span style={{ fontSize: 12, color: "var(--border-strong)" }}>None yet.</span>}
        {items.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 13, color: "var(--text-body)" }}>{item.title}</span>
            <button onClick={() => onDelete(item.id)} style={removeButtonStyle}>
              ×
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Add ${kind}…`} style={{ ...inputStyle, fontSize: 13 }} />
        <button type="submit" style={addButtonStyle}>
          Add
        </button>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  padding: "8px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const backButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  cursor: "pointer",
};

const templateRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "none",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "left",
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

const ghostButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 12,
  fontWeight: 600,
  padding: "7px 12px",
  cursor: "pointer",
  flexShrink: 0,
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "var(--danger)",
  fontSize: 12,
  fontWeight: 600,
  padding: "7px 12px",
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
