import { AnalystNote, MetricRow } from './channel-types';

/** Specimen vitals: two weeks of weight/kcal/protein/steps. */
export function demoMetrics(nowMs: number): MetricRow[] {
  const rand = mulberry32(77);
  const rows: MetricRow[] = [];
  let weight = 183.4;
  for (let back = 13; back >= 0; back--) {
    const day = new Date(nowMs - back * 86_400_000).toISOString().slice(0, 10);
    weight += (rand() - 0.55) * 0.5;
    rows.push(
      { day, name: 'weight', value: Number(weight.toFixed(1)), unit: 'lb', source: 'health' },
      { day, name: 'calories', value: Math.round(1900 + rand() * 700), unit: 'kcal', source: 'health' },
      { day, name: 'protein', value: Math.round(135 + rand() * 55), unit: 'g', source: 'health' },
      { day, name: 'steps', value: Math.round(6000 + rand() * 8000), unit: null, source: 'health' },
    );
  }
  return rows;
}

/** Specimen analyst notes — what the nightly routine files. */
export function demoAnalystNotes(nowMs: number): AnalystNote[] {
  const d = (back: number) => new Date(nowMs - back * 86_400_000).toISOString().slice(0, 10);
  return [
    {
      day: d(1),
      briefing:
        'The gym-then-bench pairing held again — your two longest reels this week both followed a session under the bar.',
      observations: [
        'work ran 7h40 with a clean 17:05 close; no evening spillover',
        'bench lit at 20:28, within eight minutes of its weekly median',
        'protein landed at 172g against a 2,140 kcal day — the ratio is holding',
      ],
      suggestions: [
        'Wednesday looks like the next gym-then-bench window; guard 20:00–22:30.',
        'the shop has taken no weekday evenings yet this week — if the exhaust job needs one, Thursday costs the least.',
      ],
      received_at: new Date(nowMs - 86_400_000).toISOString(),
    },
    {
      day: d(2),
      briefing: 'A shop-heavy day that ended flat — no bench, no bar, and the latest work close of the week.',
      observations: ['work closed at 18:12, an hour past its median', 'shop took 2h10 of the evening'],
      suggestions: ['if the shop runs past 20:00 again, book the bench for the following night rather than forcing both.'],
      received_at: new Date(nowMs - 2 * 86_400_000).toISOString(),
    },
  ];
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
