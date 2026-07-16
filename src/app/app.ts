import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from './store';
import { Gate } from './ui/gate';

@Component({
  selector: 'app-root',
  imports: [Gate, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(Store);
}
