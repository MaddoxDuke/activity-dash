import { Routes } from '@angular/router';
import { AlmanacPage } from './pages/almanac';
import { BoxOfficePage } from './pages/box-office';
import { CuttingRoomPage } from './pages/cutting-room';

export const routes: Routes = [
  { path: '', component: AlmanacPage, title: 'Whereabouts' },
  { path: 'cutting-room', component: CuttingRoomPage, title: 'The Cutting Room — Whereabouts' },
  { path: 'box-office', component: BoxOfficePage, title: 'The Box Office — Whereabouts' },
  { path: '**', redirectTo: '' },
];
