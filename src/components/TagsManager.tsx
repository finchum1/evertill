import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { useTags } from "../hooks/useTags";
import { LIST_COLORS, LIST_COLOR_HEX } from "../types";
import type { ListColor } from "../types";
import { useDialogs } from "./DialogHost";

interface TagsManagerProps {
  tagsData: ReturnType<typeof useTags>;
  onBack: () => void;
}

// Full-page manager (same "← Settings" back-button pattern as
// DealTemplatesManager) for the one shared tag list used by both Leads and
// Pipeline cards — rename, recolor, delete, and add new tags here; the
// TagPicker dropdown on a card can only select existing tags or quick-create
// a new one, not rename/recolor/delete, so this is the one place for full
// control over the list itself.
export function TagsManager({ tagsData, onBack }: TagsManagerProps) {
  const { tags, addTag, renameTag, setTagColor, deleteTag } = tagsData;
  const [newLabel, setNewLabel] = useState("");
  const dialogs = useDialogs();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setNewLabel("");
    await addTag(label, LIST_COLORS[tags.length % LIST_COLORS.length]);
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 520, fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onBack} style={backButtonStyle}>
          ← Settings
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Tags</h1>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
        One shared tag list for Leads and Pipeline cards. Rename, recolor, or delete a tag here — deleting removes it from every
        card it's on.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {tags.map((t) => (
          <TagRow
            key={t.id}
            label={t.label}
            color={t.color}
            onRename={(label) => renameTag(t.id, label)}
            onSetColor={(color) => setTagColor(t.id, color)}
            onDelete={async () => {
              const ok = await dialogs.confirm({
                message: `Delete "${t.label}"? It will be removed from every card that has it.`,
                danger: true,
                confirmLabel: "Delete",
              });
              if (ok) deleteTag(t.id);
            }}
          />
        ))}
        {tags.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>No tags yet.</div>}
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New tag name…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" style={primaryButtonStyle}>
          Add tag
        </button>
      </form>
    </div>
  );
}

function TagRow({
  label,
  color,
  onRename,
  onSetColor,
  onDelete,
}: {
  label: string;
  color: ListColor;
  onRename: (label: string) => void;
  onSetColor: (color: ListColor) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(label);
  const [colorOpen, setColorOpen] = useState(false);
  const colorWrapperRef = useRef<HTMLDivElement>(null);

  // Keep the input in sync if the tag is renamed from elsewhere (another
  // open tab) while this field isn't focused/being edited.
  useEffect(() => setDraft(label), [label]);

  useEffect(() => {
    if (!colorOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (colorWrapperRef.current && !colorWrapperRef.current.contains(e.target as Node)) {
        setColorOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown, true);
    return () => document.removeEventListener("mousedown", handlePointerDown, true);
  }, [colorOpen]);

  return (
    <div style={rowStyle}>
      <div ref={colorWrapperRef} style={{ position: "relative" }}>
        <button
          type="button"
          title="Change color"
          onClick={() => setColorOpen((o) => !o)}
          style={{ width: 18, height: 18, borderRadius: 99, background: LIST_COLOR_HEX[color], border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        />
        {colorOpen && (
          <div style={swatchPanelStyle}>
            {LIST_COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => {
                  onSetColor(c);
                  setColorOpen(false);
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 99,
                  border: c === color ? "2px solid var(--text-primary)" : "2px solid transparent",
                  background: LIST_COLOR_HEX[c],
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft !== label && onRename(draft.trim())}
        style={{ ...inputStyle, flex: 1, border: "none", background: "none", padding: "6px 0" }}
      />
      <button onClick={onDelete} title="Delete tag" style={deleteButtonStyle}>
        ×
      </button>
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
};

const swatchPanelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 8,
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  width: 130,
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const deleteButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 16,
  cursor: "pointer",
  padding: "0 4px",
  lineHeight: 1,
  flexShrink: 0,
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

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

const backButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 12px",
  cursor: "pointer",
};
