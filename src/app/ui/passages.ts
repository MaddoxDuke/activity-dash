import { Component, computed, inject, signal } from '@angular/core';
import { fmtClock } from '../lib/derive';
import { placeMeta } from '../lib/places';
import { Store } from '../store';
import { Transition } from '../lib/types';
import { Reveal } from './reveal';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface Route {
  key: string;
  from: string;
  to: string;
  label: string;
  journeys: Transition[];
}

@Component({
  selector: 'app-passages',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">V</span>
        <h2 class="folio__title">Passages</h2>
        <span class="folio__note">each dot is one journey; the brass tick marks the median</span>
      </header>

      @if (routes().length) {
        <div class="passages__routes" role="tablist">
          @for (r of routes(); track r.key) {
            <button
              class="passages__route"
              role="tab"
              [attr.aria-selected]="r.key === selectedKey()"
              [class.passages__route--on]="r.key === selectedKey()"
              (click)="selectedKey.set(r.key)"
            >
              {{ r.label }} <em>×{{ r.journeys.length }}</em>
            </button>
          }
        </div>

        <div class="passages">
          @for (row of dotRows(); track row.weekday) {
            <div class="passages__row">
              <span class="passages__day">{{ row.weekday }}</span>
              <div class="passages__track">
                @for (j of row.journeys; track j.departMs) {
                  <i
                    class="passages__dot"
                    [style.left.%]="j.pct"
                    [title]="j.title"
                  ></i>
                }
                @if (row.medianPct !== null) {
                  <i class="passages__median" [style.left.%]="row.medianPct"></i>
                }
              </div>
              <span class="passages__median-label">{{ row.medianLabel }}</span>
            </div>
          }
          <div class="passages__scale">
            <span>0m</span>
            <span>{{ maxLabel() }}</span>
          </div>
        </div>
      } @else {
        <p class="folio__empty">no journeys measured yet — passages need a departure and an arrival</p>
      }
    </section>
  `,
})
export class Passages {
  protected readonly store = inject(Store);
  protected readonly selectedKey = signal<string | null>(null);

  protected readonly routes = computed<Route[]>(() => {
    const byKey = new Map<string, Route>();
    for (const t of this.store.transitions()) {
      const key = `${t.from}→${t.to}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          from: t.from,
          to: t.to,
          label: `${placeMeta(t.from).label.toLowerCase()} → ${placeMeta(t.to).label.toLowerCase()}`,
          journeys: [],
        });
      }
      byKey.get(key)!.journeys.push(t);
    }
    return [...byKey.values()]
      .filter((r) => r.journeys.length >= 2)
      .sort((a, b) => b.journeys.length - a.journeys.length)
      .slice(0, 4);
  });

  private readonly selected = computed<Route | null>(() => {
    const routes = this.routes();
    if (!routes.length) return null;
    return routes.find((r) => r.key === this.selectedKey()) ?? routes[0];
  });

  private readonly maxMinutes = computed(() => {
    const r = this.selected();
    if (!r) return 1;
    return Math.max(...r.journeys.map((j) => j.minutes)) * 1.15;
  });

  protected maxLabel(): string {
    return `${Math.round(this.maxMinutes())}m`;
  }

  protected readonly dotRows = computed(() => {
    const r = this.selected();
    if (!r) return [];
    const max = this.maxMinutes();
    return WEEKDAYS.map((weekday, wd) => {
      const journeys = r.journeys
        .filter((j) => j.weekday === wd)
        .map((j) => ({
          departMs: j.departMs,
          pct: (j.minutes / max) * 100,
          title: `${new Date(j.departMs).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })} · left ${fmtClock(j.departMs)} · ${Math.round(j.minutes)}m`,
        }));
      const sorted = r.journeys.filter((j) => j.weekday === wd).map((j) => j.minutes).sort((a, b) => a - b);
      const median = sorted.length
        ? sorted[Math.floor((sorted.length - 1) / 2)]
        : null;
      return {
        weekday,
        journeys,
        medianPct: median === null ? null : (median / max) * 100,
        medianLabel: median === null ? '—' : `${Math.round(median)}m`,
      };
    }).filter((row) => row.journeys.length > 0);
  });
}
