import { Injectable, computed, signal } from '@angular/core';
import {
  addDays,
  dayKey,
  deriveSessions,
  localMidnight,
  mondayOf,
  parseEvents,
  placeStreak,
  slicesForDay,
  weeklyHours,
} from './lib/derive';
import { demoEvents } from './lib/demo';
import { ActivityEvent, Session } from './lib/types';

const API_BASE = 'https://api.maddox-duke.com';
const KEY_STORAGE = 'whereabouts.key';
const REFRESH_MS = 5 * 60_000;
const CLOCK_MS = 30_000;

export type GateState = 'locked' | 'checking' | 'ready';

/** localStorage that degrades to session-only when storage is blocked. */
const storage = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY_STORAGE);
    } catch {
      return null;
    }
  },
  set(v: string): void {
    try {
      localStorage.setItem(KEY_STORAGE, v);
    } catch {
      /* key lives only for this visit */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* nothing stored */
    }
  },
};

@Injectable({ providedIn: 'root' })
export class Store {
  readonly demo = new URLSearchParams(location.search).has('demo');

  readonly state = signal<GateState>('locked');
  readonly gateError = signal('');
  readonly fetchError = signal('');
  readonly rawEvents = signal<ActivityEvent[]>([]);
  readonly nowMs = signal(Date.now());
  readonly selectedDayMs = signal(localMidnight(Date.now()));

  readonly derived = computed(() => deriveSessions(parseEvents(this.rawEvents()), this.nowMs()));
  readonly sessions = computed(() => this.derived().sessions);
  readonly transitions = computed(() => this.derived().transitions);

  readonly selectedSlices = computed(() =>
    slicesForDay(this.sessions(), this.selectedDayMs()),
  );
  readonly isToday = computed(
    () => dayKey(this.selectedDayMs()) === dayKey(this.nowMs()),
  );

  /** Mon..Sun of the week containing the selected day. */
  readonly weekDays = computed(() => {
    const monday = mondayOf(this.selectedDayMs());
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  });

  readonly weeks = computed(() => weeklyHours(this.sessions(), this.nowMs(), 8));

  readonly gymSessions = computed(() =>
    this.sessions().filter((s) => s.place === 'gym' && s.valid && s.end !== 'ongoing'),
  );
  readonly gymStreak = computed(() => placeStreak(this.sessions(), 'gym', this.nowMs()));

  /** Where he is right now, if the latest stay is still open. */
  readonly currentStay = computed<Session | null>(() => {
    const last = this.sessions().at(-1);
    return last && last.end === 'ongoing' ? last : null;
  });

  /* ——— the cutting room: editing activity from the RoughCut beacon ——— */

  readonly activities = computed(() => this.derived().activities);

  /** Finished, plausible reels — newest last. */
  readonly editingSessions = computed(() =>
    this.activities().filter((a) => a.place === 'editing' && a.valid && a.end !== 'ongoing'),
  );

  /** The reel turning right now, if any. */
  readonly editingOngoing = computed<Session | null>(() => {
    const open = this.activities().find((a) => a.place === 'editing' && a.end === 'ongoing');
    return open ?? null;
  });

  /** Sessions whose end was never announced — crashes, kills, gaps. */
  readonly editingBrokenReels = computed(
    () => this.activities().filter((a) => a.place === 'editing' && a.end === 'unknown').length,
  );

  readonly editingHours = computed(() =>
    this.editingSessions().reduce((h, s) => h + (s.endMs - s.startMs) / 3600_000, 0),
  );

  /** Raw editing events for the cutting-room ledger tail. */
  readonly editingEvents = computed(() =>
    this.derived().events.filter((e) => e.activity === 'editing'),
  );

  /** Shop hours vs editing hours, per week — the trade the almanac asks about. */
  readonly tradeWeeks = computed(() => {
    const shop = weeklyHours(this.sessions(), this.nowMs(), 8);
    const edit = weeklyHours(this.activities(), this.nowMs(), 8);
    return shop.map((w, i) => ({
      mondayMs: w.mondayMs,
      label: w.label,
      shop: w.hoursByPlace['shop'] ?? 0,
      editing: edit[i].hoursByPlace['editing'] ?? 0,
    }));
  });

  readonly totalEvents = computed(() => this.derived().events.length);
  readonly observedSinceMs = computed(() => this.derived().events[0]?.tsMs ?? null);
  readonly daysObserved = computed(
    () => new Set(this.derived().events.map((e) => dayKey(e.tsMs))).size,
  );
  readonly hoursAccounted = computed(() =>
    this.sessions()
      .filter((s) => s.valid)
      .reduce((h, s) => h + (s.endMs - s.startMs) / 3600_000, 0),
  );

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    setInterval(() => this.nowMs.set(Date.now()), CLOCK_MS);

    if (this.demo) {
      this.rawEvents.set(demoEvents(Date.now()));
      this.state.set('ready');
      return;
    }
    const stored = storage.get();
    if (stored) void this.unlock(stored, true);
  }

  async unlock(key: string, silent = false): Promise<void> {
    this.state.set('checking');
    this.gateError.set('');
    try {
      const res = await fetch(`${API_BASE}/events`, { headers: { 'x-api-key': key } });
      if (res.status === 401) {
        storage.clear();
        this.state.set('locked');
        this.gateError.set(silent ? 'Stored key no longer valid.' : 'That key was refused.');
        return;
      }
      if (!res.ok) throw new Error(`API replied ${res.status}`);
      const events = (await res.json()) as ActivityEvent[];
      storage.set(key);
      this.rawEvents.set(events);
      this.state.set('ready');
      this.startRefresh(key);
    } catch (e) {
      this.state.set('locked');
      this.gateError.set(e instanceof TypeError ? 'Could not reach the API.' : String(e));
    }
  }

  lock(): void {
    storage.clear();
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.rawEvents.set([]);
    this.state.set('locked');
    this.gateError.set('');
  }

  selectDay(midnightMs: number): void {
    this.selectedDayMs.set(Math.min(midnightMs, localMidnight(this.nowMs())));
  }
  stepDay(delta: number): void {
    this.selectDay(addDays(this.selectedDayMs(), delta));
  }
  goToday(): void {
    this.selectDay(localMidnight(this.nowMs()));
  }

  private startRefresh(key: string): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/events`, { headers: { 'x-api-key': key } });
        if (res.ok) {
          this.rawEvents.set((await res.json()) as ActivityEvent[]);
          this.fetchError.set('');
        }
      } catch {
        this.fetchError.set('Last refresh failed; showing earlier data.');
      }
    }, REFRESH_MS);
  }
}
