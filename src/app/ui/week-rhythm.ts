import { Component, computed, inject } from '@angular/core';
import { dayKey, fmtDuration, slicesForDay } from '../lib/derive';
import { Store } from '../store';
import { DayBand } from './day-band';
import { Reveal } from './reveal';

@Component({
  selector: 'app-week-rhythm',
  imports: [DayBand, Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">II</span>
        <h2 class="folio__title">The Week</h2>
        <span class="folio__note">seven days abreast — the rhythm shows itself</span>
      </header>

      <div class="rhythm">
        @for (row of rows(); track row.dayMs) {
          <button
            class="rhythm__row"
            [class.rhythm__row--selected]="row.selected"
            [class.rhythm__row--future]="row.future"
            [disabled]="row.future"
            (click)="store.selectDay(row.dayMs)"
          >
            <span class="rhythm__label">{{ row.label }}</span>
            <day-band
              class="rhythm__band"
              [slices]="row.slices"
              [dayMs]="row.dayMs"
              [nowMs]="store.nowMs()"
            />
            <span class="rhythm__hours">{{ row.total }}</span>
          </button>
        }
      </div>
    </section>
  `,
})
export class WeekRhythm {
  protected readonly store = inject(Store);

  protected readonly rows = computed(() => {
    const selectedKey = dayKey(this.store.selectedDayMs());
    const todayKey = dayKey(this.store.nowMs());
    return this.store.weekDays().map((dayMs) => {
      const slices = slicesForDay(this.store.sessions(), dayMs);
      const mins = slices
        .filter((s) => s.session.valid)
        .reduce((m, s) => m + (s.endMin - s.startMin), 0);
      const key = dayKey(dayMs);
      return {
        dayMs,
        slices,
        selected: key === selectedKey,
        future: key > todayKey,
        label: new Date(dayMs)
          .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
          .toLowerCase(),
        total: mins > 0 ? fmtDuration(mins) : '—',
      };
    });
  });
}
