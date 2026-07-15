import { Component, computed, inject } from '@angular/core';
import { fmtClock } from '../lib/derive';
import { placeMeta } from '../lib/places';
import { Store } from '../store';
import { Reveal } from './reveal';

const SHOWN = 18;

@Component({
  selector: 'app-ledger',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">VI</span>
        <h2 class="folio__title">The Ledger</h2>
        <span class="folio__note">the raw record, newest first — exactly as the machines told it</span>
      </header>

      @if (rows().length) {
        <table class="ledger">
          <thead>
            <tr>
              <th scope="col">when</th>
              <th scope="col">event</th>
              <th scope="col">source</th>
              <th scope="col" class="ledger__ago-col">ago</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td class="ledger__when">{{ r.when }}</td>
                <td class="ledger__event">
                  <i class="tickmark" [style.--place]="r.color"></i>{{ r.event }}
                </td>
                <td class="ledger__source">{{ r.source }}</td>
                <td class="ledger__ago">{{ r.ago }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="folio__empty">
          the ledger is empty — the first arrival will be recorded here
        </p>
      }
    </section>
  `,
})
export class Ledger {
  protected readonly store = inject(Store);

  protected readonly rows = computed(() => {
    const now = this.store.nowMs();
    return this.store
      .derived()
      .events.slice(-SHOWN)
      .reverse()
      .map((e) => ({
        id: e.id,
        when: `${new Date(e.tsMs)
          .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          .toLowerCase()} ${fmtClock(e.tsMs)}`,
        event: e.event,
        color: e.place ? placeMeta(e.place).color : 'var(--ink-faint)',
        source: e.source,
        ago: this.ago(now - e.tsMs),
      }));
  });

  private ago(ms: number): string {
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 48) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
}
