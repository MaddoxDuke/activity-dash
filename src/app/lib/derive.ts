import {
  ActivityEvent,
  DaySlice,
  DerivedData,
  ParsedEvent,
  Session,
  Transition,
  WeekHours,
} from './types';

/** A stay longer than this is treated as a missed event — a gap, never data. */
export const MAX_SESSION_MS = 16 * 3600_000;
/** left_X → arrived_Y counts as one journey only within this window. */
export const MAX_TRANSIT_MS = 3 * 3600_000;

const PLACE_RE = /^(arrived|left)_([a-z0-9_]+)$/;

export function parseEvents(raw: ActivityEvent[]): ParsedEvent[] {
  return raw
    .map((e) => {
      const m = PLACE_RE.exec(e.event);
      return {
        id: e.id,
        tsMs: Date.parse(e.ts),
        event: e.event,
        source: e.source ?? 'unknown',
        kind: (m ? m[1] : null) as ParsedEvent['kind'],
        place: m ? m[2] : null,
      };
    })
    .filter((e) => Number.isFinite(e.tsMs))
    .sort((a, b) => a.tsMs - b.tsMs);
}

/**
 * Pair arrivals and departures into stays.
 *
 * The log stores events, not durations; every duration here is derived and
 * a missed event must degrade into a gap, never corrupt a neighbour. Rules:
 *  - arrived_X closes any open stay elsewhere at that instant ('inferred' —
 *    you can't be in two places, so the previous departure was missed).
 *  - a repeated arrived_X while already at X is a geofence re-fire; ignored.
 *  - left_X closes an open stay at X ('explicit'). A left_X with no open
 *    stay at X is an orphan and is counted but otherwise ignored.
 *  - an open stay younger than MAX_SESSION_MS is 'ongoing' (still there);
 *    older than that it becomes 'unknown' and is excluded from stats.
 */
export function deriveSessions(events: ParsedEvent[], nowMs: number): DerivedData {
  const sessions: Session[] = [];
  let open: { place: string; startMs: number; source: string } | null = null;
  let orphans = 0;

  const close = (endMs: number, end: Session['end']) => {
    if (!open) return;
    const dur = endMs - open.startMs;
    sessions.push({
      place: open.place,
      startMs: open.startMs,
      endMs,
      end,
      valid: end !== 'unknown' && dur > 0 && dur <= MAX_SESSION_MS,
      sourceStart: open.source,
    });
    open = null;
  };

  for (const ev of events) {
    if (!ev.kind || !ev.place) continue;
    if (ev.kind === 'arrived') {
      if (open && open.place === ev.place) continue;
      close(ev.tsMs, 'inferred');
      open = { place: ev.place, startMs: ev.tsMs, source: ev.source };
    } else {
      if (open && open.place === ev.place) {
        close(ev.tsMs, 'explicit');
      } else {
        orphans++;
      }
    }
  }

  if (open !== null) {
    const o: { place: string; startMs: number; source: string } = open;
    if (nowMs - o.startMs <= MAX_SESSION_MS) close(nowMs, 'ongoing');
    else close(o.startMs + MAX_SESSION_MS, 'unknown');
  }

  return { events, sessions, transitions: deriveTransitions(events), orphans };
}

/** Journeys: each explicit left_X followed by an arrived_Y within the window. */
export function deriveTransitions(events: ParsedEvent[]): Transition[] {
  const placeEvents = events.filter((e) => e.kind !== null);
  const out: Transition[] = [];
  for (let i = 0; i < placeEvents.length - 1; i++) {
    const a = placeEvents[i];
    const b = placeEvents[i + 1];
    if (a.kind !== 'left' || b.kind !== 'arrived') continue;
    const gap = b.tsMs - a.tsMs;
    if (gap <= 0 || gap > MAX_TRANSIT_MS) continue;
    out.push({
      from: a.place!,
      to: b.place!,
      departMs: a.tsMs,
      minutes: gap / 60_000,
      weekday: mondayWeekday(new Date(a.tsMs)),
    });
  }
  return out;
}

/** 0 = Monday … 6 = Sunday. */
export function mondayWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function localMidnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Clip sessions to one local day as minutes-from-midnight slices. */
export function slicesForDay(sessions: Session[], dayStartMs: number): DaySlice[] {
  const dayEndMs = endOfDay(dayStartMs);
  const out: DaySlice[] = [];
  for (const s of sessions) {
    if (!s.valid && s.end !== 'unknown') continue;
    if (s.endMs <= dayStartMs || s.startMs >= dayEndMs) continue;
    const a = Math.max(s.startMs, dayStartMs);
    const b = Math.min(s.endMs, dayEndMs);
    out.push({
      place: s.place,
      startMin: (a - dayStartMs) / 60_000,
      endMin: (b - dayStartMs) / 60_000,
      session: s,
    });
  }
  return out;
}

/** DST-safe end of the local day that starts at dayStartMs. */
function endOfDay(dayStartMs: number): number {
  const d = new Date(dayStartMs);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Hours per place per ISO-ish week (Monday-anchored), most recent last. */
export function weeklyHours(sessions: Session[], nowMs: number, weeks: number): WeekHours[] {
  const out: WeekHours[] = [];
  const thisMonday = mondayOf(nowMs);
  for (let w = weeks - 1; w >= 0; w--) {
    const monday = addDays(thisMonday, -7 * w);
    const next = addDays(monday, 7);
    const hoursByPlace: Record<string, number> = {};
    let total = 0;
    for (const s of sessions) {
      if (!s.valid) continue;
      const a = Math.max(s.startMs, monday);
      const b = Math.min(s.endMs, next);
      if (b <= a) continue;
      const h = (b - a) / 3600_000;
      hoursByPlace[s.place] = (hoursByPlace[s.place] ?? 0) + h;
      total += h;
    }
    const d = new Date(monday);
    out.push({
      mondayMs: monday,
      label: `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`,
      hoursByPlace,
      totalHours: total,
    });
  }
  return out;
}

export function mondayOf(ms: number): number {
  const mid = localMidnight(ms);
  return addDays(mid, -mondayWeekday(new Date(mid)));
}

/** DST-safe day arithmetic in local time. */
export function addDays(midnightMs: number, days: number): number {
  const d = new Date(midnightMs);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Consecutive-day streak (ending today or yesterday) of visits to a place. */
export function placeStreak(sessions: Session[], place: string, nowMs: number): number {
  const days = new Set(
    sessions.filter((s) => s.valid && s.place === place).map((s) => dayKey(s.startMs)),
  );
  let streak = 0;
  let cursor = localMidnight(nowMs);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1); // today may not have happened yet
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function fmtDuration(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return `${h}h ${String(rem).padStart(2, '0')}m`;
}

export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
