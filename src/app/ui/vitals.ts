import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio VIII — vitals. Weight as an engraved line, appetite as medians.
 * Fed by an Apple Health shortcut (MyFitnessPal syncs into Health); the
 * folio stays sparse until the body reports in.
 */
@Component({
  selector: 'app-vitals',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">VIII</span>
        <h2 class="folio__title">Vitals</h2>
        <span class="folio__note">weight, appetite, movement — one entry per day via apple health</span>
      </header>

      @if (hasData()) {
        <div class="vitals">
          <dl class="masthead__stats vitals__stats">
            <div class="masthead__stat">
              <dt>weight</dt>
              <dd class="masthead__stat-text">{{ latestWeight() }}</dd>
            </div>
            <div class="masthead__stat">
              <dt>14-day drift</dt>
              <dd class="masthead__stat-text">{{ weightDrift() }}</dd>
            </div>
            <div class="masthead__stat">
              <dt>kcal, 7-day median</dt>
              <dd class="masthead__stat-text">{{ median7('calories') }}</dd>
            </div>
            <div class="masthead__stat">
              <dt>protein, 7-day median</dt>
              <dd class="masthead__stat-text">{{ median7('protein') }}</dd>
            </div>
          </dl>

          @if (weightSeries().length >= 2) {
            <div class="curve vitals__curve">
              <div class="curve__flank">
                <span class="curve__end">{{ firstWeightLabel() }}</span>
                <span class="curve__delta curve__delta--vitals">weight, {{ weightSeries().length }} entries</span>
                <span class="curve__end curve__end--now">{{ lastWeightLabel() }}</span>
              </div>
              <svg class="curve__svg curve__svg--vitals" viewBox="0 0 1000 110" preserveAspectRatio="none"
                role="img" aria-label="Body weight over recorded days">
                <polyline [attr.points]="weightPoints()" class="curve__line curve__line--vitals"
                  vector-effect="non-scaling-stroke" />
              </svg>
              <div class="curve__baseline"></div>
            </div>
          }
        </div>
      } @else {
        <p class="folio__empty">
          no vitals on file — a small health shortcut fills this page each morning
        </p>
      }
    </section>
  `,
})
export class Vitals {
  protected readonly store = inject(Store);

  protected readonly hasData = computed(() => this.store.metricRows().length > 0);

  private byName(name: string) {
    return this.store
      .metricRows()
      .filter((m) => m.name === name)
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }

  protected readonly weightSeries = computed(() =>
    this.byName('weight').slice(-14).map((m) => ({ day: m.day, v: Number(m.value), unit: m.unit })),
  );

  protected weightPoints(): string {
    const s = this.weightSeries();
    const vals = s.map((d) => d.v);
    const min = Math.min(...vals);
    const span = Math.max(Math.max(...vals) - min, 0.5);
    return s
      .map((d, i) => `${((i / (s.length - 1)) * 1000).toFixed(1)},${(102 - ((d.v - min) / span) * 90).toFixed(1)}`)
      .join(' ');
  }

  protected latestWeight(): string {
    const last = this.weightSeries().at(-1);
    return last ? `${last.v.toFixed(1)} ${last.unit ?? 'lb'}` : '—';
  }

  protected weightDrift(): string {
    const s = this.weightSeries();
    if (s.length < 2) return '—';
    const d = s[s.length - 1].v - s[0].v;
    return `${d >= 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)} ${s[0].unit ?? 'lb'}`;
  }

  protected median7(name: string): string {
    const vals = this.byName(name).slice(-7).map((m) => Number(m.value)).sort((a, b) => a - b);
    if (!vals.length) return '—';
    const mid = vals.length >> 1;
    const med = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    return Math.round(med).toLocaleString('en-US');
  }

  protected firstWeightLabel(): string {
    const first = this.weightSeries()[0];
    return first ? `${first.v.toFixed(1)} · ${shortDay(first.day)}` : '';
  }
  protected lastWeightLabel(): string {
    const last = this.weightSeries().at(-1);
    return last ? `${last.v.toFixed(1)} · ${shortDay(last.day)}` : '';
  }
}

function shortDay(day: string): string {
  return new Date(day + 'T12:00:00')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toLowerCase();
}
