// Local-date math throughout (never toISOString/toISODateString), so a date
// never shifts a day earlier for users west of UTC.
export function dateToKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayKey(): string {
  return dateToKey(new Date());
}

export function formatDueDate(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function isOverdue(dateStr: string): boolean {
  return dateStr < todayKey();
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Nearest date strictly after `from` that falls on `targetDay` (0=Sun..6=Sat).
export function nextWeekday(from: Date, targetDay: number): Date {
  const diff = ((targetDay - from.getDay() + 7) % 7) || 7;
  return addDays(from, diff);
}

// Time-of-day helpers for Todo.due_time — a plain 'HH:MM' 24-hour string,
// same local-wall-clock convention as due_date (no Date object, no
// timezone conversion) so minute math for the Week view's drag-to-create
// stays trivial and never drifts a task's displayed time across DST or
// timezone boundaries the way round-tripping through a real Date would.
export function minutesToTimeString(minutesFromMidnight: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutesFromMidnight)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// "9:00 AM" — uses a throwaway local Date purely to borrow
// toLocaleTimeString's locale-aware formatting, never persisted or
// compared as a Date anywhere.
export function formatTimeOfDay(time: string): string {
  const minutes = timeStringToMinutes(time);
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
