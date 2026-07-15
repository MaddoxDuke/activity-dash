import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/** Adds .in once the element scrolls into view; inert under reduced motion. */
@Directive({ selector: '[reveal]' })
export class Reveal implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private io: IntersectionObserver | null = null;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.classList.add('in');
      return;
    }
    node.classList.add('reveal');
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            node.classList.add('in');
            this.io?.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    this.io.observe(node);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
  }
}
