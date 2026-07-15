import { ActivityEvent } from './types';

/**
 * Deterministic specimen data for ?demo=1 — ten weeks of plausible comings
 * and goings so the dashboard can be designed, reviewed, and demoed without
 * exposing the real log. Seeded PRNG; same day always renders the same.
 */
export function demoEvents(nowMs: number): ActivityEvent[] {
  const rand = mulberry32(1913);
  const out: { tsMs: number; event: string; source: string }[] = [];
  const push = (tsMs: number, event: string) => {
    if (tsMs < nowMs) out.push({ tsMs, event, source: 'specimen' });
  };
  // ~4% of events go missing, the way real geofences misfire.
  const dropped = (p = 0.04) => rand() < p;
  const jitter = (min: number) => (rand() * 2 - 1) * min * 60_000;

  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);

  for (let back = 70; back >= 0; back--) {
    const day = new Date(today);
    day.setDate(day.getDate() - back);
    const dayMs = day.getTime();
    const wd = (day.getDay() + 6) % 7; // 0=Mon..6=Sun
    const at = (h: number, m = 0) => dayMs + (h * 60 + m) * 60_000 + jitter(12);

    if (wd <= 4) {
      // Weekday: work, sometimes gym after, sometimes an evening in the shop.
      const arriveWork = at(8, 40);
      const leaveWork = at(17, 25);
      if (!dropped()) push(arriveWork, 'arrived_work');
      if (!dropped()) push(leaveWork, 'left_work');

      const gymDay = (wd === 0 || wd === 2 || wd === 4) && rand() < 0.72;
      if (gymDay) {
        const arriveGym = leaveWork + 25 * 60_000 + jitter(8);
        const leaveGym = arriveGym + (48 + rand() * 40) * 60_000;
        if (!dropped()) push(arriveGym, 'arrived_gym');
        if (!dropped()) push(leaveGym, 'left_gym');
        if (!dropped()) push(leaveGym + 18 * 60_000 + jitter(6), 'arrived_home');
      } else if ((wd === 1 || wd === 3) && rand() < 0.45) {
        const home = leaveWork + 22 * 60_000 + jitter(6);
        if (!dropped()) push(home, 'arrived_home');
        const toShop = at(19, 10);
        const fromShop = toShop + (80 + rand() * 90) * 60_000;
        if (!dropped()) push(toShop, 'arrived_shop');
        if (!dropped()) push(fromShop, 'left_shop');
        if (!dropped()) push(fromShop + 9 * 60_000 + jitter(4), 'arrived_home');
      } else {
        if (!dropped()) push(leaveWork + 22 * 60_000 + jitter(6), 'arrived_home');
      }
    } else if (wd === 5) {
      // Saturday: gym in the morning most weeks, a long shop block after noon.
      if (rand() < 0.6) {
        const g = at(9, 5);
        if (!dropped()) push(g, 'arrived_gym');
        if (!dropped()) push(g + (55 + rand() * 35) * 60_000, 'left_gym');
        if (!dropped()) push(g + (75 + rand() * 40) * 60_000, 'arrived_home');
      }
      const s = at(12, 50);
      const e = s + (150 + rand() * 130) * 60_000;
      if (!dropped()) push(s, 'arrived_shop');
      if (!dropped()) push(e, 'left_shop');
      if (!dropped()) push(e + 10 * 60_000 + jitter(4), 'arrived_home');
    } else {
      // Sunday: quiet; occasionally an afternoon hour in the shop.
      if (rand() < 0.4) {
        const s = at(15, 20);
        const e = s + (50 + rand() * 70) * 60_000;
        if (!dropped()) push(s, 'arrived_shop');
        if (!dropped()) push(e, 'left_shop');
        if (!dropped()) push(e + 10 * 60_000 + jitter(4), 'arrived_home');
      }
    }
  }

  out.sort((a, b) => a.tsMs - b.tsMs);
  return out.map((e, i) => ({
    id: i + 1,
    ts: new Date(e.tsMs).toISOString(),
    event: e.event,
    source: e.source,
    received_at: new Date(e.tsMs + 1500).toISOString(),
  }));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
