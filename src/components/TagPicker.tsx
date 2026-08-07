import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { LIST_COLORS, LIST_COLOR_HEX } from "../types";
import type { ListColor, Tag } from "../types";

interface TagPickerProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateTag: (label: string, color: ListColor) => Promise<Tag | undefined>;
}

// Anchored pill + popover (same self-contained trigger/panel pattern as
// DatePickerField/ListMenu/CreateMenu) replacing the old fixed Buyer/Listing
// checkboxes — a multi-select, creatable dropdown backed by the shared,
// user-editable tags list (Settings > Tags). Uses the same capture-phase
// document listener as DatePickerField for outside-click dismissal rather
// than a nested fixed-position overlay, since this lives inside the same
// kind of scrollable modal (LeadCardModal/PipelineCardModal) where a nested
// overlay gets clipped by the modal's own overflow-y: auto.
export function TagPicker({ tags, selectedIds, onChange, onCreateTag }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown, true);
    return () => document.removeEventListener("mousedown", handlePointerDown, true);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      // Focus after the panel actually mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id));
  const filtered = tags.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = tags.some((t) => t.label.toLowerCase() === query.trim().toLowerCase());

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function handleCreate() {
    const label = query.trim();
    if (!label || creating) return;
    setCreating(true);
    try {
      const color = LIST_COLORS[tags.length % LIST_COLORS.length];
      const created = await onCreateTag(label, color);
      if (created) onChange([...selectedIds, created.id]);
      setQuery("");
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={wrapperRef} onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={triggerStyle}>
        {selectedTags.length === 0 ? (
          <span style={{ color: "var(--text-muted)" }}>+ Add tag</span>
        ) : (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selectedTags.map((t) => (
              <span key={t.id} style={pillStyle(LIST_COLOR_HEX[t.color])}>
                {t.label}
              </span>
            ))}
          </span>
        )}
        <PlusIcon />
      </button>

      {open && (
        <div style={panelStyle}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !exactMatch && query.trim()) {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Search or create a tag…"
            style={searchInputStyle}
          />
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 220, overflowY: "auto" }}>
            {filtered.map((t) => {
              const isSelected = selectedIds.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)} style={rowButtonStyle}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: LIST_COLOR_HEX[t.color], flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                  {isSelected && <CheckIcon />}
                </button>
              );
            })}
            {filtered.length === 0 && !query.trim() && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 6px" }}>No tags yet — start typing to create one.</div>
            )}
            {query.trim() && !exactMatch && (
              <button type="button" onClick={handleCreate} disabled={creating} style={{ ...rowButtonStyle, color: "var(--accent-light)" }}>
                <PlusIcon />
                <span style={{ flex: 1, textAlign: "left" }}>Create "{query.trim()}"</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2.5 6.8L5 9.3L10.5 3.5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function pillStyle(color: string): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    color,
    background: `${color}20`,
    borderRadius: 5,
    padding: "2px 7px",
  };
}

const triggerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  fontSize: 13,
  padding: "7px 10px",
  cursor: "pointer",
  minHeight: 34,
  boxSizing: "border-box",
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 8,
  width: 240,
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const searchInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "7px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const rowButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  background: "none",
  border: "none",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 8px",
  cursor: "pointer",
  textAlign: "left",
};
