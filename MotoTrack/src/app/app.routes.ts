import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'loading',
    loadComponent: () =>
      import('./loading/loading.page').then((m) => m.LoadingPage),
  },
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
];
