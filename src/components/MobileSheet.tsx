import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useIsMobile } from "../hooks/useMediaQuery";

interface MobileSheetProps {
  onClose: () => void;
  // The desktop dialog's own sizing — each of TaskModal/NoteModal/
  // LeadCardModal had slightly different values here before this component
  // existed. Ignored on phone widths entirely (a bottom sheet is always
  // full-width); maxHeight still caps how tall the sheet can grow there.
  maxWidth: number;
  maxHeight?: string;
  // Mobile only: forces the sheet to exactly maxHeight instead of just
  // capping it there — a short piece of content (a couple of fields) would
  // otherwise leave the sheet only as tall as it needs to be, which reads
  // as a small popup rather than the large, immersive editing surface
  // NoteModal wants (its rich-text body should get real room to work in,
  // not just whatever its current content happens to need).
  fillHeight?: boolean;
  // Every current caller (TaskModal, NoteModal, etc.) passes bare content
  // that relies on this sheet's own padding — TasksListsButton's Lists
  // sheet is the first to pass a child (Sidebar) that already carries its
  // own internal padding designed for a drawer/rail context, where this
  // sheet's default would just double it up.
  contentPadding?: CSSProperties["padding"];
  children: ReactNode;
}

// A drag-past-this-many-px-of-downward-travel dismiss threshold — short
// enough to feel responsive, long enough that an accidental small scroll-y
// touch on the handle doesn't close the sheet by mistake.
const DISMISS_THRESHOLD = 120;

// Shared outer shell for TaskModal/NoteModal/LeadCardModal/DealModal/
// PipelineCardModal/NewDealModal, which previously each hand-rolled their
// own two wrapper divs (backdrop + centered panel). On desktop widths this
// renders that exact same centered dialog, unchanged pixel for pixel. Below
// the useIsMobile() breakpoint it becomes an iOS-style bottom sheet
// instead: slides up from off-screen on mount, has a drag handle, and
// supports drag-to-dismiss (past DISMISS_THRESHOLD, or released mid-drag
// past it, closes; anything short of that snaps back) — a centered popup
// dialog is a desktop-web pattern, not how a phone-optimized flow presents
// a detail view. Each modal still owns 100% of its own internal content —
// this only ever touches the two wrappers around it. Re-evaluates live on
// resize/rotation (useIsMobile is a real hook, not a static flag), so a
// sheet already open when the window crosses the breakpoint re-renders in
// the right shape rather than needing a remount.
export function MobileSheet({ onClose, maxWidth, maxHeight = "85vh", fillHeight, contentPadding, children }: MobileSheetProps) {
  const isMobile = useIsMobile();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [entered, setEntered] = useState(false);
  const startYRef = useRef(0);

  useEffect(() => {
    if (!isMobile) return;
    // One frame so the initial translateY(100%) actually paints before
    // flipping to translateY(0) — flipping both in the same frame would
    // skip the slide-in transition entirely.
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isMobile]);

  if (!isMobile) {
    return (
      <div onClick={onClose} style={backdropStyle}>
        <div onClick={(e) => e.stopPropagation()} style={{ ...dialogPanelStyle, maxWidth, maxHeight }}>
          {children}
        </div>
      </div>
    );
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    setIsDragging(true);
    startYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  }
  function endDrag() {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > DISMISS_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  return (
    <div onClick={onClose} style={sheetBackdropStyle}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...sheetPanelStyle,
          maxHeight,
          height: fillHeight ? maxHeight : undefined,
          transform: entered ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: isDragging ? "none" : "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} style={dragHandleZoneStyle}>
          <div style={dragHandleStyle} />
        </div>
        <div
          style={{
            ...sheetContentStyle,
            ...(contentPadding !== undefined ? { padding: contentPadding } : null),
            // Only when fillHeight also gave the panel itself a fixed
            // height, not auto — flex:1 on a child needs a sized flex
            // container to actually grow into, and would otherwise fight
            // unpredictably with the plain max-height cap the other sheets
            // (Lists, task/lead/deal detail) rely on to just hug their own
            // content instead of always filling the full cap.
            ...(fillHeight ? { flex: 1 } : null),
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 8, 23, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 24,
};

// Identical to what TaskModal/NoteModal/LeadCardModal each used to render
// directly — unchanged desktop appearance.
const dialogPanelStyle: CSSProperties = {
  width: "100%",
  overflowY: "auto",
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "28px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
};

// No padding, and stacks its one child at the bottom edge (flexDirection
// column + justifyContent flex-end) — the sheet itself is full-bleed
// against the screen edges, unlike the desktop backdrop's centered, inset
// dialog.
const sheetBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 8, 23, 0.7)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  zIndex: 50,
};

const sheetPanelStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderBottom: "none",
  borderRadius: "20px 20px 0 0",
  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
  paddingBottom: "env(safe-area-inset-bottom)",
};

const dragHandleZoneStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "10px 0 6px",
  touchAction: "none",
  cursor: "grab",
  flexShrink: 0,
};

const dragHandleStyle: CSSProperties = {
  width: 36,
  height: 5,
  borderRadius: 99,
  background: "var(--border-strong)",
};

const sheetContentStyle: CSSProperties = {
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: "0 24px 24px",
};
