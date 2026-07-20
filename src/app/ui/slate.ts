import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio IV — the slate: every idea starred from the scout's notes, kept in
 * one place for review. Stars are copies, so the slate outlives the notes
 * that suggested them.
 */
@Component({
  selector: 'app-slate',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">IV</span>
        <h2 class="folio__title">The Slate</h2>
        <span class="folio__note">
          @if (rows().length) {
            {{ rows().length }} picture{{ rows().length === 1 ? '' : 's' }} under consideration
          } @else {
            ideas you star in the scout's notes gather here
          }
        </span>
      </header>

      @if (rows().length) {
        <ol class="scout__ideas slate__list" role="list">
          @for (s of rows(); track s.id) {
            <li class="scout__idea">
              <span class="scout__idea-title">{{ s.title }}</span>
              <button
                class="scout__star scout__star--kept"
                [attr.aria-pressed]="true"
                title="take off the slate"
                (click)="unstar(s.day, s.title, s.angle)"
              >★</button>
              <span class="scout__idea-angle">
                @if (s.angle) { {{ s.angle }} — }
                <span class="slate__scouted">scouted {{ dayLabel(s.day) }}</span>
              </span>
            </li>
          }
        </ol>
      } @else {
        <p class="folio__empty">the slate is clean — star an idea above and it takes its place here</p>
      }
    </section>
  `,
})
export class Slate {
  protected readonly store = inject(Store);

  protected readonly rows = computed(() => this.store.stars());

  protected unstar(day: string, title: string, angle: string | null): void {
    void this.store.toggleStar(day, { title, angle: angle ?? undefined });
  }

  protected dayLabel(day: string): string {
    return new Date(day + 'T12:00:00')
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      .toLowerCase();
  }
}
