import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { DealType } from "../types";

interface NewDealModalProps {
  onClose: () => void;
  onCreate: (address: string, type: DealType, acceptanceDate: string | null) => void;
}

export function NewDealModal({ onClose, onCreate }: NewDealModalProps) {
  const [address, setAddress] = useState("");
  const [type, setType] = useState<DealType>("Buyer");
  const [acceptanceDate, setAcceptanceDate] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    onCreate(address.trim(), type, acceptanceDate || null);
  }

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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>New Deal</h1>

        <label style={labelStyle}>
          Property address
          <input required autoFocus value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            Type
            <select value={type} onChange={(e) => setType(e.target.value as DealType)} style={inputStyle}>
              <option value="Buyer">Buyer</option>
              <option value="Listing">Listing</option>
            </select>
          </label>
          <label style={labelStyle}>
            Acceptance date
            <input type="date" value={acceptanceDate} onChange={(e) => setAcceptanceDate(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>
            Cancel
          </button>
          <button type="submit" style={primaryButtonStyle}>
            Create deal
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
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

const primaryButtonStyle: CSSProperties = {
  background: "#4f46e5",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};
