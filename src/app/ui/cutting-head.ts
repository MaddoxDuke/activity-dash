import { Component, computed, inject } from '@angular/core';
import { fmtClock, fmtDuration } from '../lib/derive';
import { Store } from '../store';
import { FolioNav } from './folio-nav';
import { Odo } from './odo';

@Component({
  selector: 'app-cutting-head',
  imports: [FolioNav, Odo],
  template: `
    <header class="masthead">
      <div class="masthead__rule">
        <span class="masthead__date">{{ dateLine() }}</span>
        <app-folio-nav />
        <span class="masthead__status" [class.masthead__status--live]="!store.demo">
          @if (store.demo) {
            specimen pages — nothing here is real
          } @else if (store.editingOngoing(); as reel) {
            <i class="masthead__pip" style="--place: var(--ink-edit)"></i>
            a reel is turning — since {{ clockOf(reel.startMs) }}
          } @else {
            <i class="masthead__pip masthead__pip--away"></i>
            no editing running
          }
        </span>
        <span class="masthead__clock">{{ clock() }}</span>
      </div>

      <h1 class="masthead__word">The Cutting Room</h1>
      <p class="masthead__sub">
        editing sessions at the desk — announced by RoughCut, kept without judgement
      </p>

      <dl class="masthead__stats">
        <div class="masthead__stat">
          <dt>reels on the shelf</dt>
          <dd><odo [value]="store.editingSessions().length" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>hours editing</dt>
          <dd><odo [value]="hoursRounded()" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>typical reel</dt>
          <dd class="masthead__stat-text">{{ typicalReel() }}</dd>
        </div>
        <div class="masthead__stat">
          <dt>broken reels</dt>
          <dd><odo [value]="store.editingBrokenReels()" /></dd>
        </div>
      </dl>
    </header>
  `,
})
export class CuttingHead {
  protected readonly store = inject(Store);

  protected readonly clock = computed(() => fmtClock(this.store.nowMs()));
  protected readonly hoursRounded = computed(() => Math.round(this.store.editingHours()));

  protected readonly typicalReel = computed(() => {
    const list = this.store.editingSessions();
    if (!list.length) return '—';
    const mins = list
      .map((s) => (s.endMs - s.startMs) / 60_000)
      .sort((a, b) => a - b);
    const mid = mins.length >> 1;
    const median = mins.length % 2 ? mins[mid] : (mins[mid - 1] + mins[mid]) / 2;
    return fmtDuration(median);
  });

  protected dateLine(): string {
    return new Date(this.store.nowMs())
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
}
