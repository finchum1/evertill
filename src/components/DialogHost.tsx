import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";

// Themed replacements for window.confirm()/window.prompt() — those were
// used in 11 files for rename/create/delete flows, and being native browser
// dialogs they ignore the app's dark/light theme and accent color entirely,
// the one place the UI broke its own polish. This is the one spot in the
// app that reaches for React Context rather than prop-drilling (see
// tc-dashboard-web's established App.tsx-owns-every-hook convention) —
// deliberately, since confirm/delete/create prompts are triggered from
// components nested arbitrarily deep (a "⋯" menu inside a card inside a
// board inside a page), and threading one imperative function through every
// intermediate component's props would be far more invasive than the
// convention it'd be breaking.
//
// Usage mirrors window.confirm/prompt's ergonomics on purpose, so call
// sites change minimally:
//   const ok = await dialogs.confirm({ message: `Delete "${x}"?`, danger: true });
//   const name = await dialogs.prompt({ message: "Folder name:" });

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogsApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type PendingDialog =
  | ({ kind: "confirm" } & ConfirmOptions & { resolve: (value: boolean) => void })
  | ({ kind: "prompt" } & PromptOptions & { resolve: (value: string | null) => void });

const DialogsContext = createContext<DialogsApi | null>(null);

export function useDialogs(): DialogsApi {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs() must be used inside <DialogsProvider>");
  return ctx;
}

// Mounted once, near the root of App.tsx, wrapping the whole app — provides
// the imperative API via context AND renders whichever dialog is currently
// pending (there's only ever one at a time; a second call while one is open
// simply replaces it, matching how a user can't meaningfully answer two
// blocking prompts at once anyway).
export function DialogsProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingDialog | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ kind: "confirm", resolve, ...options });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPending({ kind: "prompt", resolve, ...options });
    });
  }, []);

  const api = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  function settle(value: boolean | string | null) {
    if (!pending) return;
    // TypeScript can't narrow resolve's parameter type from the discriminated
    // union alone across this call boundary; the kind check right above it
    // is what actually guarantees value's type matches at each call site.
    (pending.resolve as (v: never) => void)(value as never);
    setPending(null);
  }

  return (
    <DialogsContext.Provider value={api}>
      {children}
      {pending?.kind === "confirm" && (
        <ConfirmDialog
          title={pending.title}
          message={pending.message}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          danger={pending.danger}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
      {pending?.kind === "prompt" && (
        <PromptDialog
          title={pending.title}
          message={pending.message}
          defaultValue={pending.defaultValue}
          placeholder={pending.placeholder}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          onSubmit={(value) => settle(value)}
          onCancel={() => settle(null)}
        />
      )}
    </DialogsContext.Provider>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DialogBackdrop onCancel={onCancel} labelledBy="dialog-title">
      <h2 id="dialog-title" style={dialogTitleStyle}>
        {title ?? (danger ? "Are you sure?" : "Confirm")}
      </h2>
      <p style={dialogMessageStyle}>{message}</p>
      <div style={dialogActionsStyle}>
        <button type="button" onClick={onCancel} style={ghostButtonStyle}>
          {cancelLabel}
        </button>
        <button
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          style={danger ? dangerButtonStyle : primaryButtonStyle}
        >
          {confirmLabel}
        </button>
      </div>
    </DialogBackdrop>
  );
}

function PromptDialog({
  title,
  message,
  defaultValue = "",
  placeholder,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
}: {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <DialogBackdrop onCancel={onCancel} labelledBy="dialog-title">
      <form onSubmit={handleSubmit}>
        <h2 id="dialog-title" style={dialogTitleStyle}>
          {title ?? message}
        </h2>
        {title && <p style={dialogMessageStyle}>{message}</p>}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={dialogInputStyle}
        />
        <div style={dialogActionsStyle}>
          <button type="button" onClick={onCancel} style={ghostButtonStyle}>
            {cancelLabel}
          </button>
          <button type="submit" disabled={!value.trim()} style={{ ...primaryButtonStyle, opacity: value.trim() ? 1 : 0.5 }}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// Same fixed-backdrop + centered-panel pattern every other modal in this app
// already uses (LeadCardModal, TaskModal, NoteModal, etc.) — clicking the
// backdrop cancels, matching those. role="alertdialog" + aria-modal since
// this always blocks on a single yes/no or text decision, never background
// content.
function DialogBackdrop({ children, onCancel, labelledBy }: { children: ReactNode; onCancel: () => void; labelledBy: string }) {
  return (
    <div
      onClick={onCancel}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 8, 23, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const dialogTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: "var(--text-primary)",
  margin: "0 0 8px",
  letterSpacing: "-0.01em",
};

const dialogMessageStyle: CSSProperties = {
  fontSize: 14,
  color: "var(--text-secondary)",
  lineHeight: 1.5,
  margin: "0 0 18px",
};

const dialogActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
};

const dialogInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
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

const primaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "var(--danger)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};
