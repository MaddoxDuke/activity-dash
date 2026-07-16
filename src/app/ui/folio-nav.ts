import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '../store';

/** The almanac's table of contents — one entry per page, kept tiny. */
@Component({
  selector: 'app-folio-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="folio-nav" aria-label="Almanac pages">
      <a
        [routerLink]="['/']"
        [queryParams]="qp"
        routerLinkActive="folio-nav__link--here"
        [routerLinkActiveOptions]="{ exact: true }"
        class="folio-nav__link"
        >whereabouts</a
      >
      <span class="folio-nav__sep" aria-hidden="true">·</span>
      <a
        [routerLink]="['/cutting-room']"
        [queryParams]="qp"
        routerLinkActive="folio-nav__link--here"
        class="folio-nav__link"
        >the cutting room</a
      >
    </nav>
  `,
})
export class FolioNav {
  private readonly store = inject(Store);
  /** Demo mode travels with navigation so specimen pages stay specimen. */
  protected readonly qp = this.store.demo ? { demo: 1 } : {};
}
