import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

/** Folio I — recent uploads as the marquee ledger, with view velocity. */
@Component({
  selector: 'app-now-showing',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">I</span>
        <h2 class="folio__title">Now Showing</h2>
        <span class="folio__note">recent releases, newest first — velocity is views gained since yesterday's count</span>
      </header>

      @if (rows().length) {
        <table class="ledger showings">
          <thead>
            <tr>
              <th scope="col">released</th>
              <th scope="col">picture</th>
              <th scope="col" class="showings__num">views</th>
              <th scope="col" class="showings__num">velocity</th>
              <th scope="col" class="showings__num">likes</th>
              <th scope="col" class="showings__num">comments</th>
            </tr>
          </thead>
          <tbody>
            @for (v of rows(); track v.videoId) {
              <tr>
                <td class="ledger__when">{{ v.released }}</td>
                <td class="showings__title">{{ v.title }}</td>
                <td class="showings__num">{{ v.viewsLabel }}</td>
                <td class="showings__num showings__velocity">{{ v.velocity }}</td>
                <td class="showings__num">{{ v.likesLabel }}</td>
                <td class="showings__num">{{ v.commentsLabel }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p class="folio__empty">no pictures on the marquee yet — the first snapshot hangs the titles</p>
      }
    </section>
  `,
})
export class NowShowing {
  protected readonly store = inject(Store);

  protected readonly rows = computed(() =>
    this.store.showings().map((v) => ({
      videoId: v.videoId,
      title: v.title,
      released: new Date(v.publishedAt)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        .toLowerCase(),
      viewsLabel: fmtCount(v.views),
      velocity: v.viewsDelta === null ? '—' : v.viewsDelta > 0 ? `+${fmtCount(v.viewsDelta)}/d` : '0/d',
      likesLabel: fmtCount(v.likes),
      commentsLabel: fmtCount(v.comments),
    })),
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
