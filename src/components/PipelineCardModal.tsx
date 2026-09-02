import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ListColor, PipelineCard, PipelineColumn, PipelineNote, Tag } from "../types";
import { DatePickerField } from "./DatePickerField";
import type { DatePickerFieldHandle } from "./DatePickerField";
import { TagPicker } from "./TagPicker";
import { useDialogs } from "./DialogHost";
import { MobileSheet } from "./MobileSheet";

interface PipelineCardModalProps {
  card: PipelineCard;
  columns: PipelineColumn[];
  notes: PipelineNote[];
  tags: Tag[];
  cardTagIds: string[];
  onSetCardTags: (id: string, tagIds: string[]) => void;
  onCreateTag: (label: string, color: ListColor) => Promise<Tag | undefined>;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<PipelineCard>) => void;
  onDelete: (id: string) => void;
  onAddNote: (cardId: string, body: string) => void;
  onDeleteNote: (id: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function PipelineCardModal({
  card,
  columns,
  notes,
  tags,
  cardTagIds,
  onSetCardTags,
  onCreateTag,
  onClose,
  onUpdate,
  onDelete,
  onAddNote,
  onDeleteNote,
  onPrev,
  onNext,
}: PipelineCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [value, setValue] = useState(String(card.value || ""));
  const [phone, setPhone] = useState(card.phone ?? "");
  const [email, setEmail] = useState(card.email ?? "");
  const [address, setAddress] = useState(card.address ?? "");
  const [newNote, setNewNote] = useState("");
  const dueDateRef = useRef<DatePickerFieldHandle>(null);
  const dialogs = useDialogs();

  return (
    <MobileSheet onClose={onClose} maxWidth={520}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== card.title && onUpdate(card.id, { title: title.trim() })}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0", flex: 1, minWidth: 0 }}
          />
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={onPrev} disabled={!onPrev} title="Previous in column" aria-label="Previous card in column" style={navButtonStyle(!!onPrev)}>
              <ArrowIcon direction="left" />
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} title="Next in column" aria-label="Next card in column" style={navButtonStyle(!!onNext)}>
              <ArrowIcon direction="right" />
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Value
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => onUpdate(card.id, { value: Number(value) || 0 })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Column
            <select value={card.column_id} onChange={(e) => onUpdate(card.id, { column_id: e.target.value })} style={inputStyle}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Next activity
          <DatePickerField
            ref={dueDateRef}
            value={card.due_date}
            onChange={(due_date) => onUpdate(card.id, { due_date })}
          />
        </label>

        <label style={labelStyle}>
          Tags
          <TagPicker tags={tags} selectedIds={cardTagIds} onChange={(ids) => onSetCardTags(card.id, ids)} onCreateTag={onCreateTag} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => onUpdate(card.id, { phone: phone || null })} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => onUpdate(card.id, { email: email || null })} style={inputStyle} />
          </label>
        </div>
        <label style={labelStyle}>
          Address
          <input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => onUpdate(card.id, { address: address || null })} style={inputStyle} />
        </label>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Notes</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newNote.trim()) return;
              onAddNote(card.id, newNote.trim());
              setNewNote("");
              dueDateRef.current?.open();
            }}
            style={{ display: "flex", gap: 8, marginBottom: 10 }}
          >
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Log an activity or note…" style={{ ...inputStyle, flex: 1 }} />
            <button type="submit" style={smallPrimaryButtonStyle}>
              Log
            </button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.length === 0 && <span style={{ fontSize: 12, color: "var(--border-strong)" }}>No notes yet.</span>}
            {notes.map((n) => (
              <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text-body)" }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <button onClick={() => onDeleteNote(n.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={ghostButtonStyle}>
            Close
          </button>
          <button
            onClick={async () => {
              const ok = await dialogs.confirm({ message: `Delete "${card.title}"? This can't be undone.`, danger: true, confirmLabel: "Delete" });
              if (ok) {
                onDelete(card.id);
                onClose();
              }
            }}
            style={dangerButtonStyle}
          >
            Delete Client
          </button>
        </div>
    </MobileSheet>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M8 2.5L4.5 6L8 9.5" : "M4 2.5L7.5 6L4 9.5";
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function navButtonStyle(enabled: boolean): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 99,
    border: "1px solid var(--border-strong)",
    background: "none",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.35,
  };
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  padding: "8px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const ghostButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "var(--danger)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
  flex: 1,
};

const smallPrimaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
};
