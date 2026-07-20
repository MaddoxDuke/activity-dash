import { Component, DestroyRef, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Odometer numeral. Counts up once on first paint, then snaps to any later
 * value change (the slate count moves when ideas are starred). The target
 * text is always written synchronously first, so hidden tabs — where
 * requestAnimationFrame never fires — still show the right number.
 */
@Component({
  selector: 'odo',
  template: '',
})
export class Odo {
  readonly value = input.required<number>();
  readonly suffix = input('');
  private el = inject(ElementRef<HTMLElement>);
  private raf = 0;
  private settled = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));

    effect(() => {
      const target = this.value();
      const suffix = this.suffix();
      const fmt = (n: number) => n.toLocaleString('en-US') + suffix;

      cancelAnimationFrame(this.raf);
      this.el.nativeElement.textContent = fmt(target);

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.settled || reduced) {
        this.settled = true;
        return;
      }
      this.settled = true;

      const t0 = performance.now();
      const dur = 900;
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        this.el.nativeElement.textContent = fmt(Math.round(target * eased));
        if (p < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    });
  }
}
