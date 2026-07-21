import { dateToKey } from "./dates";

// Recognizes "today"/"tomorrow"/a bare weekday ("Thursday" — next occurrence,
// today counts)/"this <weekday>" (same as bare)/"next <weekday>" (skips today
// even if today is that weekday) anywhere in a task title. Local-date math
// throughout (never toISOString), so a date never shifts a day earlier for
// users west of UTC.
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const SMART_DATE_RE = new RegExp(
  `\\b(next|this)\\s+(${DAY_NAMES.join("|")})\\b|\\b(${DAY_NAMES.join("|")})\\b|\\b(today|tomorrow)\\b`,
  "i"
);

export interface SmartDateMatch {
  dueDate: string;
  title: string;
}

export interface SmartDatePhraseRange {
  start: number;
  end: number;
}

// Lighter-weight than parseSmartDueDate — just where the matched phrase sits
// in the raw text, for live-highlighting as the user types (no date math).
export function matchSmartDuePhrase(text: string): SmartDatePhraseRange | null {
  const m = SMART_DATE_RE.exec(text);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}

export function parseSmartDueDate(text: string): SmartDateMatch | null {
  const m = SMART_DATE_RE.exec(text);
  if (!m) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(today);

  if (m[4]) {
    if (m[4].toLowerCase() === "tomorrow") due.setDate(due.getDate() + 1);
    // "today" needs no adjustment.
  } else {
    const dayName = (m[2] || m[3]).toLowerCase();
    const targetIdx = DAY_NAMES.indexOf(dayName);
    let diff = (targetIdx - today.getDay() + 7) % 7;
    if (m[1] && m[1].toLowerCase() === "next" && diff === 0) diff = 7;
    due.setDate(due.getDate() + diff);
  }

  const cleanedTitle = (text.slice(0, m.index) + text.slice(m.index + m[0].length))
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();

  return { dueDate: dateToKey(due), title: cleanedTitle };
}
