import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { DealContactField } from "../types";
import { useDialogs } from "./DialogHost";
import { ContactActionRow } from "./ContactActions";
import { looksLikePhoneLabel, looksLikeEmailLabel } from "../lib/contactLinks";

interface DealContactsTabProps {
  dealId: string;
  contactFields: DealContactField[];
  onEnsure: (dealId: string) => void;
  onAdd: (dealId: string, label: string) => void;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}

// Groups fields by group_label, preserving first-seen (sort_order) order —
// the 5 standard sections (Buyer/Seller/Co-op Agent/Lender/Title) come from
// FIXED_CONTACT_FIELDS's own seed order; anything with an empty group_label
// ("+ Add custom field") ends up in its own unlabeled bucket, rendered last
// since custom fields are always appended after the seeded ones.
function groupFields(fields: DealContactField[]) {
  const groups: { label: string; fields: DealContactField[] }[] = [];
  for (const field of fields) {
    let group = groups.find((g) => g.label === field.group_label);
    if (!group) {
      group = { label: field.group_label, fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
}

export function DealContactsTab({ dealId, contactFields, onEnsure, onAdd, onUpdate, onDelete }: DealContactsTabProps) {
  // Existing deals from before this feature shipped have zero contact
  // fields — back-seed them the first time this tab is actually opened,
  // same lazy-ensure pattern as ensureInboxList/ensureDefaultTemplates.
  useEffect(() => {
    onEnsure(dealId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const groups = groupFields(contactFields);
  const dialogs = useDialogs();

  async function handleAddCustom() {
    const label = await dialogs.prompt({ message: "Field label:", placeholder: "e.g. Inspector" });
    if (label) onAdd(dealId, label);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map((group) => (
        <div key={group.label || "__custom"}>
          {group.label && <div style={groupHeaderStyle}>{group.label}</div>}
          <div style={cardStyle}>
            {/* A named group (Buyer/Seller/Co-op Agent/Lender/Title) always
                seeds its identity field first (see FIXED_CONTACT_FIELDS) —
                the Call/Text/Email row sits right under that "name" row,
                before the rest of the group's own fields, the same "buttons
                under the name" placement Lead/PipelineCardModal use for
                their own Phone/Email. Ungrouped custom fields have no such
                identity field to anchor a row under, so they stay a plain
                flat list, unchanged. */}
            {group.label ? (
              <NamedContactGroup fields={group.fields} onUpdate={onUpdate} onDelete={onDelete} />
            ) : (
              group.fields.map((field, i) => (
                <ContactFieldRow
                  key={field.id}
                  field={field}
                  isLast={i === group.fields.length - 1}
                  deletable
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </div>
      ))}
      <button onClick={handleAddCustom} style={addFieldButtonStyle}>
        + Add custom field
      </button>
    </div>
  );
}

function NamedContactGroup({
  fields,
  onUpdate,
  onDelete,
}: {
  fields: DealContactField[];
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [nameField, ...restFields] = fields;
  const phoneField = fields.find((f) => looksLikePhoneLabel(f.label));
  const emailField = fields.find((f) => looksLikeEmailLabel(f.label));
  const showActions = !!phoneField || !!emailField;

  return (
    <>
      <ContactFieldRow field={nameField} isLast={false} deletable={false} onUpdate={onUpdate} onDelete={onDelete} />
      {showActions && (
        <div style={{ padding: "2px 14px 14px", borderBottom: restFields.length > 0 ? "1px solid var(--border)" : "none" }}>
          <ContactActionRow phone={phoneField?.value} email={emailField?.value} />
        </div>
      )}
      {restFields.map((field, i) => (
        <ContactFieldRow key={field.id} field={field} isLast={i === restFields.length - 1} deletable={false} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </>
  );
}

function ContactFieldRow({
  field,
  isLast,
  deletable,
  onUpdate,
  onDelete,
}: {
  field: DealContactField;
  isLast: boolean;
  deletable: boolean;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [value, setValue] = useState(field.value);

  return (
    <div style={{ ...rowStyle, borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <span style={rowLabelStyle}>{field.label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== field.value && onUpdate(field.id, value)}
        style={rowInputStyle}
      />
      {deletable && (
        <button onClick={() => onDelete(field.id)} style={removeButtonStyle}>
          ×
        </button>
      )}
    </div>
  );
}

const groupHeaderStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
  marginBottom: 6,
};

const cardStyle: CSSProperties = {
  background: "var(--bg-panel-nested)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  overflow: "hidden",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
};

const rowLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-body)",
  minWidth: 150,
  flexShrink: 0,
};

const rowInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "7px 10px",
  outline: "none",
  fontFamily: "inherit",
};

const removeButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 15,
  flexShrink: 0,
};

const addFieldButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--accent-light)",
  fontSize: 13,
  fontWeight: 600,
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  alignSelf: "flex-start",
};
