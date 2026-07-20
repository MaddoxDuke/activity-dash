import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

interface FrameCell {
  hour: number;
  label: string;
  minutes: number;
  /** 0..1 fill against the busiest hour. */
  level: number;
}

/**
 * Folio IV — when editing happens. A strip of 24 film frames, one per
 * hour of the day; the deeper the ink, the more editing minutes that hour has
 * collected across every reel on record.
 */
@Component({
  selector: 'app-night-rhythm',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">IV</span>
        <h2 class="folio__title">Night Rhythm</h2>
        <span class="folio__note">editing minutes by hour of day, all sessions compounded</span>
      </header>

      @if (total() > 0) {
        <div class="frames" role="img" [attr.aria-label]="alt()">
          <div class="frames__strip">
            @for (f of frames(); track f.hour) {
              <div
                class="frames__frame"
                [style.--level]="f.level"
                [title]="f.label + ' — ' + minutesLabel(f.minutes)"
              >
                @if (f.hour % 6 === 0) {
                  <span class="frames__hour">{{ f.label }}</span>
                }
              </div>
            }
          </div>
          <p class="folio__aside">{{ reading() }}</p>
        </div>
      } @else {
        <p class="folio__empty">no rhythm to read yet — the frames fill as reels accumulate</p>
      }
    </section>
  `,
})
export class NightRhythm {
  protected readonly store = inject(Store);

  private readonly minutesByHour = computed(() => {
    const bins = new Array(24).fill(0) as number[];
    const pool = [...this.store.editingSessions(), ...(this.ongoing() ? [this.ongoing()!] : [])];
    for (const s of pool) {
      // Walk the session hour by hour, crediting each bin with its overlap.
      let cursor = s.startMs;
      while (cursor < s.endMs) {
        const d = new Date(cursor);
        const hourEnd = new Date(d).setMinutes(60, 0, 0);
        const slice = Math.min(hourEnd, s.endMs) - cursor;
        bins[d.getHours()] += slice / 60_000;
        cursor += slice;
      }
    }
    return bins;
  });

  private ongoing() {
    return this.store.editingOngoing();
  }

  protected readonly total = computed(() => this.minutesByHour().reduce((a, b) => a + b, 0));

  protected readonly frames = computed<FrameCell[]>(() => {
    const bins = this.minutesByHour();
    const max = Math.max(...bins, 1);
    return bins.map((minutes, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      minutes,
      level: minutes / max,
    }));
  });

  protected readonly reading = computed(() => {
    const bins = this.minutesByHour();
    const peak = bins.indexOf(Math.max(...bins));
    const starts = this.store.editingSessions().map((s) => new Date(s.startMs).getHours());
    if (!starts.length) return '';
    starts.sort((a, b) => a - b);
    const medianStart = starts[starts.length >> 1];
    return (
      `the busiest frame is ${String(peak).padStart(2, '0')}:00–${String((peak + 1) % 24).padStart(2, '0')}:00; ` +
      `a typical reel starts in the ${String(medianStart).padStart(2, '0')}:00 hour.`
    );
  });

  protected minutesLabel(m: number): string {
    return m < 1 ? 'quiet' : `${Math.round(m)} min on record`;
  }

  protected alt(): string {
    return 'Histogram of editing minutes by hour of day';
  }
}
