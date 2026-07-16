import { Component, computed, inject } from '@angular/core';
import { fmtClock } from '../lib/derive';
import { Store } from '../store';
import { Reveal } from './reveal';

const SHOWN = 12;

/** Folio V — the bench's own ledger: only what RoughCut announced. */
@Component({
  selector: 'app-cutting-ledger',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">V</span>
        <h2 class="folio__title">The Bench Ledger</h2>
        <span class="folio__note">what the beacon said, newest first</span>
      </header>

      @if (rows().length) {
        <table class="ledger">
          <thead>
            <tr>
              <th scope="col">when</th>
              <th scope="col">event</th>
              <th scope="col">source</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td class="ledger__when">{{ r.when }}</td>
                <td class="ledger__event">
                  <i class="tickmark" style="--place: var(--ink-edit)"></i>{{ r.event }}
                </td>
                <td class="ledger__source">{{ r.source }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="folio__empty">nothing announced yet — the beacon speaks only when the app runs</p>
      }
    </section>
  `,
})
export class CuttingLedger {
  protected readonly store = inject(Store);

  protected readonly rows = computed(() =>
    this.store
      .editingEvents()
      .slice(-SHOWN)
      .reverse()
      .map((e) => ({
        id: e.id,
        when: `${new Date(e.tsMs)
          .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          .toLowerCase()} ${fmtClock(e.tsMs)}`,
        event: e.event,
        source: e.source,
      })),
  );
}
