import { Component, computed, inject } from '@angular/core';
import { fmtClock } from '../lib/derive';
import { Store } from '../store';
import { FolioNav } from './folio-nav';
import { Odo } from './odo';

@Component({
  selector: 'app-box-head',
  imports: [FolioNav, Odo],
  template: `
    <header class="masthead">
      <div class="masthead__rule">
        <span class="masthead__date">{{ dateLine() }}</span>
        <app-folio-nav />
        <span class="masthead__status" [class.masthead__status--live]="!store.demo">
          @if (store.demo) {
            specimen pages — nothing here is real
          } @else if (store.boxOffice() === 'ready') {
            <i class="masthead__pip" style="--place: var(--brass)"></i>
            the house is open
          } @else {
            <i class="masthead__pip masthead__pip--away"></i>
            the box office is dark
          }
        </span>
        <span class="masthead__clock">{{ clock() }}</span>
      </div>

      <h1 class="masthead__word">The Box Office</h1>
      <p class="masthead__sub">
        the audience's ledger — counted nightly, never inflated
      </p>

      <dl class="masthead__stats">
        <div class="masthead__stat">
          <dt>subscribers</dt>
          <dd><odo [value]="subs()" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>lifetime views</dt>
          <dd class="masthead__stat-text">{{ viewsLabel() }}</dd>
        </div>
        <div class="masthead__stat">
          <dt>on the marquee</dt>
          <dd><odo [value]="store.showings().length" /></dd>
        </div>
        <div class="masthead__stat">
          <dt>ideas banked</dt>
          <dd><odo [value]="ideasBanked()" /></dd>
        </div>
      </dl>
    </header>
  `,
})
export class BoxHead {
  protected readonly store = inject(Store);

  protected readonly clock = computed(() => fmtClock(this.store.nowMs()));
  protected readonly subs = computed(() => Number(this.store.channel().latest?.subs ?? 0));

  protected readonly viewsLabel = computed(() => {
    const v = Number(this.store.channel().latest?.views ?? 0);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 10_000) return `${Math.round(v / 1000)}k`;
    return String(v);
  });

  protected readonly ideasBanked = computed(() =>
    this.store.scoutNotes().reduce((n, note) => n + note.ideas.length, 0),
  );

  protected dateLine(): string {
    return new Date(this.store.nowMs())
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      .toLowerCase();
  }
}
