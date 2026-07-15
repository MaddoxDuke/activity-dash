/** Raw row from GET /events on activity-api. */
export interface ActivityEvent {
  id: number;
  ts: string;
  event: string;
  source: string;
  received_at: string;
}

/** Parsed, sorted event with epoch ms and place semantics extracted. */
export interface ParsedEvent {
  id: number;
  tsMs: number;
  event: string;
  source: string;
  /** 'arrived' | 'left' when the event matches (arrived|left)_<place>. */
  kind: 'arrived' | 'left' | null;
  place: string | null;
}

export type SessionEnd = 'explicit' | 'inferred' | 'ongoing' | 'unknown';

/** A continuous stay at one place, derived by pairing events. */
export interface Session {
  place: string;
  startMs: number;
  /** For 'unknown' ends this is startMs + GAP cap, only for rendering. */
  endMs: number;
  end: SessionEnd;
  /** False when the stay exceeded the plausibility cap — a gap, not data. */
  valid: boolean;
  sourceStart: string;
}

/** Travel between places: an explicit left_X followed soon by arrived_Y. */
export interface Transition {
  from: string;
  to: string;
  departMs: number;
  minutes: number;
  /** 0 = Monday … 6 = Sunday, in local time. */
  weekday: number;
}

/** A session clipped to a single local day, for band rendering. */
export interface DaySlice {
  place: string;
  /** Minutes from local midnight, 0–1440. */
  startMin: number;
  endMin: number;
  session: Session;
}

export interface WeekHours {
  /** Monday of the week, local midnight. */
  mondayMs: number;
  label: string;
  hoursByPlace: Record<string, number>;
  totalHours: number;
}

export interface DerivedData {
  events: ParsedEvent[];
  sessions: Session[];
  transitions: Transition[];
  /** Count of left_X events with no matching open stay. */
  orphans: number;
}
