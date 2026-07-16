import { Component, HostListener, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Balance } from '../ui/balance';
import { DayExplorer } from '../ui/day-explorer';
import { GymSessions } from '../ui/gym-sessions';
import { Ledger } from '../ui/ledger';
import { Masthead } from '../ui/masthead';
import { Passages } from '../ui/passages';
import { WeekRhythm } from '../ui/week-rhythm';

@Component({
  selector: 'app-almanac-page',
  imports: [Masthead, DayExplorer, WeekRhythm, GymSessions, Balance, Passages, Ledger],
  template: `
    <app-masthead />

    @if (store.demo) {
      <p class="specimen-note">
        these are specimen pages, drawn from an invented ten weeks —
        <a href="/">present a key to open the real almanac</a>
      </p>
    }
    @if (store.fetchError()) {
      <p class="specimen-note">{{ store.fetchError() }}</p>
    }

    <main>
      <app-day-explorer />
      <app-week-rhythm />
      <app-gym-sessions />
      <app-balance />
      <app-passages />
      <app-ledger />
    </main>

    <footer class="colophon">
      <p>
        @if (observedSince(); as since) {
          under observation since {{ since }} ·
        }
        {{ store.totalEvents() }} events
        @if (store.derived().orphans > 0) {
          · {{ store.derived().orphans }} orphaned departure{{
            store.derived().orphans === 1 ? '' : 's'
          }}
        }
        · fed by <span class="colophon__mono">api.maddox-duke.com</span>
      </p>
      <p class="colophon__keys">
        <kbd>←</kbd><kbd>→</kbd> travel between days · <kbd>t</kbd> return to today
        @if (!store.demo) {
          · <button class="colophon__lock" (click)="store.lock()">close the almanac</button>
        }
      </p>
    </footer>
  `,
})
export class AlmanacPage {
  protected readonly store = inject(Store);

  protected readonly observedSince = computed(() => {
    const ms = this.store.observedSinceMs();
    if (ms === null) return null;
    return new Date(ms)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      .toLowerCase();
  });

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.store.state() !== 'ready') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') {
      this.store.stepDay(-1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      this.store.stepDay(1);
      e.preventDefault();
    } else if (e.key === 't' || e.key === 'T') {
      this.store.goToday();
    }
  }
}
