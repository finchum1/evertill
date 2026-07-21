import { useState } from "react";
import type { CSSProperties } from "react";
import type { PipelineCard, PipelineColumn, PipelineNote } from "../types";

interface PipelineCardModalProps {
  card: PipelineCard;
  columns: PipelineColumn[];
  notes: PipelineNote[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<PipelineCard>) => void;
  onDelete: (id: string) => void;
  onAddNote: (cardId: string, body: string) => void;
  onDeleteNote: (id: string) => void;
}

export function PipelineCardModal({ card, columns, notes, onClose, onUpdate, onDelete, onAddNote, onDeleteNote }: PipelineCardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [value, setValue] = useState(String(card.value || ""));
  const [phone, setPhone] = useState(card.phone ?? "");
  const [email, setEmail] = useState(card.email ?? "");
  const [address, setAddress] = useState(card.address ?? "");
  const [newNote, setNewNote] = useState("");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 8, 23, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== card.title && onUpdate(card.id, { title: title.trim() })}
          style={{ ...inputStyle, fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0" }}
        />

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
          <input
            type="date"
            value={card.due_date ?? ""}
            onChange={(e) => onUpdate(card.id, { due_date: e.target.value || null })}
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 16 }}>
          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={card.tag_buyer} onChange={(e) => onUpdate(card.id, { tag_buyer: e.target.checked })} />
            Buyer
          </label>
          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={card.tag_listing} onChange={(e) => onUpdate(card.id, { tag_listing: e.target.checked })} />
            Listing
          </label>
        </div>

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
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Notes</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newNote.trim()) return;
              onAddNote(card.id, newNote.trim());
              setNewNote("");
            }}
            style={{ display: "flex", gap: 8, marginBottom: 10 }}
          >
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Log an activity or note…" style={{ ...inputStyle, flex: 1 }} />
            <button type="submit" style={smallPrimaryButtonStyle}>
              Log
            </button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notes.length === 0 && <span style={{ fontSize: 12, color: "#334155" }}>No notes yet.</span>}
            {notes.map((n) => (
              <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    {new Date(n.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <button onClick={() => onDeleteNote(n.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13 }}>
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
            onClick={() => {
              if (window.confirm(`Delete "${card.title}"? This can't be undone.`)) {
                onDelete(card.id);
                onClose();
              }
            }}
            style={dangerButtonStyle}
          >
            Delete Client
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  padding: "8px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const ghostButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "#ef4444",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
  flex: 1,
};

const smallPrimaryButtonStyle: CSSProperties = {
  background: "#4f46e5",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
};
