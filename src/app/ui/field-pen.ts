import { Component, computed, inject, signal } from '@angular/core';
import { fmtClock, fmtDuration } from '../lib/derive';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio IX — the field pen. The almanac stops being a mirror here: start
 * and stop focus sessions, or log any snake_case event, straight from the
 * page. Entries land in the same ledger the geofences write to.
 */
@Component({
  selector: 'app-field-pen',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">IX</span>
        <h2 class="folio__title">The Field Pen</h2>
        <span class="folio__note">write to the record by hand — focus sessions, or any event you can name</span>
      </header>

      <div class="pen">
        <button class="pen__focus" [class.pen__focus--live]="store.focusOpen()" (click)="toggleFocus()">
          @if (store.focusOpen(); as f) {
            end the focus session — {{ elapsed(f.startMs) }} so far
          } @else {
            begin a focus session
          }
        </button>

        <form class="pen__custom" (submit)="logCustom($event)">
          <input
            class="pen__input"
            type="text"
            placeholder="or log any event — coffee_made, chapter_written…"
            [value]="draft()"
            (input)="draft.set(input.value)"
            #input
            aria-label="custom event name"
          />
          <button class="pen__write" type="submit" [disabled]="!draft().trim()">write it</button>
        </form>

        @if (store.penError()) {
          <p class="pen__error">{{ store.penError() }}</p>
        }
        @if (confirmation()) {
          <p class="pen__done">{{ confirmation() }}</p>
        }

        @if (todayFocus().length) {
          <h3 class="scout__sub">today at the desk</h3>
          <ul class="scout__trends" role="list">
            @for (f of todayFocus(); track f.startMs) {
              <li>
                <span class="scout__trend-title">
                  focus — @if (f.end === 'ongoing') { {{ elapsed(f.startMs) }}, still going }
                  @else { {{ fmtDur(f) }} ({{ clock(f.startMs) }}–{{ clock(f.endMs) }}) }
                </span>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
})
export class FieldPen {
  protected readonly store = inject(Store);
  protected readonly draft = signal('');
  protected readonly confirmation = signal('');

  protected readonly todayFocus = computed(() => {
    const dayStart = new Date(this.store.nowMs());
    dayStart.setHours(0, 0, 0, 0);
    return this.store
      .activities()
      .filter((a) => a.place === 'focus' && a.endMs > dayStart.getTime())
      .sort((a, b) => a.startMs - b.startMs);
  });

  protected async toggleFocus(): Promise<void> {
    const open = this.store.focusOpen();
    const ok = await this.store.penEvent(open ? 'focus_stop' : 'focus_start');
    this.confirmation.set(
      ok ? (open ? 'the session is closed and on the record.' : 'the pen is down — go.') : '',
    );
  }

  protected async logCustom(e: Event): Promise<void> {
    e.preventDefault();
    const name = this.draft().trim();
    if (!name) return;
    const ok = await this.store.penEvent(name);
    if (ok) {
      this.confirmation.set(`“${name}” written to the ledger.`);
      this.draft.set('');
    } else {
      this.confirmation.set('');
    }
  }

  protected elapsed(startMs: number): string {
    return fmtDuration((this.store.nowMs() - startMs) / 60_000);
  }
  protected fmtDur(f: { startMs: number; endMs: number }): string {
    return fmtDuration((f.endMs - f.startMs) / 60_000);
  }
  protected clock(ms: number): string {
    return fmtClock(ms);
  }
}
