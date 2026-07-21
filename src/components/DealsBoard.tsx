import type { CSSProperties } from "react";
import { DEAL_STATUSES } from "../types";
import type { Deal } from "../types";
import { DealCardMini } from "./DealCardMini";

interface DealsBoardProps {
  deals: Deal[];
  onAddDeal: () => void;
  onOpenDeal: (id: string) => void;
}

export function DealsBoard({ deals, onAddDeal, onOpenDeal }: DealsBoardProps) {
  return (
    <div style={{ padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Deals</h1>
        <button onClick={onAddDeal} style={primaryButtonStyle}>
          + New Deal
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12 }}>
        {DEAL_STATUSES.map((status) => {
          const statusDeals = deals.filter((d) => d.status === status);
          const statusValue = statusDeals.reduce((sum, d) => sum + Number(d.value), 0);
          return (
            <div key={status} style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", flex: 1 }}>{status}</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{statusDeals.length}</span>
              </div>
              {statusValue > 0 && (
                <span style={{ fontSize: 11, color: "#475569", marginTop: -6 }}>
                  {statusDeals.length} deal{statusDeals.length === 1 ? "" : "s"} · ${statusValue.toLocaleString()}
                </span>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {statusDeals.map((deal) => (
                  <DealCardMini key={deal.id} deal={deal} onOpen={onOpenDeal} />
                ))}
                {statusDeals.length === 0 && (
                  <div style={{ color: "#334155", fontSize: 12, padding: "12px 0" }}>No deals</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
