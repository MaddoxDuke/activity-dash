import { Component, computed, inject, signal } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio III — the scout's notes: each day a Claude routine walks the wider
 * territory (what's trending in the niche) and files ideas for the channel.
 * This folio is the archive; ‹ › walk the days.
 */
@Component({
  selector: 'app-scouts-notes',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">III</span>
        <h2 class="folio__title">The Scout's Notes</h2>
        <span class="folio__note">daily reconnaissance — trending pictures, and ideas cut for this house</span>
      </header>

      @if (note(); as n) {
        <div class="scout">
          <div class="scout__dateline">
            <button class="scout__page" (click)="step(1)" [disabled]="!hasOlder()" aria-label="older note">‹</button>
            <span class="scout__date">{{ dateLabel() }}</span>
            <button class="scout__page" (click)="step(-1)" [disabled]="!hasNewer()" aria-label="newer note">›</button>
          </div>

          @if (n.briefing) {
            <p class="scout__briefing">{{ n.briefing }}</p>
          }

          @if (n.trending.length) {
            <h3 class="scout__sub">seen in the territory</h3>
            <ul class="scout__trends" role="list">
              @for (t of n.trending; track $index) {
                <li>
                  <span class="scout__trend-title">{{ t.title }}</span>
                  @if (t.channel) { <span class="scout__trend-channel">— {{ t.channel }}</span> }
                  @if (t.why) { <span class="scout__trend-why">{{ t.why }}</span> }
                </li>
              }
            </ul>
          }

          <h3 class="scout__sub">cut for this house</h3>
          <ol class="scout__ideas" role="list">
            @for (idea of n.ideas; track $index) {
              <li class="scout__idea">
                <span class="scout__idea-title">{{ idea.title }}</span>
                @if (idea.angle) { <span class="scout__idea-angle">{{ idea.angle }}</span> }
              </li>
            }
          </ol>
        </div>
      } @else {
        <p class="folio__empty">
          no reconnaissance filed yet — the scout goes out nightly once the routine is lit
        </p>
      }
    </section>
  `,
})
export class ScoutsNotes {
  protected readonly store = inject(Store);

  /** 0 = newest note; +1 steps into the past. */
  private readonly index = signal(0);

  protected readonly note = computed(() => this.store.scoutNotes()[this.index()] ?? null);
  protected readonly hasOlder = computed(() => this.index() < this.store.scoutNotes().length - 1);
  protected readonly hasNewer = computed(() => this.index() > 0);

  protected step(delta: number): void {
    const max = this.store.scoutNotes().length - 1;
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
