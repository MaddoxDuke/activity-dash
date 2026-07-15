import { Component, computed, inject } from '@angular/core';
import { fmtClock, fmtDuration, mondayOf } from '../lib/derive';
import { Store } from '../store';
import { Reveal } from './reveal';

const SHOWN = 24;

@Component({
  selector: 'app-gym-sessions',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">III</span>
        <h2 class="folio__title">Sessions Under the Bar</h2>
        <span class="folio__note">every recorded visit to the gym, most recent to the right</span>
      </header>

      @if (bars().length) {
        <div class="gym">
          <div class="gym__strip" role="img" [attr.aria-label]="stripAlt()">
            @if (avgPct() !== null) {
              <div class="gym__avg" [style.bottom.%]="avgPct()!">
                <span>avg {{ avgLabel() }}</span>
              </div>
            }
            @for (b of bars(); track b.startMs) {
              <div class="gym__slot" [title]="b.title">
                <div class="gym__stem" [style.height.%]="b.pct"></div>
                @if (b.dateLabel) {
                  <span class="gym__date">{{ b.dateLabel }}</span>
                }
              </div>
            }
          </div>

          <dl class="gym__facts">
            <div><dt>this week</dt><dd>{{ thisWeekCount() }} visit{{ thisWeekCount() === 1 ? '' : 's' }}</dd></div>
            <div><dt>typical session</dt><dd>{{ avgLabel() }}</dd></div>
            <div><dt>longest on record</dt><dd>{{ longestLabel() }}</dd></div>
            <div><dt>current streak</dt><dd>{{ store.gymStreak() }} day{{ store.gymStreak() === 1 ? '' : 's' }}</dd></div>
          </dl>
        </div>
      } @else {
        <p class="folio__empty">no gym sessions in the ledger yet — the bar waits</p>
      }
    </section>
  `,
})
export class GymSessions {
  protected readonly store = inject(Store);

  private readonly recent = computed(() => this.store.gymSessions().slice(-SHOWN));

  protected readonly bars = computed(() => {
    const list = this.recent();
    const max = Math.max(...list.map((s) => s.endMs - s.startMs), 1);
    return list.map((s, i) => {
      const mins = (s.endMs - s.startMs) / 60_000;
      const d = new Date(s.startMs);
      const every = Math.max(1, Math.ceil(list.length / 6));
      return {
        startMs: s.startMs,
        pct: ((s.endMs - s.startMs) / max) * 100,
        title: `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtClock(s.startMs)} · ${fmtDuration(mins)}`,
        dateLabel:
          i % every === 0
            ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toLowerCase()
            : null,
      };
    });
  });

  protected readonly avgMins = computed(() => {
    const list = this.recent();
    if (!list.length) return null;
    return list.reduce((m, s) => m + (s.endMs - s.startMs) / 60_000, 0) / list.length;
  });

  protected readonly avgPct = computed(() => {
    const list = this.recent();
    const avg = this.avgMins();
    if (avg === null) return null;
    const max = Math.max(...list.map((s) => (s.endMs - s.startMs) / 60_000), 1);
    return (avg / max) * 100;
  });

  protected avgLabel(): string {
    const avg = this.avgMins();
    return avg === null ? '—' : fmtDuration(avg);
  }

  protected longestLabel(): string {
    const all = this.store.gymSessions();
    if (!all.length) return '—';
    const longest = Math.max(...all.map((s) => (s.endMs - s.startMs) / 60_000));
    return fmtDuration(longest);
  }

  protected thisWeekCount(): number {
    const monday = mondayOf(this.store.nowMs());
    return this.store.gymSessions().filter((s) => s.startMs >= monday).length;
  }

  protected stripAlt(): string {
    return `Durations of the last ${this.bars().length} gym sessions`;
  }
}
