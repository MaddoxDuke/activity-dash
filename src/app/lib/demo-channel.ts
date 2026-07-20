import { ChannelData, ScoutNote, ShowingVideo } from './channel-types';

/**
 * Specimen Box Office data — a plausible small car channel, seeded like the
 * activity specimens so ?demo=1 shows every folio inked without a key.
 */
export function demoChannel(nowMs: number): ChannelData {
  const rand = mulberry32(240);
  const series: ChannelData['series'] = [];
  let subs = 11260;
  let views = 1_870_000;
  for (let back = 89; back >= 0; back--) {
    const d = new Date(nowMs - back * 86_400_000);
    // slow burn with upload-day bumps
    const bump = back % 11 === 3 ? 3 + rand() * 4 : 1;
    subs += Math.round((4 + rand() * 14) * bump);
    views += Math.round((900 + rand() * 2400) * bump);
    series.push({ day: d.toISOString().slice(0, 10), subs, views });
  }
  return { latest: series[series.length - 1], series };
}

export function demoVideos(nowMs: number): ShowingVideo[] {
  const rand = mulberry32(180);
  const titles = [
    'The S13 finally gets compression',
    'Wiring the swap — everything I got wrong',
    'Shop tour: one bay, no excuses',
    'First start in 9 years (it fought back)',
    'Budget coilovers: measured, not vibes',
    'Why I almost sold the car',
    'Making the dash digital — RetroDash v1',
    'Rust repair with hand tools only',
  ];
  return titles.map((title, i) => {
    const ageDays = 4 + i * 11 + Math.floor(rand() * 5);
    const views = Math.round(9000 + rand() * 60000 * Math.exp(-i / 4) + i * 900);
    return {
      videoId: `demo${i}`,
      title,
      publishedAt: new Date(nowMs - ageDays * 86_400_000).toISOString(),
      views,
      likes: Math.round(views * (0.055 + rand() * 0.02)),
      comments: Math.round(views * (0.007 + rand() * 0.004)),
      viewsDelta: i === 0 ? Math.round(1200 + rand() * 900) : Math.round(rand() * 220),
    };
  });
}

export function demoScoutNotes(nowMs: number): ScoutNote[] {
  const notes: ScoutNote[] = [];
  const specimens: [string, string[], [string, string][]][] = [
    [
      'Budget-build week: sub-$2k engine swaps are outperforming channel size 10-to-1.',
      [
        'HOW I K-swapped my 240 for $1,800 — BackyardBoost — algorithm is feeding garage-budget builds hard',
        'Rats nest to race car wiring in one weekend — WireWorks — process videos with countdown hooks trending',
        'I daily drove my project car for 30 days — SlowCarFast — endurance formats pulling 8x channel average',
      ],
      [
        ['Every dollar the S13 swap actually cost', 'receipts on screen, running total in the corner — brutal honesty angle'],
        ['Daily driving the S13 for a week straight', 'endurance format; each day ends with a "what broke" card'],
        ['My $200 wiring cleanup, start to finish', 'real-time process with the RetroDash gauges proving it runs'],
      ],
    ],
    [
      'Diagnosis content is quietly spiking — mystery-noise videos with payoff reveals.',
      [
        'Finding a knock nobody could find — RevDiag — 40-min diagnosis pulling 500k on a 30k channel',
        'I bought the cheapest 180SX in the country — NisMochi — buy-and-assess formats evergreen again',
      ],
      [
        ['The noise in my S13 that took 3 weekends to find', 'mystery structure: clues, wrong turns, reveal at the lift'],
        ['What 9 years of sitting does to a Nissan', 'inspection-as-story; every rubber part gets a verdict'],
      ],
    ],
  ];
  for (let back = 0; back < 7; back++) {
    const s = specimens[back % specimens.length];
    const d = new Date(nowMs - back * 86_400_000);
    notes.push({
      day: d.toISOString().slice(0, 10),
      briefing: s[0],
      trending: s[1].map((t) => {
        const [title, channel, why] = t.split(' — ');
        return { title, channel, why };
      }),
      ideas: s[2].map(([title, angle]) => ({ title, angle })),
      received_at: d.toISOString(),
    });
  }
  return notes;
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
