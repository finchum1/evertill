// tel:/sms:/mailto: URIs — clicking one hands off to the OS's own
// phone/messages/mail app, no in-app handling needed beyond a plain <a
// href>. Phone numbers get stripped to digits/plus (a raw "(555) 123-4567"
// isn't a reliably valid tel:/sms: URI on every platform); email addresses
// just get trimmed. Shared here since Lead/Pipeline card modals and the
// Transactions Contacts tab all need the same normalization.
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function smsHref(phone: string): string {
  return `sms:${phone.replace(/[^\d+]/g, "")}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

// The Transactions Contacts tab has no separate "field type" - a row is
// just a free-text label + value (see lib/dealContactFields.ts's seed
// list: "Buyer Phone," "Seller Email," etc., plus whatever a user names
// their own custom field). Matching on the label text is the only signal
// available for whether a row's value is actually a phone number or email
// address worth turning into a call/text/email action.
export function looksLikePhoneLabel(label: string): boolean {
  return /phone/i.test(label);
}

export function looksLikeEmailLabel(label: string): boolean {
  return /email/i.test(label);
}
