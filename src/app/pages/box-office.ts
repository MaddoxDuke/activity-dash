import { Component, inject } from '@angular/core';
import { Store } from '../store';
import { BoxHead } from '../ui/box-head';
import { HouseCurve } from '../ui/house-curve';
import { NowShowing } from '../ui/now-showing';
import { ScoutsNotes } from '../ui/scouts-notes';

@Component({
  selector: 'app-box-office-page',
  imports: [BoxHead, NowShowing, HouseCurve, ScoutsNotes],
  template: `
    <app-box-head />

    @if (store.demo) {
      <p class="specimen-note">
        this is a specimen box office, screening an invented channel —
        <a href="/box-office">present a key to open the real one</a>
      </p>
    }

    @if (store.boxOffice() === 'ready') {
      <main>
        <app-now-showing />
        <app-house-curve />
        <app-scouts-notes />
      </main>
    } @else if (store.boxOffice() === 'loading') {
      <p class="folio__empty">counting the house…</p>
    } @else {
      <div class="dark-house">
        <p class="dark-house__bulbs" aria-hidden="true">· · · · · · · · · · · ·</p>
        <p class="dark-house__line">
          the box office is dark — its service hasn't been lit yet.
        </p>
        <p class="dark-house__detail">
          when <span class="colophon__mono">tube.maddox-duke.com</span> answers, tonight's
          numbers and the scout's notes appear here on their own.
        </p>
      </div>
    }

    <footer class="colophon">
      <p>
        counted nightly at 3:30 · scouted daily by a scheduled routine · fed by
        <span class="colophon__mono">tube.maddox-duke.com</span>
      </p>
      <p class="colophon__keys">
        public numbers only — the ledger never guesses at what YouTube won't say
        @if (!store.demo) {
          · <button class="colophon__lock" (click)="store.lock()">close the almanac</button>
        }
      </p>
    </footer>
  `,
})
export class BoxOfficePage {
  protected readonly store = inject(Store);
}
