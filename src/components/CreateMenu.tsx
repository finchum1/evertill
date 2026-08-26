import { useState } from "react";
import type { CSSProperties } from "react";
import type { Page } from "../types";

export type CreateType = "task" | "lead" | "pipeline" | "deal" | "note";

const ITEMS: { key: CreateType; label: string; page: Page }[] = [
  { key: "task", label: "Task", page: "tasks" },
  { key: "note", label: "Note", page: "notes" },
  { key: "lead", label: "Lead", page: "leads" },
  { key: "pipeline", label: "Pipeline", page: "pipeline" },
  { key: "deal", label: "Deal", page: "deals" },
];

export function CreateMenu({
  onSelect,
  hiddenModules,
  allowedTypes,
}: {
  onSelect: (type: CreateType) => void;
  hiddenModules: string[];
  // Scopes the menu to whichever app is currently open (Tasks+Notes vs
  // Leads+Pipeline+Deals) — omit to show every non-hidden type, same as
  // before the app split existed.
  allowedTypes?: CreateType[];
}) {
  const [open, setOpen] = useState(false);
  const visibleItems = ITEMS.filter((item) => !hiddenModules.includes(item.page) && (!allowedTypes || allowedTypes.includes(item.key)));

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={createButtonStyle}>
        + Create
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={menuStyle}>
            {visibleItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setOpen(false);
                  onSelect(item.key);
                }}
                style={menuItemStyle}
              >
                <CreateIcon type={item.key} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreateIcon({ type }: { type: CreateType }) {
  const common = { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (type === "task") {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.5 8L7 10.5L11.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "lead") {
    return (
      <svg {...common}>
        <path d="M2 3h12l-4.5 6v4l-3 1.5V9L2 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "pipeline") {
    return (
      <svg {...common}>
        <path d="M2 8h10M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "note") {
    return (
      <svg {...common}>
        <path
          d="M4.5 2.5H9.5L12.5 5.5V13C12.5 13.28 12.28 13.5 12 13.5H4.5C4.22 13.5 4 13.28 4 13V3C4 2.72 4.22 2.5 4.5 2.5Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M6 8H10.5M6 10.5H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 2l6 3.2v5.6L8 14l-6-3.2V5.2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M2 5.2L8 8.4l6-3.2M8 8.4V14" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

const createButtonStyle: CSSProperties = {
  background: "var(--accent)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  padding: "7px 14px",
  cursor: "pointer",
};

const menuStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 160,
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const menuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
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
