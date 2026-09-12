import type { CSSProperties } from "react";
import { telHref, smsHref, mailtoHref } from "../lib/contactLinks";

// Small call/text/email action chips next to a Phone or Email field — a
// plain <a href="tel:...">/"sms:"/"mailto:"> hands off to the OS's own
// phone/messages/mail app, so there's no click handler beyond
// stopPropagation (these render inside rows/labels that are themselves
// sometimes clickable elsewhere, e.g. DealContactsTab's row isn't, but
// LeadCardModal's/PipelineCardModal's aren't either — kept for safety and
// consistency since a future row wrapper might be). Renders nothing when
// the field is empty — no point offering to call a blank number.

export function PhoneActions({ phone }: { phone: string }) {
  if (!phone.trim()) return null;
  return (
    <span style={wrapStyle}>
      <a href={telHref(phone)} onClick={(e) => e.stopPropagation()} title="Call" aria-label={`Call ${phone}`} style={actionStyle}>
        <PhoneIcon />
      </a>
      <a href={smsHref(phone)} onClick={(e) => e.stopPropagation()} title="Text" aria-label={`Text ${phone}`} style={actionStyle}>
        <MessageIcon />
      </a>
    </span>
  );
}

export function EmailActions({ email }: { email: string }) {
  if (!email.trim()) return null;
  return (
    <span style={wrapStyle}>
      <a href={mailtoHref(email)} onClick={(e) => e.stopPropagation()} title="Email" aria-label={`Email ${email}`} style={actionStyle}>
        <MailIcon />
      </a>
    </span>
  );
}

const wrapStyle: CSSProperties = {
  display: "inline-flex",
  gap: 4,
  flexShrink: 0,
};

const actionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 6,
  color: "var(--accent-light)",
  background: "color-mix(in srgb, var(--accent) 16%, transparent)",
  cursor: "pointer",
  textDecoration: "none",
  flexShrink: 0,
};

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
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
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
