import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { useDealTemplates } from "../hooks/useDealTemplates";
import type { DealChecklistKind, DealTemplateItem, DealType } from "../types";
import { parseChecklistPaste } from "../lib/checklistImport";

interface DealTemplatesManagerProps {
  dealTemplatesData: ReturnType<typeof useDealTemplates>;
  onBack: () => void;
}

const DEAL_TYPES: DealType[] = ["Buyer", "Listing"];

export function DealTemplatesManager({ dealTemplatesData, onBack }: DealTemplatesManagerProps) {
  const { templates, items, addTemplate, renameTemplate, deleteTemplate, setDefaultTemplate, addItem, bulkImportItems, deleteItem } = dealTemplatesData;
  const [activeType, setActiveType] = useState<DealType>("Buyer");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");

  const typeTemplates = templates.filter((t) => t.deal_type === activeType);
  const active = typeTemplates.find((t) => t.id === activeId) ?? typeTemplates[0];

  // Templates load in async (and the type's first one is auto-seeded on
  // first visit), and switching the type tab needs a new selection within
  // that type — keep a valid selection instead of staying stuck on an
  // empty or wrong-type render.
  useEffect(() => {
    if (typeTemplates.length > 0 && !typeTemplates.some((t) => t.id === activeId)) {
      setActiveId(typeTemplates[0].id);
    }
  }, [activeId, typeTemplates]);

  async function handleAddTemplate(e: FormEvent) {
    e.preventDefault();
    const name = newTemplateName.trim();
    if (!name) return;
    const created = await addTemplate(name, activeType);
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

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {DEAL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveType(t);
              setActiveId(null);
            }}
            style={{
              ...typeTabStyle,
              background: activeType === t ? "var(--accent)" : "var(--border)",
              color: activeType === t ? "#fff" : "var(--text-body)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {typeTemplates.map((t) => (
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
              placeholder={`New ${activeType.toLowerCase()} template…`}
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
            onAddItem={(kind, title, groupLabel) => addItem(active.id, kind, title, groupLabel)}
            onBulkImport={(kind, parsed) => bulkImportItems(active.id, kind, parsed)}
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
  onBulkImport,
  onDeleteItem,
}: {
  template: { id: string; name: string; is_default: boolean };
  items: DealTemplateItem[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onAddItem: (kind: DealChecklistKind, title: string, groupLabel: string) => void;
  onBulkImport: (kind: DealChecklistKind, parsed: ReturnType<typeof parseChecklistPaste>) => void;
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
        <ItemColumn kind="task" label="Tasks" items={items.filter((i) => i.kind === "task")} onAdd={onAddItem} onBulkImport={onBulkImport} onDelete={onDeleteItem} />
        <ItemColumn kind="document" label="Documents" items={items.filter((i) => i.kind === "document")} onAdd={onAddItem} onBulkImport={onBulkImport} onDelete={onDeleteItem} />
      </div>
    </div>
  );
}

// Groups items by their group_label in first-seen (sort_order) order,
// keeping ungrouped items ("" label) together without a section heading.
function groupItems(items: DealTemplateItem[]) {
  const groups: { label: string; items: DealTemplateItem[] }[] = [];
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

function ItemColumn({
  kind,
  label,
  items,
  onAdd,
  onBulkImport,
  onDelete,
}: {
  kind: DealChecklistKind;
  label: string;
  items: DealTemplateItem[];
  onAdd: (kind: DealChecklistKind, title: string, groupLabel: string) => void;
  onBulkImport: (kind: DealChecklistKind, parsed: ReturnType<typeof parseChecklistPaste>) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const groups = groupItems(items);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(kind, trimmed, group.trim());
    setTitle("");
  }

  function handleImport(e: FormEvent) {
    e.preventDefault();
    const parsed = parseChecklistPaste(importText);
    if (parsed.length === 0) return;
    onBulkImport(kind, parsed);
    setImportText("");
    setImportOpen(false);
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
        {items.length === 0 && <span style={{ fontSize: 12, color: "var(--border-strong)" }}>None yet.</span>}
        {groups.map((g) => (
          <div key={g.label || "__ungrouped"} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {g.label && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{g.label}</div>
            )}
            {g.items.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-body)" }}>{item.title}</span>
                <button onClick={() => onDelete(item.id)} style={removeButtonStyle}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Add ${kind}…`} style={{ ...inputStyle, fontSize: 13, flex: 2 }} />
        <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group…" style={{ ...inputStyle, fontSize: 13, flex: 1 }} />
        <button type="submit" style={addButtonStyle}>
          Add
        </button>
      </form>
      {importOpen ? (
        <form onSubmit={handleImport} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Paste a checklist — group headings on their own line, items as \"- [ ] Title\""}
            rows={6}
            style={{ ...inputStyle, fontSize: 12, resize: "vertical" as const }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" style={addButtonStyle}>
              Import
            </button>
            <button type="button" onClick={() => setImportOpen(false)} style={ghostButtonStyle}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setImportOpen(true)} style={importLinkStyle}>
          Paste to import…
        </button>
      )}
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

const typeTabStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
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

const importLinkStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--accent-light)",
  fontSize: 12,
  fontWeight: 600,
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
};
