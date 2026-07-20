import { Component, computed, inject } from '@angular/core';
import { Store } from '../store';
import { Reveal } from './reveal';

interface TradeRow {
  key: number;
  label: string;
  shop: number;
  editing: number;
  shopPct: number;
  editPct: number;
}

/**
 * Folio III — the trade. The almanac's founding question: how does shop
 * time trade against editing time? Weekly two-sided ledger from a center
 * spine — brass to the left for the shop, viridian to the right for
 * editing.
 */
@Component({
  selector: 'app-trade',
  imports: [Reveal],
  template: `
    <section class="folio" reveal>
      <header class="folio__head">
        <span class="folio__numeral">III</span>
        <h2 class="folio__title">The Trade</h2>
        <span class="folio__note">shop hours against editing hours, week by week</span>
      </header>

      @if (hasAny()) {
        <div class="trade">
          <div class="trade__legend">
            <span><i class="tickmark" style="--place: var(--ink-shop)"></i>the shop</span>
            <span class="trade__legend-right"
              >editing<i class="tickmark trade__tick-right" style="--place: var(--ink-edit)"></i
            ></span>
          </div>
          @for (r of rows(); track r.key) {
            <div class="trade__week" [title]="title(r)">
              <span class="trade__hours trade__hours--shop">
                {{ r.shop ? fmt(r.shop) : '' }}
              </span>
              <span class="trade__bar trade__bar--shop">
                <i [style.width.%]="r.shopPct"></i>
              </span>
              <span class="trade__label">{{ r.label }}</span>
              <span class="trade__bar trade__bar--edit">
                <i [style.width.%]="r.editPct"></i>
              </span>
              <span class="trade__hours trade__hours--edit">
                {{ r.editing ? fmt(r.editing) : '' }}
              </span>
            </div>
          }
          <p class="folio__aside">{{ verdict() }}</p>
        </div>
      } @else {
        <p class="folio__empty">
          neither shop nor editing has hours on the books yet — the trade opens with the first week
          of data
        </p>
      }
    </section>
  `,
})
export class Trade {
  protected readonly store = inject(Store);

  protected readonly rows = computed<TradeRow[]>(() => {
    const weeks = this.store.tradeWeeks();
    const max = Math.max(...weeks.map((w) => Math.max(w.shop, w.editing)), 1);
    return weeks.map((w) => ({
      key: w.mondayMs,
      label: w.label,
      shop: w.shop,
      editing: w.editing,
      shopPct: (w.shop / max) * 100,
      editPct: (w.editing / max) * 100,
    }));
  });

  protected readonly hasAny = computed(() =>
    this.store.tradeWeeks().some((w) => w.shop > 0 || w.editing > 0),
  );

  protected readonly verdict = computed(() => {
    const last4 = this.store.tradeWeeks().slice(-4);
    const shop = last4.reduce((h, w) => h + w.shop, 0);
    const edit = last4.reduce((h, w) => h + w.editing, 0);
    if (shop === 0 && edit === 0) return 'a quiet month in both columns.';
    const s = Math.round(shop);
    const e = Math.round(edit);
    if (Math.abs(shop - edit) < 1) return `an even month — ${s}h against ${e}h.`;
    return shop > edit
      ? `the shop is winning the month, ${s}h to ${e}h.`
      : `editing is winning the month, ${e}h to ${s}h.`;
  });

  protected fmt(h: number): string {
    return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  }

  protected title(r: TradeRow): string {
    return `week of ${r.label} — shop ${this.fmt(r.shop)}, editing ${this.fmt(r.editing)}`;
  }
}
