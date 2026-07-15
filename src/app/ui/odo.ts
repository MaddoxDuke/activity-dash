import { Component, ElementRef, OnInit, inject, input } from '@angular/core';

/** Odometer numeral: counts up once on first paint, then just displays. */
@Component({
  selector: 'odo',
  template: '{{ shown }}',
})
export class Odo implements OnInit {
  readonly value = input.required<number>();
  readonly suffix = input('');
  protected shown = '';
  private el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    const target = this.value();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.shown = this.fmt(target);
      return;
    }
    const t0 = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      this.shown = this.fmt(Math.round(target * eased));
      this.el.nativeElement.textContent = this.shown;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private fmt(n: number): string {
    return n.toLocaleString('en-US') + this.suffix();
  }
}
