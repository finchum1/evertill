// The 12 standard Contacts-tab fields every deal starts with, grouped for
// display. Seeded once per deal (see useDeals.ts's ensureContactFields) —
// after that they're just ordinary rows in deal_contact_fields, editable
// and deletable like any custom field a user adds on top of them.
export const FIXED_CONTACT_FIELDS: { group_label: string; label: string }[] = [
  { group_label: "Buyer", label: "Buyer Name" },
  { group_label: "Buyer", label: "Buyer Email" },
  { group_label: "Buyer", label: "Buyer Phone" },
  { group_label: "Seller", label: "Seller Name" },
  { group_label: "Seller", label: "Seller Email" },
  { group_label: "Seller", label: "Seller Phone" },
  { group_label: "Co-op Agent", label: "Co-op Agent" },
  { group_label: "Co-op Agent", label: "Co-op Agent Phone" },
  { group_label: "Lender", label: "Lender" },
  { group_label: "Lender", label: "Lender Phone" },
  { group_label: "Title", label: "Title Company" },
  { group_label: "Title", label: "Escrow Officer" },
];
