import type { CSSProperties, ReactNode } from "react";
import { telHref, smsHref, mailtoHref } from "../lib/contactLinks";

// Call / Text / Email as one labeled button row sitting right under a
// person's name — a plain <a href="tel:...">/"sms:"/"mailto:"> hands off
// to the OS's own phone/messages/mail app, so there's no click handler
// beyond stopPropagation. A button whose underlying value is missing
// renders dim and inert (a real disabled <button>, not an <a> pointed at
// an empty tel:/mailto: address) rather than disappearing outright — the
// row's shape stays the same whether or not this particular person has a
// phone or email on file.
export function ContactActionRow({ phone, email }: { phone?: string | null; email?: string | null }) {
  const hasPhone = !!phone?.trim();
  const hasEmail = !!email?.trim();
  return (
    <div style={rowStyle}>
      <ContactAction enabled={hasPhone} href={hasPhone ? telHref(phone as string) : undefined} icon={<PhoneIcon />} label="Call" />
      <ContactAction enabled={hasPhone} href={hasPhone ? smsHref(phone as string) : undefined} icon={<MessageIcon />} label="Text" />
      <ContactAction enabled={hasEmail} href={hasEmail ? mailtoHref(email as string) : undefined} icon={<MailIcon />} label="Email" />
    </div>
  );
}

function ContactAction({ enabled, href, icon, label }: { enabled: boolean; href?: string; icon: ReactNode; label: string }) {
  const content = (
    <>
      {icon}
      <span>{label}</span>
    </>
  );
  if (!enabled) {
    return (
      <button type="button" disabled title={`No ${label === "Email" ? "email" : "phone number"} on file`} style={actionStyle(false)}>
        {content}
      </button>
    );
  }
  return (
    <a href={href} onClick={(e) => e.stopPropagation()} style={actionStyle(true)}>
      {content}
    </a>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
};

function actionStyle(enabled: boolean): CSSProperties {
  return {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 0",
    borderRadius: 10,
    border: "none",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit",
    textDecoration: "none",
    color: enabled ? "var(--accent-light)" : "var(--text-muted)",
    background: enabled ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--border)",
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.5,
  };
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 2.5H6.5L7.5 5L6 6.5C6.5 7.8 7.2 8.5 8.5 9L10 7.5L12.5 8.5V10.5C12.5 11.05 12.05 11.5 11.5 11.5C7 11.5 3.5 8 3.5 3.5C3.5 2.95 3.95 2.5 4.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 3.5C2 2.95 2.45 2.5 3 2.5H13C13.55 2.5 14 2.95 14 3.5V9.5C14 10.05 13.55 10.5 13 10.5H6L3 13V10.5H3C2.45 10.5 2 10.05 2 9.5V3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
