import { Component, HostListener, computed, inject } from '@angular/core';
import { Store } from './store';
import { Balance } from './ui/balance';
import { DayExplorer } from './ui/day-explorer';
import { Gate } from './ui/gate';
import { GymSessions } from './ui/gym-sessions';
import { Ledger } from './ui/ledger';
import { Masthead } from './ui/masthead';
import { Passages } from './ui/passages';
import { WeekRhythm } from './ui/week-rhythm';

@Component({
  selector: 'app-root',
  imports: [Gate, Masthead, DayExplorer, WeekRhythm, GymSessions, Balance, Passages, Ledger],
  templateUrl: './app.html',
})
export class App {
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
