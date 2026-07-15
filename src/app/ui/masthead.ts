import { Component, computed, inject } from '@angular/core';
import { fmtClock } from '../lib/derive';
import { placeMeta } from '../lib/places';
import { Store } from '../store';
import { Odo } from './odo';

@Component({
  selector: 'app-masthead',
  imports: [Odo],
  template: `
    <header class="masthead">
      <div class="masthead__rule">
        <span class="masthead__date">{{ dateLine() }}</span>
        <span class="masthead__status" [class.masthead__status--live]="!store.demo">
          @if (store.demo) {
            specimen pages — nothing here is real
          } @else if (store.currentStay(); as stay) {
            <i class="masthead__pip" [style.--place]="color(stay.place)"></i>
            {{ phrase(stay.place) }} since {{ clockOf(stay.startMs) }}
          } @else {
            <i class="masthead__pip masthead__pip--away"></i>
            between places
          }
        </span>
        <span class="masthead__clock">{{ clock() }}</span>
      </div>

      <h1 class="masthead__word">Whereabouts</h1>
      <p class="masthead__sub">
        a private almanac of comings &amp; goings — recorded by geofence, kept without judgement
      </p>

      <dl class="masthead__stats">
        <div class="masthead__stat">
          <dt>days observed</dt>
          <dd><odo [value]="store.daysObserved()" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>events in the ledger</dt>
          <dd><odo [value]="store.totalEvents()" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>hours accounted for</dt>
          <dd><odo [value]="hoursRounded()" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>gym streak</dt>
          <dd><odo [value]="store.gymStreak()" [suffix]="dayWord()" /></dd>
        </div>
      </dl>
    </header>
  `,
})
export class Masthead {
  protected readonly store = inject(Store);

  protected readonly clock = computed(() => fmtClock(this.store.nowMs()));
  protected readonly hoursRounded = computed(() => Math.round(this.store.hoursAccounted()));
  protected readonly dayWord = computed(() =>
    this.store.gymStreak() === 1 ? ' day' : ' days',
  );

  protected dateLine(): string {
    const d = new Date(this.store.nowMs());
    return d
      .toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      .toLowerCase();
  }

  protected clockOf(ms: number): string {
    return fmtClock(ms);
  }
  protected color(place: string): string {
    return placeMeta(place).color;
  }
  protected phrase(place: string): string {
    return placeMeta(place).phrase;
  }
}
