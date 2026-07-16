import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { fmtClock, fmtDuration } from '../lib/derive';
import { Store } from '../store';
import { Reveal } from './reveal';

/**
 * Folio I — the bench tonight. When a reel is turning, a live timecode
 * counts the session up by the second, machined like a deck counter.
 * Otherwise: how the last reel ended.
 */
@Component({
  selector: 'app-bench-now',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">I</span>
        <h2 class="folio__title">Tonight at the Bench</h2>
        <span class="folio__note">
          @if (store.editingOngoing()) {
            the reel is turning now
          } @else {
            how the last reel ended
          }
        </span>
      </header>

      @if (store.editingOngoing(); as reel) {
        <div class="bench">
          <div class="bench__timecode" role="timer" aria-label="elapsed editing time">
            <span class="bench__digits">{{ elapsed() }}</span>
            <span class="bench__frames" aria-hidden="true">{{ ticks() }}</span>
          </div>
          <p class="bench__line">
            rolling since <strong>{{ clockOf(reel.startMs) }}</strong> — RoughCut will announce
            the cut when the bench goes dark
          </p>
        </div>
      } @else if (lastReel(); as last) {
        <div class="bench bench--dark">
          <div class="bench__timecode bench__timecode--settled">
            <span class="bench__digits">{{ lastDuration() }}</span>
          </div>
          <p class="bench__line">
            the bench went dark at <strong>{{ clockOf(last.endMs) }}</strong> on
            {{ dayOf(last.endMs) }} — a {{ lastDurationSpoken() }} reel
          </p>
        </div>
      } @else {
        <div class="bench bench--empty">
          <p class="bench__empty-mark" aria-hidden="true">✂</p>
          <p class="bench__line">
            no reels yet. when RoughCut opens on the editing machine it announces itself here —
            <span class="bench__mono">editing_start</span> when the bench lights,
            <span class="bench__mono">editing_stop</span> when it goes dark.
          </p>
        </div>
      }
    </section>
  `,
})
export class BenchNow {
  protected readonly store = inject(Store);

  /** Second-hand for the live timecode; runs only while this folio exists. */
  private readonly secondMs = signal(Date.now());

  constructor() {
    const timer = setInterval(() => this.secondMs.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected readonly elapsed = computed(() => {
    const reel = this.store.editingOngoing();
    if (!reel) return '00:00:00';
    const s = Math.max(0, Math.floor((this.secondMs() - reel.startMs) / 1000));
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  });

  /** A film-frame counter under the seconds — 24 fps, purely ornamental. */
  protected readonly ticks = computed(() => {
    void this.secondMs();
    return `+${String(Math.floor((Date.now() / (1000 / 24)) % 24)).padStart(2, '0')}f`;
  });

  protected readonly lastReel = computed(() => this.store.editingSessions().at(-1) ?? null);

  protected readonly lastDuration = computed(() => {
    const last = this.lastReel();
    if (!last) return '—';
    const mins = (last.endMs - last.startMs) / 60_000;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(Math.floor(mins / 60))}:${p(Math.round(mins) % 60)}:00`;
  });

  protected lastDurationSpoken(): string {
    const last = this.lastReel();
    return last ? fmtDuration((last.endMs - last.startMs) / 60_000) : '';
  }

  protected clockOf(ms: number): string {
    return fmtClock(ms);
  }

  protected dayOf(ms: number): string {
    return new Date(ms)
      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
      .toLowerCase();
  }
}
