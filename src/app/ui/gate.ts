import { Component, inject, signal } from '@angular/core';
import { Store } from '../store';

@Component({
  selector: 'app-gate',
  template: `
    <div class="gate">
      <div class="gate__inner">
        <svg class="gate__mark" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="1.5" />
          <circle cx="32" cy="32" r="2.5" fill="currentColor" />
          @for (t of ticks; track t) {
            <line
              [attr.x1]="32 + 22 * cos(t)" [attr.y1]="32 + 22 * sin(t)"
              [attr.x2]="32 + 26 * cos(t)" [attr.y2]="32 + 26 * sin(t)"
              stroke="currentColor" stroke-width="1.5"
            />
          }
          <line class="gate__needle" x1="32" y1="32" x2="32" y2="10"
            stroke="currentColor" stroke-width="1.5" />
        </svg>

        <h1 class="gate__word">Whereabouts</h1>
        <p class="gate__line">This almanac is private. Present the operator key.</p>

        <form class="gate__form" (submit)="submit($event)">
          <input
            class="gate__key"
            [class.gate__key--refused]="shake()"
            type="password"
            name="key"
            placeholder="operator key"
            autocomplete="off"
            spellcheck="false"
            [disabled]="store.state() === 'checking'"
            #keyInput
          />
          <button class="gate__unlock" type="submit" [disabled]="store.state() === 'checking'">
            {{ store.state() === 'checking' ? 'consulting…' : 'unlock' }}
          </button>
        </form>

        @if (store.gateError()) {
          <p class="gate__error" role="alert">{{ store.gateError() }}</p>
        }

        <a class="gate__specimen" href="?demo=1">…or leaf through specimen pages</a>
      </div>
    </div>
  `,
})
export class Gate {
  protected readonly store = inject(Store);
  protected readonly shake = signal(false);
  protected readonly ticks = [0, 90, 180, 270];

  protected cos(deg: number): number {
    return Math.cos((deg * Math.PI) / 180);
  }
  protected sin(deg: number): number {
    return Math.sin((deg * Math.PI) / 180);
  }

  protected async submit(e: Event): Promise<void> {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem('key') as HTMLInputElement;
    const key = input.value.trim();
    if (!key) return;
    await this.store.unlock(key);
    if (this.store.state() === 'locked') {
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), 500);
    }
  }
}
