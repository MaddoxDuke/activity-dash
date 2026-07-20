import { Component, computed, inject } from '@angular/core';
import { CALL_CADENCE, CALL_SHEET, CALL_TOTALS } from '../lib/call-sheet';
import { mondayWeekday } from '../lib/derive';
import { placeMeta } from '../lib/places';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio X — the call sheet. The declared week: where the hours are meant
 * to go before the ledger says where they went. Today's column is marked;
 * the analyst referees the difference nightly.
 */
@Component({
  selector: 'app-call-sheet',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">X</span>
        <h2 class="folio__title">The Call Sheet</h2>
        <span class="folio__note">the declared week, version one — a wager the analyst referees</span>
      </header>

      <div class="callsheet" role="table" aria-label="Weekly schedule">
        @for (d of days(); track d.weekday) {
          <div class="callsheet__day" [class.callsheet__day--today]="d.weekday === today()">
            <h3 class="callsheet__name">
              {{ d.name }}
              @if (d.weekday === today()) {
                <span class="callsheet__today-pip" aria-label="today"></span>
              }
            </h3>
            @for (b of d.blocks; track $index) {
              <div class="callsheet__block" [class.callsheet__block--free]="b.kind === 'free'">
                @if (b.kind !== 'free') {
                  <i class="tickmark" [style.--place]="color(b.kind)"></i>
                }
                <span class="callsheet__label">{{ b.label }}</span>
                @if (b.time) {
                  <span class="callsheet__time">{{ b.time }}</span>
                }
                @if (b.note) {
                  <span class="callsheet__note">{{ b.note }}</span>
                }
              </div>
            }
          </div>
        }
      </div>

      <p class="callsheet__cadence">{{ cadence }}</p>
      <p class="folio__aside">{{ totals }} — revisions happen in review, as the evidence comes in.</p>
    </section>
  `,
})
export class CallSheet {
  protected readonly store = inject(Store);
  protected readonly days = computed(() => CALL_SHEET);
  protected readonly cadence = CALL_CADENCE;
  protected readonly totals = CALL_TOTALS;

  protected readonly today = computed(() => mondayWeekday(new Date(this.store.nowMs())));

  protected color(kind: string): string {
    return placeMeta(kind).color;
  }
}
