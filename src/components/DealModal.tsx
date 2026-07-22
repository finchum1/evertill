import { useState } from "react";
import type { CSSProperties } from "react";
import type { Deal, DealChecklistItem, DealChecklistKind, DealNote, DealStatus, DealType } from "../types";
import { DEAL_STATUSES } from "../types";
import { openDatePicker } from "../lib/datePicker";
import { DealChecklist } from "./DealChecklist";

interface DealModalProps {
  deal: Deal;
  notes: DealNote[];
  checklistItems: DealChecklistItem[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Deal>) => void;
  onDelete: (id: string) => void;
  onAddNote: (dealId: string, body: string) => void;
  onDeleteNote: (id: string) => void;
  onAddChecklistItem: (dealId: string, kind: DealChecklistKind, title: string) => void;
  onToggleChecklistItem: (id: string) => void;
  onDeleteChecklistItem: (id: string) => void;
}

export function DealModal({
  deal,
  notes,
  checklistItems,
  onClose,
  onUpdate,
  onDelete,
  onAddNote,
  onDeleteNote,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: DealModalProps) {
  const [address, setAddress] = useState(deal.address);
  const [value, setValue] = useState(String(deal.value || ""));
  const [price, setPrice] = useState(String(deal.price || ""));
  const [earnestMoney, setEarnestMoney] = useState(String(deal.earnest_money || ""));
  const [concessions, setConcessions] = useState(String(deal.concessions || ""));
  const [loanType, setLoanType] = useState(deal.loan_type ?? "");
  const [agentName, setAgentName] = useState(deal.agent_name ?? "");
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
          maxWidth: 560,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => address.trim() && address !== deal.address && onUpdate(deal.id, { address: address.trim() })}
          style={{ ...inputStyle, fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Type
            <select value={deal.type} onChange={(e) => onUpdate(deal.id, { type: e.target.value as DealType })} style={inputStyle}>
              <option value="Buyer">Buyer</option>
              <option value="Listing">Listing</option>
            </select>
          </label>
          <label style={labelStyle}>
            Status
            <select value={deal.status} onChange={(e) => onUpdate(deal.id, { status: e.target.value as DealStatus })} style={inputStyle}>
              {DEAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Agent
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            onBlur={() => onUpdate(deal.id, { agent_name: agentName.trim() || null })}
            placeholder="Agent name…"
            style={inputStyle}
          />
        </label>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Milestone dates</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Acceptance
              <input type="date" value={deal.acceptance_date ?? ""} onChange={(e) => onUpdate(deal.id, { acceptance_date: e.target.value || null })} onClick={openDatePicker} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Inspection
              <input type="date" value={deal.inspection_date ?? ""} onChange={(e) => onUpdate(deal.id, { inspection_date: e.target.value || null })} onClick={openDatePicker} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Appraisal
              <input type="date" value={deal.appraisal_date ?? ""} onChange={(e) => onUpdate(deal.id, { appraisal_date: e.target.value || null })} onClick={openDatePicker} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Closing
              <input type="date" value={deal.closing_date ?? ""} onChange={(e) => onUpdate(deal.id, { closing_date: e.target.value || null })} onClick={openDatePicker} style={inputStyle} />
            </label>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Value &amp; terms</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>
              Value
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => onUpdate(deal.id, { value: Number(value) || 0 })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Price
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => onUpdate(deal.id, { price: Number(price) || 0 })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Earnest money
              <input type="number" value={earnestMoney} onChange={(e) => setEarnestMoney(e.target.value)} onBlur={() => onUpdate(deal.id, { earnest_money: Number(earnestMoney) || 0 })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Concessions
              <input type="number" value={concessions} onChange={(e) => setConcessions(e.target.value)} onBlur={() => onUpdate(deal.id, { concessions: Number(concessions) || 0 })} style={inputStyle} />
            </label>
          </div>
          <label style={{ ...labelStyle, display: "block", marginTop: 12 }}>
            Loan type
            <input value={loanType} onChange={(e) => setLoanType(e.target.value)} onBlur={() => onUpdate(deal.id, { loan_type: loanType || null })} style={inputStyle} />
          </label>
        </div>

        <DealChecklist
          items={checklistItems}
          onAdd={(kind, title) => onAddChecklistItem(deal.id, kind, title)}
          onToggle={onToggleChecklistItem}
          onDelete={onDeleteChecklistItem}
        />

        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Notes</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newNote.trim()) return;
              onAddNote(deal.id, newNote.trim());
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
            onClick={() => {
              if (window.confirm(`Delete "${deal.address}"? This can't be undone.`)) {
                onDelete(deal.id);
                onClose();
              }
            }}
            style={dangerButtonStyle}
          >
            Delete Deal
          </button>
        </div>
      </div>
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
