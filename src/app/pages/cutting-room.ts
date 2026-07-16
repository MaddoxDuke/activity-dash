import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { BenchNow } from '../ui/bench-now';
import { CuttingHead } from '../ui/cutting-head';
import { CuttingLedger } from '../ui/cutting-ledger';
import { NightRhythm } from '../ui/night-rhythm';
import { Reels } from '../ui/reels';
import { Trade } from '../ui/trade';

@Component({
  selector: 'app-cutting-room-page',
  imports: [CuttingHead, BenchNow, Reels, Trade, NightRhythm, CuttingLedger],
  template: `
    <app-cutting-head />

    @if (store.demo) {
      <p class="specimen-note">
        these are specimen reels, cut from an invented ten weeks —
        <a href="/cutting-room">present a key to open the real cutting room</a>
      </p>
    }
    @if (store.fetchError()) {
      <p class="specimen-note">{{ store.fetchError() }}</p>
    }

    <main>
      <app-bench-now />
      <app-reels />
      <app-trade />
      <app-night-rhythm />
      <app-cutting-ledger />
    </main>

    <footer class="colophon">
      <p>
        @if (firstReel(); as since) {
          reels kept since {{ since }} ·
        }
        {{ store.editingEvents().length }} announcements
        @if (store.derived().activityOrphans > 0) {
          · {{ store.derived().activityOrphans }} orphaned stop{{
            store.derived().activityOrphans === 1 ? '' : 's'
          }}
        }
        · announced by <span class="colophon__mono">RoughCut</span> · fed by
        <span class="colophon__mono">api.maddox-duke.com</span>
      </p>
      <p class="colophon__keys">
        durations are derived by pairing, never stored — a missed announcement is a gap, not a
        guess
        @if (!store.demo) {
          · <button class="colophon__lock" (click)="store.lock()">close the almanac</button>
        }
      </p>
    </footer>
  `,
})
export class CuttingRoomPage {
  protected readonly store = inject(Store);

  protected readonly firstReel = computed(() => {
    const first = this.store.editingEvents()[0];
    if (!first) return null;
    return new Date(first.tsMs)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      .toLowerCase();
  });
}
