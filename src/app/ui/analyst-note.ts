import { Component, computed, inject, signal } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio VII — the analyst's notes. Filed nightly by a scheduled Claude
 * routine reading the real record (on the operator's subscription, not an
 * API key). The almanac only ever displays what was filed.
 */
@Component({
  selector: 'app-analyst-note',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">VII</span>
        <h2 class="folio__title">The Analyst</h2>
        <span class="folio__note">nightly counsel drawn from the record — observations first, then wagers</span>
      </header>

      @if (note(); as n) {
        <div class="scout">
          <div class="scout__dateline">
            <button class="scout__page" (click)="step(1)" [disabled]="!hasOlder()" aria-label="older note">‹</button>
            <span class="scout__date">{{ dateLabel() }}</span>
            <button class="scout__page" (click)="step(-1)" [disabled]="!hasNewer()" aria-label="newer note">›</button>
          </div>

          <p class="scout__briefing">{{ n.briefing }}</p>

          @if (n.observations.length) {
            <h3 class="scout__sub">observed</h3>
            <ul class="scout__trends" role="list">
              @for (o of n.observations; track $index) {
                <li><span class="scout__trend-title">{{ o }}</span></li>
              }
            </ul>
          }

          @if (n.suggestions.length) {
            <h3 class="scout__sub">counsel for tomorrow</h3>
            <ol class="scout__ideas" role="list">
              @for (s of n.suggestions; track $index) {
                <li class="scout__idea">
                  <span class="scout__idea-title">{{ s }}</span>
                </li>
              }
            </ol>
          }
        </div>
      } @else {
        <p class="folio__empty">
          the analyst has not filed yet — the first note arrives after tonight's rounds
        </p>
      }
    </section>
  `,
})
export class AnalystNoteFolio {
  protected readonly store = inject(Store);

  private readonly index = signal(0);

  protected readonly note = computed(() => this.store.analystNotes()[this.index()] ?? null);
  protected readonly hasOlder = computed(() => this.index() < this.store.analystNotes().length - 1);
  protected readonly hasNewer = computed(() => this.index() > 0);

  protected step(delta: number): void {
    const max = this.store.analystNotes().length - 1;
    this.index.set(Math.min(Math.max(this.index() + delta, 0), Math.max(max, 0)));
  }

  protected dateLabel(): string {
    const n = this.note();
    if (!n) return '';
    return new Date(n.day + 'T12:00:00')
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      .toLowerCase();
  }
}
