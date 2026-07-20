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
import {
  AnalystNote,
  ChannelData,
  MetricRow,
  ScoutIdea,
  ScoutNote,
  ShowingVideo,
  StarredIdea,
} from './lib/channel-types';
import { demoAnalystNotes, demoMetrics } from './lib/demo-almanac';
import { demoChannel, demoScoutNotes, demoVideos } from './lib/demo-channel';
import { demoEvents } from './lib/demo';
import { ActivityEvent, Session } from './lib/types';

const API_BASE = 'https://api.maddox-duke.com';
const TUBE_BASE = 'https://tube.maddox-duke.com';
const KEY_STORAGE = 'whereabouts.key';
const REFRESH_MS = 5 * 60_000;
const CLOCK_MS = 30_000;

export type GateState = 'locked' | 'checking' | 'ready';

/** Postgres DATE → 'YYYY-MM-DD', tolerant of plain date strings. */
const day10 = (d: unknown): string => String(d).slice(0, 10);

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

  /* ——— the box office: channel-api, a separate door, same key ——— */

  /** 'unlit' = channel-api unreachable/not deployed; the page stays calm. */
  readonly boxOffice = signal<'unlit' | 'loading' | 'ready'>('unlit');
  readonly channel = signal<ChannelData>({ latest: null, series: [] });
  readonly showings = signal<ShowingVideo[]>([]);
  readonly scoutNotes = signal<ScoutNote[]>([]);
  readonly stars = signal<StarredIdea[]>([]);
  /** Key for "is this idea starred" lookups. */
  readonly starKeys = computed(() => new Set(this.stars().map((s) => `${s.day}::${s.title}`)));
  private demoStarSeq = -1;

  /* ——— the analyst, vitals, and the field pen ————————————————— */

  readonly analystNotes = signal<AnalystNote[]>([]);
  readonly metricRows = signal<MetricRow[]>([]);
  readonly penError = signal('');
  /** The open focus session, if the pen has one running. */
  readonly focusOpen = computed<Session | null>(() => {
    const open = this.activities().find((a) => a.place === 'focus' && a.end === 'ongoing');
    return open ?? null;
  });
  private penSeq = -1;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    setInterval(() => this.nowMs.set(Date.now()), CLOCK_MS);

    if (this.demo) {
      this.rawEvents.set(demoEvents(Date.now()));
      this.channel.set(demoChannel(Date.now()));
      this.showings.set(demoVideos(Date.now()));
      const notes = demoScoutNotes(Date.now());
      this.scoutNotes.set(notes);
      this.analystNotes.set(demoAnalystNotes(Date.now()));
      this.metricRows.set(demoMetrics(Date.now()));
      // two specimens already on the slate, so the folio arrives inked
      this.stars.set(
        notes.slice(0, 2).map((n, i) => ({
          id: -(i + 100),
          day: n.day,
          title: n.ideas[0].title,
          angle: n.ideas[0].angle ?? null,
          starred_at: n.received_at,
        })),
      );
      this.demoStarSeq = -200;
      this.boxOffice.set('ready');
      this.state.set('ready');
      return;
    }
    const stored = storage.get();
    if (stored) void this.unlock(stored, true);
  }

  private async loadBoxOffice(key: string): Promise<void> {
    this.boxOffice.set('loading');
    try {
      const opts = { headers: { 'x-api-key': key } };
      const [ch, vids, scout, stars] = await Promise.all([
        fetch(`${TUBE_BASE}/channel`, opts),
        fetch(`${TUBE_BASE}/videos`, opts),
        fetch(`${TUBE_BASE}/scout?limit=30`, opts),
        fetch(`${TUBE_BASE}/stars`, opts),
      ]);
      if (!ch.ok || !vids.ok || !scout.ok || !stars.ok) throw new Error('box office not open');
      // Postgres DATE columns arrive as full ISO timestamps; the almanac
      // speaks in YYYY-MM-DD everywhere (labels, star keys, POST bodies).
      const chData = (await ch.json()) as ChannelData;
      this.channel.set({
        latest: chData.latest ? { ...chData.latest, day: day10(chData.latest.day) } : null,
        series: chData.series.map((d) => ({ ...d, day: day10(d.day) })),
      });
      this.showings.set((await vids.json()) as ShowingVideo[]);
      this.scoutNotes.set(
        ((await scout.json()) as ScoutNote[]).map((n) => ({ ...n, day: day10(n.day) })),
      );
      this.stars.set(
        ((await stars.json()) as StarredIdea[]).map((s) => ({ ...s, day: day10(s.day) })),
      );
      this.boxOffice.set('ready');
    } catch {
      this.boxOffice.set('unlit'); // service not lit yet — never break the almanac
    }
  }

  /** Analyst notes + vitals ride on the activity API with the same key. */
  private async loadAlmanacExtras(key: string): Promise<void> {
    try {
      const opts = { headers: { 'x-api-key': key } };
      const [notes, mets] = await Promise.all([
        fetch(`${API_BASE}/analyst?limit=14`, opts),
        fetch(`${API_BASE}/metrics`, opts),
      ]);
      if (notes.ok) {
        this.analystNotes.set(
          ((await notes.json()) as AnalystNote[]).map((n) => ({ ...n, day: day10(n.day) })),
        );
      }
      if (mets.ok) {
        this.metricRows.set(
          ((await mets.json()) as MetricRow[]).map((m) => ({ ...m, day: day10(m.day) })),
        );
      }
    } catch {
      /* older API without these routes — the folios simply stay closed */
    }
  }

  /**
   * The field pen: write an event from the site itself. Optimistic — the
   * entry appears immediately; live mode also posts it to the API.
   */
  async penEvent(event: string): Promise<boolean> {
    this.penError.set('');
    if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(event)) {
      this.penError.set('events are snake_case: lowercase words joined by single underscores');
      return false;
    }
    const optimistic: ActivityEvent = {
      id: this.penSeq--,
      ts: new Date().toISOString(),
      event,
      source: 'field_pen',
      received_at: new Date().toISOString(),
    };
    if (this.demo) {
      this.rawEvents.set([...this.rawEvents(), optimistic]);
      return true;
    }
    const key = storage.get();
    if (!key) return false;
    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'x-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ ts: optimistic.ts, event, source: 'field_pen' }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        this.penError.set(err?.error ?? `the api refused it (${res.status})`);
        return false;
      }
      this.rawEvents.set([...this.rawEvents(), optimistic]);
      return true;
    } catch {
      this.penError.set('could not reach the api — nothing was written');
      return false;
    }
  }

  isStarred(day: string, title: string): boolean {
    return this.starKeys().has(`${day}::${title}`);
  }

  /** Toggle an idea on/off the slate; optimistic in demo, API-backed live. */
  async toggleStar(day: string, idea: ScoutIdea): Promise<void> {
    const existing = this.stars().find((s) => s.day === day && s.title === idea.title);
    if (this.demo) {
      if (existing) this.stars.set(this.stars().filter((s) => s.id !== existing.id));
      else
        this.stars.set([
          { id: this.demoStarSeq--, day, title: idea.title, angle: idea.angle ?? null, starred_at: new Date().toISOString() },
          ...this.stars(),
        ]);
      return;
    }
    const key = storage.get();
    if (!key) return;
    try {
      if (existing) {
        const res = await fetch(`${TUBE_BASE}/stars/${existing.id}`, {
          method: 'DELETE',
          headers: { 'x-api-key': key },
        });
        if (res.ok || res.status === 404) {
          this.stars.set(this.stars().filter((s) => s.id !== existing.id));
        }
      } else {
        const res = await fetch(`${TUBE_BASE}/stars`, {
          method: 'POST',
          headers: { 'x-api-key': key, 'content-type': 'application/json' },
          body: JSON.stringify({ day, title: idea.title, angle: idea.angle }),
        });
        if (res.ok) {
          const row = (await res.json()) as StarredIdea;
          this.stars.set([row, ...this.stars().filter((s) => s.id !== row.id)]);
        }
      }
    } catch {
      /* connection hiccup — the slate simply doesn't change */
    }
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
      void this.loadBoxOffice(key);
      void this.loadAlmanacExtras(key);
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
