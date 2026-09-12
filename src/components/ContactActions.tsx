import type { CSSProperties, ReactNode } from "react";
import { telHref, smsHref, mailtoHref } from "../lib/contactLinks";
import { appleMapsHref } from "../lib/mapsLink";

// Call / Text / Email / Directions as one labeled button row sitting right
// under a person's name (or, for a transaction's own address, right under
// its title) — plain <a href="tel:...">/"sms:"/"mailto:"/Apple Maps
// links> hand off to the OS's own phone/messages/mail/maps app, so there's
// no click handler beyond stopPropagation. A button whose underlying value
// is missing renders dim and inert (a real disabled <button>, not an <a>
// pointed at an empty address) rather than disappearing outright — the
// row's shape stays consistent whether or not this particular record has
// that field filled in.
//
// Each of phone/email/address is independently optional so a caller only
// gets the actions that are actually relevant to it: Lead/PipelineCardModal
// pass all three (Call/Text/Email/Directions); DealModal has no phone/email
// field on the deal itself, so it passes only `address` and gets a lone
// Directions button; DealContactsTab's per-person groups (Buyer, Seller,
// etc.) have no address field, so they pass only phone/email. A prop left
// `undefined` (not just empty) means "not applicable here" and its
// button(s) are omitted entirely, rather than rendered permanently dim.
interface ContactActionRowProps {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export function ContactActionRow({ phone, email, address }: ContactActionRowProps) {
  const items: { key: string; enabled: boolean; href?: string; icon: ReactNode; label: string; missingHint: string }[] = [];

  if (phone !== undefined) {
    const hasPhone = !!phone?.trim();
    items.push({ key: "call", enabled: hasPhone, href: hasPhone ? telHref(phone as string) : undefined, icon: <PhoneIcon />, label: "Call", missingHint: "No phone number on file" });
    items.push({ key: "text", enabled: hasPhone, href: hasPhone ? smsHref(phone as string) : undefined, icon: <MessageIcon />, label: "Text", missingHint: "No phone number on file" });
  }
  if (email !== undefined) {
    const hasEmail = !!email?.trim();
    items.push({ key: "email", enabled: hasEmail, href: hasEmail ? mailtoHref(email as string) : undefined, icon: <MailIcon />, label: "Email", missingHint: "No email on file" });
  }
  if (address !== undefined) {
    const hasAddress = !!address?.trim();
    items.push({ key: "directions", enabled: hasAddress, href: hasAddress ? appleMapsHref(address as string) : undefined, icon: <MapPinIcon />, label: "Directions", missingHint: "No address on file" });
  }

  if (items.length === 0) return null;

  return (
    <div style={rowStyle}>
      {items.map((item) => (
        <ContactAction key={item.key} enabled={item.enabled} href={item.href} icon={item.icon} label={item.label} missingHint={item.missingHint} />
      ))}
    </div>
  );
}

function ContactAction({
  enabled,
  href,
  icon,
  label,
  missingHint,
}: {
  enabled: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  missingHint: string;
}) {
  const content = (
    <>
      {icon}
      <span>{label}</span>
    </>
  );
  if (!enabled) {
    return (
      <button type="button" disabled title={missingHint} style={actionStyle(false)}>
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

function MapPinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 14.5C8 14.5 12.5 10.36 12.5 6.5C12.5 3.74 10.26 1.5 8 1.5C5.74 1.5 3.5 3.74 3.5 6.5C3.5 10.36 8 14.5 8 14.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.5" r="1.75" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
