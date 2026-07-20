import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio II — the house curve: subscribers over the recorded nights.
 * The line only exists where snapshots do; history accrues, never invented.
 */
@Component({
  selector: 'app-house-curve',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">II</span>
        <h2 class="folio__title">The House Curve</h2>
        <span class="folio__note">subscribers, one count per night</span>
      </header>

      @if (series().length >= 2) {
        <div class="curve">
          <div class="curve__flank">
            <span class="curve__end">{{ firstLabel() }}</span>
            <span class="curve__delta">{{ deltaLabel() }}</span>
            <span class="curve__end curve__end--now">{{ lastLabel() }}</span>
          </div>
          <svg class="curve__svg" viewBox="0 0 1000 140" preserveAspectRatio="none" role="img"
            [attr.aria-label]="alt()">
            <polyline [attr.points]="areaPoints()" class="curve__area" />
            <polyline [attr.points]="linePoints()" class="curve__line" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="curve__baseline"></div>
        </div>
      } @else {
        <p class="folio__empty">
          the curve needs nights — each 3:30am count adds a point; give it a week
        </p>
      }
    </section>
  `,
})
export class HouseCurve {
  protected readonly store = inject(Store);

  protected readonly series = computed(() => this.store.channel().series);

  private readonly bounds = computed(() => {
    const subs = this.series().map((d) => Number(d.subs));
    const min = Math.min(...subs);
    const max = Math.max(...subs);
    return { min, span: Math.max(max - min, 1) };
  });

  protected readonly linePoints = computed(() => {
    const s = this.series();
    const { min, span } = this.bounds();
    return s
      .map((d, i) => {
        const x = (i / (s.length - 1)) * 1000;
        const y = 132 - ((Number(d.subs) - min) / span) * 120;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  protected readonly areaPoints = computed(
    () => `0,140 ${this.linePoints()} 1000,140`,
  );

  protected firstLabel(): string {
    const first = this.series()[0];
    return first ? `${fmtSubs(first.subs)} · ${shortDay(first.day)}` : '';
  }
  protected lastLabel(): string {
    const last = this.series().at(-1);
    return last ? `${fmtSubs(last.subs)} · now` : '';
  }
  protected deltaLabel(): string {
    const s = this.series();
    const d = Number(s.at(-1)!.subs) - Number(s[0].subs);
    return d >= 0 ? `▲${fmtSubs(d)} across ${s.length} nights` : `▼${fmtSubs(-d)}`;
  }
  protected alt(): string {
    return `Subscriber count over the last ${this.series().length} recorded days`;
  }
}

function fmtSubs(n: number | string): string {
  return Number(n).toLocaleString('en-US');
}
function shortDay(day: string): string {
  const d = new Date(day + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toLowerCase();
}
