import { useState } from "react";
import type { CSSProperties } from "react";
import { LIST_COLORS, LIST_COLOR_HEX } from "../types";
import type { ListColor } from "../types";

interface ListMenuProps {
  name: string;
  color: ListColor;
  onRename: (name: string) => void;
  onSetColor: (color: ListColor) => void;
  onDelete: () => void;
  itemNoun?: string;
}

// Small anchored popover (same pattern as CreateMenu) replacing the old
// prompt()/confirm()-only "⋯" handler — adds a color swatch picker while
// keeping rename/delete as simple browser prompts, unchanged behavior-wise.
// Reused for Tasks lists as well as Lead/Pipeline columns, hence itemNoun.
export function ListMenu({ name, color, onRename, onSetColor, onDelete, itemNoun = "tasks" }: ListMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button title="List options" onClick={() => setOpen((o) => !o)} style={menuButtonStyle}>
        ⋯
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={panelStyle}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "2px 4px 8px" }}>
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  title={c}
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
            <button
              onClick={() => {
                setOpen(false);
                const next = window.prompt(`Rename "${name}":`, name);
                if (next?.trim()) onRename(next.trim());
              }}
              style={itemButtonStyle}
            >
              Rename
            </button>
            <button
              onClick={() => {
                setOpen(false);
                if (window.confirm(`Delete "${name}" and all its ${itemNoun}? This can't be undone.`)) onDelete();
              }}
              style={{ ...itemButtonStyle, color: "var(--danger)" }}
            >
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
