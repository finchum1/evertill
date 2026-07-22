export interface ParsedChecklistItem {
  group_label: string;
  title: string;
}

const ITEM_RE = /^[-*]\s*\[.?\]\s*(.+)$/;

// Parses a pasted markdown-style checklist: any line matching "- [ ] Title"
// or "* [ ] Title" is an item under the most recent non-item line, which is
// treated as that item's group heading (e.g. "First 7 Days"). Blank lines
// are ignored. Matches the shape TC brokerages already write their task
// checklists in, so a template can be built by pasting rather than
// re-typing every item through the Add form one at a time.
export function parseChecklistPaste(text: string): ParsedChecklistItem[] {
  const items: ParsedChecklistItem[] = [];
  let currentGroup = "";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const match = ITEM_RE.exec(line);
    if (match) {
      items.push({ group_label: currentGroup, title: match[1].trim() });
    } else {
      currentGroup = line.replace(/:$/, "").trim();
    }
  }
  return items;
}
