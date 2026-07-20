/**
 * The call sheet — the declared weekly schedule, version one. A wager, not
 * a law: the analyst referees the record against it nightly, and revisions
 * happen here (in review, in the repo) as the evidence comes in.
 */
export interface CallBlock {
  /** Ink + legend key: a place, 'editing', or 'free'. */
  kind: 'work' | 'gym' | 'shop' | 'editing' | 'free';
  label: string;
  time?: string;
  note?: string;
}

export interface CallDay {
  /** 0 = Monday … 6 = Sunday, matching mondayWeekday(). */
  weekday: number;
  name: string;
  blocks: CallBlock[];
}

export const CALL_SHEET: CallDay[] = [
  {
    weekday: 0,
    name: 'monday',
    blocks: [
      { kind: 'work', label: 'work' },
      { kind: 'gym', label: 'gym', time: '5:45–7:45p' },
      { kind: 'editing', label: 'editing', time: '8–10p' },
    ],
  },
  {
    weekday: 1,
    name: 'tuesday',
    blocks: [
      { kind: 'work', label: 'work' },
      { kind: 'gym', label: 'gym', time: '5:45–7:45p' },
      { kind: 'shop', label: 'shop + camera', time: '8–10p' },
    ],
  },
  {
    weekday: 2,
    name: 'wednesday',
    blocks: [
      { kind: 'work', label: 'work' },
      { kind: 'gym', label: 'treadmill only', time: '5:45–6:45p', note: 'the traded lift' },
      { kind: 'editing', label: 'editing — the long night', time: '7:15–10p' },
    ],
  },
  {
    weekday: 3,
    name: 'thursday',
    blocks: [
      { kind: 'work', label: 'work' },
      { kind: 'gym', label: 'gym', time: '5:45–7:45p' },
      { kind: 'shop', label: 'shop + camera', time: '8–10p', note: 'or the week’s buffer' },
    ],
  },
  {
    weekday: 4,
    name: 'friday',
    blocks: [
      { kind: 'work', label: 'work' },
      { kind: 'gym', label: 'gym', time: '5:45–7:45p' },
      { kind: 'free', label: 'free' },
    ],
  },
  {
    weekday: 5,
    name: 'saturday',
    blocks: [
      { kind: 'gym', label: 'gym', time: '9–11a' },
      { kind: 'shop', label: 'shop + camera', time: '1–5p' },
      { kind: 'free', label: 'free' },
    ],
  },
  {
    weekday: 6,
    name: 'sunday',
    blocks: [
      { kind: 'gym', label: 'gym', time: '11a–1p' },
      { kind: 'editing', label: 'finish + schedule upload', time: '3–6p' },
      { kind: 'free', label: 'rest' },
    ],
  },
];

export const CALL_CADENCE = 'publish every second saturday · 9:00am · scheduled from sunday’s block';

export const CALL_TOTALS = 'weekly: gym 13h · editing 7¾h · shop-with-camera 8h';
