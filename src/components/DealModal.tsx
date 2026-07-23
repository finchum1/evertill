import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Deal, DealChecklistItem, DealChecklistKind, DealContactField, DealNote, DealStatus, DealType } from "../types";
import { DEAL_STATUSES, DEAL_STATUS_COLOR } from "../types";
import { openDatePicker } from "../lib/datePicker";
import { DealChecklist } from "./DealChecklist";
import { DealContactsTab } from "./DealContactsTab";
import { checklistProgress } from "../lib/dealChecklistProgress";

interface DealModalProps {
  deal: Deal;
  notes: DealNote[];
  checklistItems: DealChecklistItem[];
  contactFields: DealContactField[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Deal>) => void;
  onDelete: (id: string) => void;
  onAddNote: (dealId: string, body: string) => void;
  onDeleteNote: (id: string) => void;
  onAddChecklistItem: (dealId: string, kind: DealChecklistKind, title: string) => void;
  onToggleChecklistItem: (id: string) => void;
  onDeleteChecklistItem: (id: string) => void;
  onEnsureContactFields: (dealId: string) => void;
  onAddContactField: (dealId: string, label: string) => void;
  onUpdateContactField: (id: string, value: string) => void;
  onDeleteContactField: (id: string) => void;
  onMoveToPipeline: (deal: Deal) => void;
}

const TABS = ["Overview", "Contacts", "Notes"] as const;
type DealTab = (typeof TABS)[number];

const TYPE_COLOR: Record<DealType, string> = { Buyer: "#3b82f6", Listing: "#a855f7" };

export function DealModal({
  deal,
  notes,
  checklistItems,
  contactFields,
  onClose,
  onUpdate,
  onDelete,
  onAddNote,
  onDeleteNote,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onEnsureContactFields,
  onAddContactField,
  onUpdateContactField,
  onDeleteContactField,
  onMoveToPipeline,
}: DealModalProps) {
  const [tab, setTab] = useState<DealTab>("Overview");
  const [address, setAddress] = useState(deal.address);
  const { percent } = checklistProgress(checklistItems);

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
          maxWidth: 720,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={deal.type}
              onChange={(e) => onUpdate(deal.id, { type: e.target.value as DealType })}
              style={pillSelectStyle(TYPE_COLOR[deal.type])}
            >
              <option value="Buyer">Buyer</option>
              <option value="Listing">Listing</option>
            </select>
            <select
              value={deal.status}
              onChange={(e) => onUpdate(deal.id, { status: e.target.value as DealStatus })}
              style={pillSelectStyle(DEAL_STATUS_COLOR[deal.status])}
            >
              {DEAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">
            ×
          </button>
        </div>

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => address.trim() && address !== deal.address && onUpdate(deal.id, { address: address.trim() })}
          style={{ ...inputStyle, fontSize: 20, fontWeight: 700, border: "none", padding: "0", background: "none" }}
        />

        <div>
          <div style={progressTrackStyle}>
            <div style={{ ...progressFillStyle, width: `${percent}%` }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{percent}% complete</div>
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...tabButtonStyle,
                color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <OverviewTab deal={deal} onUpdate={onUpdate} checklistItems={checklistItems} onAddChecklistItem={onAddChecklistItem} onToggleChecklistItem={onToggleChecklistItem} onDeleteChecklistItem={onDeleteChecklistItem} />
        )}
        {tab === "Contacts" && (
          <DealContactsTab
            dealId={deal.id}
            contactFields={contactFields}
            onEnsure={onEnsureContactFields}
            onAdd={onAddContactField}
            onUpdate={onUpdateContactField}
            onDelete={onDeleteContactField}
          />
        )}
        {tab === "Notes" && <NotesTab deal={deal} notes={notes} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            onClick={() => {
              if (window.confirm(`Move "${deal.address}" back to Pipeline? This removes it from Deals — use this when a deal busts.`)) {
                onMoveToPipeline(deal);
                onClose();
              }
            }}
            style={secondaryButtonStyle}
          >
            Move to Pipeline
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

function OverviewTab({
  deal,
  onUpdate,
  checklistItems,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: {
  deal: Deal;
  onUpdate: (id: string, patch: Partial<Deal>) => void;
  checklistItems: DealChecklistItem[];
  onAddChecklistItem: (dealId: string, kind: DealChecklistKind, title: string) => void;
  onToggleChecklistItem: (id: string) => void;
  onDeleteChecklistItem: (id: string) => void;
}) {
  const [value, setValue] = useState(String(deal.value || ""));
  const [price, setPrice] = useState(String(deal.price || ""));
  const [earnestMoney, setEarnestMoney] = useState(String(deal.earnest_money || ""));
  const [concessions, setConcessions] = useState(String(deal.concessions || ""));
  const [loanType, setLoanType] = useState(deal.loan_type ?? "");
  const [agentName, setAgentName] = useState(deal.agent_name ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <FieldCard label="Acceptance date">
          <input
            type="date"
            value={deal.acceptance_date ?? ""}
            onChange={(e) => onUpdate(deal.id, { acceptance_date: e.target.value || null })}
            onClick={openDatePicker}
            style={fieldInputStyle}
          />
        </FieldCard>
        <FieldCard label="Inspection date">
          <input
            type="date"
            value={deal.inspection_date ?? ""}
            onChange={(e) => onUpdate(deal.id, { inspection_date: e.target.value || null })}
            onClick={openDatePicker}
            style={fieldInputStyle}
          />
        </FieldCard>
        <FieldCard label="Appraisal date">
          <input
            type="date"
            value={deal.appraisal_date ?? ""}
            onChange={(e) => onUpdate(deal.id, { appraisal_date: e.target.value || null })}
            onClick={openDatePicker}
            style={fieldInputStyle}
          />
        </FieldCard>
        <FieldCard label="Closing date">
          <input
            type="date"
            value={deal.closing_date ?? ""}
            onChange={(e) => onUpdate(deal.id, { closing_date: e.target.value || null })}
            onClick={openDatePicker}
            style={fieldInputStyle}
          />
        </FieldCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <FieldCard label="Value ($)">
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => onUpdate(deal.id, { value: Number(value) || 0 })} style={fieldInputStyle} />
        </FieldCard>
        <FieldCard label="Price ($)">
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => onUpdate(deal.id, { price: Number(price) || 0 })} style={fieldInputStyle} />
        </FieldCard>
        <FieldCard label="Earnest money ($)">
          <input
            type="number"
            value={earnestMoney}
            onChange={(e) => setEarnestMoney(e.target.value)}
            onBlur={() => onUpdate(deal.id, { earnest_money: Number(earnestMoney) || 0 })}
            style={fieldInputStyle}
          />
        </FieldCard>
        <FieldCard label="Concessions ($)">
          <input
            type="number"
            value={concessions}
            onChange={(e) => setConcessions(e.target.value)}
            onBlur={() => onUpdate(deal.id, { concessions: Number(concessions) || 0 })}
            style={fieldInputStyle}
          />
        </FieldCard>
        <FieldCard label="Loan type">
          <input
            value={loanType}
            onChange={(e) => setLoanType(e.target.value)}
            onBlur={() => onUpdate(deal.id, { loan_type: loanType || null })}
            placeholder="e.g. Conventional"
            style={fieldInputStyle}
          />
        </FieldCard>
        <FieldCard label="Agent">
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            onBlur={() => onUpdate(deal.id, { agent_name: agentName.trim() || null })}
            placeholder="Agent name…"
            style={fieldInputStyle}
          />
        </FieldCard>
      </div>

      <DealChecklist
        items={checklistItems}
        onAdd={(kind, title) => onAddChecklistItem(deal.id, kind, title)}
        onToggle={onToggleChecklistItem}
        onDelete={onDeleteChecklistItem}
      />
    </div>
  );
}

function NotesTab({
  deal,
  notes,
  onAddNote,
  onDeleteNote,
}: {
  deal: Deal;
  notes: DealNote[];
  onAddNote: (dealId: string, body: string) => void;
  onDeleteNote: (id: string) => void;
}) {
  const [newNote, setNewNote] = useState("");

  return (
    <div>
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
  );
}

function FieldCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={fieldCardStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
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

const fieldCardStyle: CSSProperties = {
  background: "var(--bg-panel-nested)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-secondary)",
  marginBottom: 4,
};

const fieldInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "none",
  color: "var(--text-primary)",
  fontSize: 14,
  fontWeight: 600,
  padding: 0,
  outline: "none",
  fontFamily: "inherit",
};

const closeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const progressTrackStyle: CSSProperties = {
  width: "100%",
  height: 6,
  borderRadius: 99,
  background: "var(--border)",
  overflow: "hidden",
};

const progressFillStyle: CSSProperties = {
  height: "100%",
  background: "var(--accent)",
  borderRadius: 99,
};

const tabButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 4px",
  marginBottom: -1,
  cursor: "pointer",
};

function pillSelectStyle(color: string): CSSProperties {
  return {
    background: `${color}20`,
    border: "none",
    borderRadius: 99,
    color,
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 12px",
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "var(--danger)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
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
