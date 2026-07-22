import { Routes } from '@angular/router';
import { StaticPage } from './static-page';

/** Routes exist solely to let Angular prerender the localized static documents. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: StaticPage },
  { path: 'pl', pathMatch: 'full', component: StaticPage },
  { path: 'en', pathMatch: 'full', component: StaticPage },
];
