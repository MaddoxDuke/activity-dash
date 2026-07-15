import { Component, computed, inject } from '@angular/core';
import { placeMeta, placeOrder } from '../lib/places';
import { Store } from '../store';
import { Reveal } from './reveal';

@Component({
  selector: 'app-balance',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">IV</span>
        <h2 class="folio__title">The Balance</h2>
        <span class="folio__note">where the recorded hours fell, week by week</span>
      </header>

      <div class="balance__legend">
        @for (p of legend(); track p.place) {
          <span class="balance__key" [style.--place]="p.color"
            ><i class="tickmark"></i>{{ p.label }}</span
          >
        }
      </div>

      <div class="balance">
        @for (w of rows(); track w.mondayMs) {
          <div class="balance__row" [class.balance__row--current]="w.current">
            <span class="balance__week">{{ w.label }}</span>
            <div class="balance__bar">
              @for (seg of w.segments; track seg.place) {
                <div
                  class="balance__seg"
                  [style.width.%]="seg.pct"
                  [style.--place]="seg.color"
                  [title]="seg.title"
                ></div>
              }
            </div>
            <span class="balance__total">{{ w.total }}</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class Balance {
  protected readonly store = inject(Store);

  private readonly maxTotal = computed(() =>
    Math.max(...this.store.weeks().map((w) => w.totalHours), 1),
  );

  protected readonly legend = computed(() => {
    const places = new Set<string>();
    for (const w of this.store.weeks()) {
      for (const p of Object.keys(w.hoursByPlace)) places.add(p);
    }
    return placeOrder([...places]).map((place) => ({
      place,
      label: placeMeta(place).label.toLowerCase(),
      color: placeMeta(place).color,
    }));
  });

  protected readonly rows = computed(() => {
    const weeks = this.store.weeks();
    return weeks.map((w, i) => {
      const places = placeOrder(Object.keys(w.hoursByPlace));
      return {
        mondayMs: w.mondayMs,
        label: w.label.toLowerCase(),
        current: i === weeks.length - 1,
        total: w.totalHours > 0 ? `${Math.round(w.totalHours)}h` : '—',
        segments: places.map((place) => ({
          place,
          color: placeMeta(place).color,
          pct: (w.hoursByPlace[place] / this.maxTotal()) * 100,
          title: `${placeMeta(place).label}: ${w.hoursByPlace[place].toFixed(1)}h`,
        })),
      };
    });
  });
}
