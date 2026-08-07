import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { LIST_COLORS, LIST_COLOR_HEX } from "../types";
import type { ListColor } from "../types";
import { useDialogs } from "./DialogHost";

interface ListMenuProps {
  name: string;
  // Folders don't have a color (todo_folders has no color column) — omit
  // both to hide the swatch row entirely rather than fake a color picker
  // for something that isn't a real property.
  color?: ListColor;
  onRename: (name: string) => void;
  onSetColor?: (color: ListColor) => void;
  onDelete: () => void;
  itemNoun?: string;
  // Overrides the generated "Delete X and all its Y?" wording entirely —
  // folders don't delete their contents (lists become unfiled), so the
  // itemNoun-based sentence would say something untrue for them.
  deleteMessage?: string;
}

// Small anchored popover (same pattern as CreateMenu) — color swatch picker,
// an inline-editable rename field (was a window.prompt(); a browser dialog
// for renaming something you can already see and click on is a bigger
// interruption than the action deserves — see DialogHost.tsx for where
// prompt() is still the right call, e.g. creating a brand-new item that has
// no on-screen row yet), and a themed delete confirmation.
// Reused for Tasks lists as well as Lead/Pipeline columns, hence itemNoun.
export function ListMenu({ name, color, onRename, onSetColor, onDelete, itemNoun = "tasks", deleteMessage }: ListMenuProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const dialogs = useDialogs();

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
  }

  function closeMenu() {
    if (renaming) commitRename();
    setRenaming(false);
    setOpen(false);
  }

  async function handleDelete() {
    setOpen(false);
    const ok = await dialogs.confirm({
      message: deleteMessage ?? `Delete "${name}" and all its ${itemNoun}? This can't be undone.`,
      danger: true,
      confirmLabel: "Delete",
    });
    if (ok) onDelete();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        title="List options"
        aria-label={`Options for ${name}`}
        onClick={() => {
          setDraftName(name);
          setOpen((o) => !o);
        }}
        style={menuButtonStyle}
      >
        ⋯
      </button>
      {open && (
        <>
          <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={panelStyle}>
            {onSetColor && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "2px 4px 8px" }}>
                {LIST_COLORS.map((c) => (
                  <button
                    key={c}
                    title={c}
                    aria-label={`Set color to ${c}`}
                    onClick={() => {
                      onSetColor(c);
                      setOpen(false);
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
            {renaming ? (
              <input
                ref={renameInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitRename();
                    setRenaming(false);
                    setOpen(false);
                  } else if (e.key === "Escape") {
                    setDraftName(name);
                    setRenaming(false);
                  }
                }}
                onBlur={() => {
                  commitRename();
                  setRenaming(false);
                  setOpen(false);
                }}
                style={renameInputStyle}
              />
            ) : (
              <button onClick={() => setRenaming(true)} style={itemButtonStyle}>
                Rename
              </button>
            )}
            <button onClick={handleDelete} style={{ ...itemButtonStyle, color: "var(--danger)" }}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const menuButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 14,
  cursor: "pointer",
  padding: "4px 6px",
  minWidth: 24,
  minHeight: 24,
  flexShrink: 0,
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 6,
  display: "flex",
  flexDirection: "column",
  minWidth: 160,
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const itemButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "none",
  borderRadius: 8,
  color: "var(--text-menu)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 10px",
  cursor: "pointer",
  textAlign: "left",
};

const renameInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "var(--border)",
  border: "1px solid var(--accent)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  marginBottom: 2,
};
