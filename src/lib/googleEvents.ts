import type { GoogleEvent } from "../types";
import { dateToKey } from "./dates";

// All-day events carry a plain 'YYYY-MM-DD' string with no timezone info —
// keying off it directly (rather than `new Date(event.start)`) avoids the
// classic off-by-one: `new Date('2026-08-12')` parses as UTC midnight,
// which rolls back a day in any timezone west of UTC. Timed events do
// carry a real offset in their ISO string, so `new Date(...)` + the
// existing local-date `dateToKey` helper is safe for those.
export function googleEventDateKey(event: GoogleEvent): string {
  return event.allDay ? event.start.slice(0, 10) : dateToKey(new Date(event.start));
}

export function formatEventTime(event: GoogleEvent): string {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Dims an event once it's over, everywhere an event renders (Today/Day's
// EventsHeader, Upcoming's per-day agenda, Month's chips, Week's all-day
// chips and timed blocks). `event.end` is exclusive already for both timed
// events (a real instant) and all-day events (Google's own 'day after the
// last day' convention), so a plain instant comparison against now is
// correct for both without any special-casing.
export function isEventPast(event: GoogleEvent): boolean {
  return new Date(event.end).getTime() < Date.now();
}

// Groups a flat event list by the local day each one falls on, sorted
// within each day with all-day events first, then by start time. Shared by
// every view that needs "events for this date range, bucketed by day"
// (CalendarView's Month/Week/Day sub-tabs, UpcomingView's agenda).
export function groupEventsByDay(events: GoogleEvent[]): Map<string, GoogleEvent[]> {
  const map = new Map<string, GoogleEvent[]>();
  for (const e of events) {
    const key = googleEventDateKey(e);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1));
  }
  return map;
}
