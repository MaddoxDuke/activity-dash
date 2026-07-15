import { Component, computed, input, signal } from '@angular/core';
import { fmtClock } from '../lib/derive';
import { placeMeta } from '../lib/places';
import { DaySlice } from '../lib/types';

/**
 * A 24-hour band: the day rendered as an engraved rule with inked stays.
 * Hero variant adds hour labels, a live needle, and a hover/touch probe.
 */
@Component({
  selector: 'day-band',
  template: `
    <div
      class="band"
      [class.band--hero]="hero()"
      (pointermove)="hero() && probe($event)"
      (pointerleave)="probeMin.set(null)"
    >
      <div class="band__ticks" aria-hidden="true">
        @for (h of hours; track h) {
          <span
            class="band__tick"
            [class.band__tick--major]="h % 6 === 0"
            [style.left.%]="(h / 24) * 100"
          ></span>
        }
      </div>

      <div class="band__lane">
        @for (s of slices(); track s.startMin) {
          <div
            class="band__block"
            [class.band__block--gap]="!s.session.valid"
            [class.band__block--ongoing]="s.session.end === 'ongoing'"
            [style.left.%]="(s.startMin / 1440) * 100"
            [style.width.%]="((s.endMin - s.startMin) / 1440) * 100"
            [style.--place]="color(s.place)"
          >
            @if (hero() && s.endMin - s.startMin > 60) {
              <span class="band__block-label">{{ label(s.place) }}</span>
            }
          </div>
        }
      </div>

      @if (hero()) {
        <div class="band__labels" aria-hidden="true">
          @for (h of labelHours; track h) {
            <span [style.left.%]="(h / 24) * 100">{{ pad(h) }}</span>
          }
        </div>
      }

      @if (nowPct() !== null) {
        <div class="band__now" [style.left.%]="nowPct()">
          @if (hero()) {
            <span class="band__now-chip">{{ nowChip() }}</span>
          }
        </div>
      }

      @if (hero() && probeMin() !== null) {
        <div class="band__probe" [style.left.%]="(probeMin()! / 1440) * 100"></div>
        <div class="band__readout" [style.left.%]="readoutPct()">{{ readout() }}</div>
      }
    </div>
  `,
})
export class DayBand {
  readonly slices = input.required<DaySlice[]>();
  readonly dayMs = input.required<number>();
  readonly nowMs = input.required<number>();
  readonly hero = input(false);

  protected readonly hours = Array.from({ length: 25 }, (_, i) => i);
  protected readonly labelHours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  protected readonly probeMin = signal<number | null>(null);

  protected readonly nowMin = computed(() => (this.nowMs() - this.dayMs()) / 60_000);
  protected readonly nowPct = computed(() => {
    const m = this.nowMin();
    return m >= 0 && m <= 1440 ? (m / 1440) * 100 : null;
  });
  protected nowChip(): string {
    return fmtClock(this.nowMs());
  }

  protected color(place: string): string {
    return placeMeta(place).color;
  }
  protected label(place: string): string {
    return placeMeta(place).label;
  }
  protected pad(h: number): string {
    return String(h % 24).padStart(2, '0');
  }

  protected probe(e: PointerEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    this.probeMin.set(frac * 1440);
  }

  protected readoutPct(): number {
    return Math.min(88, Math.max(12, (this.probeMin()! / 1440) * 100));
  }

  protected readout(): string {
    const min = this.probeMin()!;
    const clock = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(
      Math.floor(min % 60),
    ).padStart(2, '0')}`;
    if (min > this.nowMin()) return `${clock} — not yet`;
    const hit = this.slices().find((s) => min >= s.startMin && min < s.endMin);
    if (!hit) return `${clock} — unaccounted`;
    if (!hit.session.valid) return `${clock} — a gap in the record`;
    const since = fmtClock(hit.session.startMs);
    const at = placeMeta(hit.place).phrase;
    return hit.session.end === 'ongoing'
      ? `${clock} — ${at} since ${since}, still there`
      : `${clock} — ${at} since ${since}`;
  }
}
