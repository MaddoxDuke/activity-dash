/** Presentation metadata for known places; unknown places get spare inks. */
export interface PlaceMeta {
  label: string;
  color: string;
  /** Reads naturally after "…was": "at work", "at the gym". */
  phrase: string;
}

const KNOWN: Record<string, PlaceMeta> = {
  work: { label: 'Work', color: 'var(--ink-work)', phrase: 'at work' },
  gym: { label: 'Gym', color: 'var(--ink-gym)', phrase: 'at the gym' },
  home: { label: 'Home', color: 'var(--ink-home)', phrase: 'at home' },
  shop: { label: 'Shop', color: 'var(--ink-shop)', phrase: 'in the shop' },
};

const SPARE = ['var(--ink-spare-1)', 'var(--ink-spare-2)', 'var(--ink-spare-3)'];

export function placeMeta(place: string): PlaceMeta {
  if (KNOWN[place]) return KNOWN[place];
  let h = 0;
  for (const c of place) h = (h * 31 + c.charCodeAt(0)) | 0;
  const label = place.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return {
    label,
    color: SPARE[Math.abs(h) % SPARE.length],
    phrase: `at ${label.toLowerCase()}`,
  };
}

/** Stable ordering for legends and stacked bars. */
export function placeOrder(places: string[]): string[] {
  const rank = ['work', 'gym', 'shop', 'home'];
  return [...places].sort((a, b) => {
    const ra = rank.indexOf(a);
    const rb = rank.indexOf(b);
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb) || a.localeCompare(b);
  });
}
