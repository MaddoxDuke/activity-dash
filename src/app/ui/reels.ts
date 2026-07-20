import { Component, computed, inject } from '@angular/core';
import { fmtClock, fmtDuration } from '../lib/derive';
import { Session } from '../lib/types';
import { Store } from '../store';
import { Reveal } from './reveal';

const SHOWN = 21;
/** A reel bar reaches full width at this duration. */
const FULL_REEL_MIN = 4 * 60;

interface ReelRow {
  key: number;
  dateLabel: string;
  span: string;
  duration: string;
  pct: number;
  broken: boolean;
  ongoing: boolean;
}

/**
 * Folio II — the shelf of reels. Every editing session as a strip of film:
 * length is editing time, sprocket holes run along the edge, a torn end marks
 * a session whose stop was never announced.
 */
@Component({
  selector: 'app-reels',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">II</span>
        <h2 class="folio__title">The Shelf of Reels</h2>
        <span class="folio__note">
          @if (rows().length) {
            last {{ rows().length }} sitting{{ rows().length === 1 ? '' : 's' }}, newest on top
          } @else {
            awaiting the first sitting
          }
        </span>
      </header>

      @if (rows().length) {
        <ul class="reels" role="list">
          @for (r of rows(); track r.key) {
            <li class="reels__row" [class.reels__row--broken]="r.broken">
              <span class="reels__date">{{ r.dateLabel }}</span>
              <span
                class="reels__strip"
                [class.reels__strip--ongoing]="r.ongoing"
                [style.width.%]="r.pct"
                [title]="r.span + ' · ' + r.duration"
              ></span>
              <span class="reels__len">
                @if (r.broken) {
                  reel broke — length unknown
                } @else {
                  {{ r.duration }} <span class="reels__span">{{ r.span }}</span>
                }
              </span>
            </li>
          }
        </ul>
        @if (store.editingBrokenReels() > 0) {
          <p class="folio__aside">
            {{ store.editingBrokenReels() }} broken reel{{
              store.editingBrokenReels() === 1 ? '' : 's'
            }}
            — sessions whose end was never announced. a gap in the record, never a guess.
          </p>
        }
      } @else {
        <p class="folio__empty">the shelf is bare — reels appear once editing sessions arrive</p>
      }
    </section>
  `,
})
export class Reels {
  protected readonly store = inject(Store);

  protected readonly rows = computed<ReelRow[]>(() => {
    const done = this.store.editingSessions();
    const broken = this.store
      .activities()
      .filter((a) => a.place === 'editing' && a.end === 'unknown');
    const ongoing = this.store.editingOngoing();
    const all: Session[] = [...done, ...broken, ...(ongoing ? [ongoing] : [])]
      .sort((a, b) => b.startMs - a.startMs)
      .slice(0, SHOWN);

    return all.map((s) => {
      const mins = (s.endMs - s.startMs) / 60_000;
      const isBroken = s.end === 'unknown';
      return {
        key: s.startMs,
        dateLabel: new Date(s.startMs)
          .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          .toLowerCase(),
        span: `${fmtClock(s.startMs)}–${s.end === 'ongoing' ? 'now' : fmtClock(s.endMs)}`,
        duration: fmtDuration(mins),
        pct: isBroken ? 12 : Math.max(4, Math.min(100, (mins / FULL_REEL_MIN) * 100)),
        broken: isBroken,
        ongoing: s.end === 'ongoing',
      };
    });
  });
}
