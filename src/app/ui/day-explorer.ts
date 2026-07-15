import { Component, computed, inject } from '@angular/core';
import { fmtDuration } from '../lib/derive';
import { placeMeta, placeOrder } from '../lib/places';
import { Store } from '../store';
import { DayBand } from './day-band';
import { Reveal } from './reveal';

@Component({
  selector: 'app-day-explorer',
  imports: [DayBand, Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">I</span>
        <h2 class="folio__title">The Day</h2>
        <span class="folio__note">run the cursor along the band to interrogate an hour</span>
      </header>

      <div class="explorer__nav">
        <button class="explorer__step" (click)="store.stepDay(-1)" title="previous day (←)">
          ‹ earlier
        </button>
        <div class="explorer__date">
          <strong>{{ dayTitle() }}</strong>
          @if (!store.isToday()) {
            <button class="explorer__today" (click)="store.goToday()" title="jump to today (t)">
              return to today
            </button>
          } @else {
            <span class="explorer__today-mark">today</span>
          }
        </div>
        <button
          class="explorer__step"
          (click)="store.stepDay(1)"
          [disabled]="store.isToday()"
          title="next day (→)"
        >
          later ›
        </button>
      </div>

      <day-band
        [slices]="store.selectedSlices()"
        [dayMs]="store.selectedDayMs()"
        [nowMs]="store.nowMs()"
        [hero]="true"
      />

      @if (summary().length) {
        <p class="explorer__summary">
          @for (part of summary(); track part.place; let last = $last) {
            <span [style.--place]="part.color"
              ><i class="tickmark"></i>{{ part.label }} {{ part.dur }}</span
            >{{ last ? '' : ' · ' }}
          }
        </p>
      } @else {
        <p class="explorer__summary explorer__summary--empty">
          nothing recorded this day — the ledger holds its breath
        </p>
      }
    </section>
  `,
})
export class DayExplorer {
  protected readonly store = inject(Store);

  protected dayTitle(): string {
    return new Date(this.store.selectedDayMs())
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      .toLowerCase();
  }

  protected readonly summary = computed(() => {
    const totals = new Map<string, number>();
    for (const s of this.store.selectedSlices()) {
      if (!s.session.valid) continue;
      totals.set(s.place, (totals.get(s.place) ?? 0) + (s.endMin - s.startMin));
    }
    return placeOrder([...totals.keys()]).map((place) => ({
      place,
      label: placeMeta(place).label.toLowerCase(),
      color: placeMeta(place).color,
      dur: fmtDuration(totals.get(place)!),
    }));
  });
}
