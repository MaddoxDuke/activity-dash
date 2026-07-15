import {
  MAX_SESSION_MS,
  deriveSessions,
  deriveTransitions,
  fmtDuration,
  parseEvents,
  placeStreak,
  slicesForDay,
  weeklyHours,
} from './derive';
import { ActivityEvent } from './types';

const T0 = Date.parse('2026-07-06T00:00:00'); // a Monday, local time

function ev(hoursFromT0: number, event: string, id = 0): ActivityEvent {
  return {
    id,
    ts: new Date(T0 + hoursFromT0 * 3600_000).toISOString(),
    event,
    source: 'test',
    received_at: new Date(T0 + hoursFromT0 * 3600_000).toISOString(),
  };
}

describe('parseEvents', () => {
  it('extracts place semantics and sorts by ts', () => {
    const parsed = parseEvents([ev(2, 'left_work'), ev(1, 'arrived_work'), ev(3, 'editing_start')]);
    expect(parsed.map((p) => p.event)).toEqual(['arrived_work', 'left_work', 'editing_start']);
    expect(parsed[0].kind).toBe('arrived');
    expect(parsed[0].place).toBe('work');
    expect(parsed[2].kind).toBeNull();
  });
});

describe('deriveSessions', () => {
  const now = T0 + 20 * 3600_000;

  it('pairs an explicit arrive/leave into one session', () => {
    const { sessions } = deriveSessions(parseEvents([ev(9, 'arrived_work'), ev(17, 'left_work')]), now);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ place: 'work', end: 'explicit', valid: true });
    expect(sessions[0].endMs - sessions[0].startMs).toBe(8 * 3600_000);
  });

  it('infers a missed departure from the next arrival', () => {
    const { sessions } = deriveSessions(
      parseEvents([ev(9, 'arrived_work'), ev(18, 'arrived_gym'), ev(19, 'left_gym')]),
      now,
    );
    expect(sessions.map((s) => [s.place, s.end])).toEqual([
      ['work', 'inferred'],
      ['gym', 'explicit'],
    ]);
  });

  it('ignores geofence re-fires at the same place', () => {
    const { sessions } = deriveSessions(
      parseEvents([ev(9, 'arrived_work'), ev(9.1, 'arrived_work'), ev(17, 'left_work')]),
      now,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].startMs).toBe(T0 + 9 * 3600_000);
  });

  it('counts orphan departures without corrupting neighbours', () => {
    const { sessions, orphans } = deriveSessions(
      parseEvents([ev(9, 'arrived_work'), ev(10, 'left_gym'), ev(17, 'left_work')]),
      now,
    );
    expect(orphans).toBe(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].end).toBe('explicit');
  });

  it('marks a recent open stay as ongoing up to now', () => {
    const { sessions } = deriveSessions(parseEvents([ev(18, 'arrived_home')]), now);
    expect(sessions[0].end).toBe('ongoing');
    expect(sessions[0].endMs).toBe(now);
    expect(sessions[0].valid).toBe(true);
  });

  it('turns a stale open stay into an unknown-ended gap', () => {
    const { sessions } = deriveSessions(
      parseEvents([ev(1, 'arrived_home')]),
      T0 + 40 * 3600_000,
    );
    expect(sessions[0].end).toBe('unknown');
    expect(sessions[0].valid).toBe(false);
    expect(sessions[0].endMs).toBe(T0 + 1 * 3600_000 + MAX_SESSION_MS);
  });

  it('invalidates implausibly long closed stays as gaps', () => {
    const { sessions } = deriveSessions(
      parseEvents([ev(0, 'arrived_work'), ev(20, 'left_work')]),
      T0 + 21 * 3600_000,
    );
    expect(sessions[0].valid).toBe(false);
  });
});

describe('deriveTransitions', () => {
  it('links an explicit departure to the next arrival within the window', () => {
    const t = deriveTransitions(
      parseEvents([ev(9, 'arrived_work'), ev(17, 'left_work'), ev(17.5, 'arrived_home')]),
    );
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ from: 'work', to: 'home', minutes: 30, weekday: 0 });
  });

  it('does not bridge gaps longer than the window', () => {
    const t = deriveTransitions(parseEvents([ev(17, 'left_work'), ev(22, 'arrived_home')]));
    expect(t).toHaveLength(0);
  });
});

describe('slicesForDay', () => {
  it('clips a midnight-spanning session into both days', () => {
    const { sessions } = deriveSessions(
      parseEvents([ev(20, 'arrived_shop'), ev(26, 'left_shop')]),
      T0 + 30 * 3600_000,
    );
    const day1 = slicesForDay(sessions, T0);
    const day2 = slicesForDay(sessions, T0 + 24 * 3600_000);
    expect(day1[0].startMin).toBe(20 * 60);
    expect(day1[0].endMin).toBe(1440);
    expect(day2[0].startMin).toBe(0);
    expect(day2[0].endMin).toBe(2 * 60);
  });
});

describe('weeklyHours', () => {
  it('buckets valid session hours into Monday-anchored weeks', () => {
    const { sessions } = deriveSessions(
      parseEvents([ev(9, 'arrived_work'), ev(17, 'left_work')]),
      T0 + 20 * 3600_000,
    );
    const weeks = weeklyHours(sessions, T0 + 20 * 3600_000, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].totalHours).toBe(0);
    expect(weeks[1].hoursByPlace['work']).toBeCloseTo(8);
  });
});

describe('placeStreak', () => {
  it('counts consecutive days, tolerating an eventless today', () => {
    const { sessions } = deriveSessions(
      parseEvents([
        ev(-38, 'arrived_gym'), ev(-37, 'left_gym'), // two days ago
        ev(-14, 'arrived_gym'), ev(-13, 'left_gym'), // yesterday
      ]),
      T0 + 8 * 3600_000, // today, no gym yet
    );
    expect(placeStreak(sessions, 'gym', T0 + 8 * 3600_000)).toBe(2);
  });
});

describe('fmtDuration', () => {
  it('formats sub-hour and multi-hour spans', () => {
    expect(fmtDuration(45)).toBe('45m');
    expect(fmtDuration(125)).toBe('2h 05m');
  });
});
