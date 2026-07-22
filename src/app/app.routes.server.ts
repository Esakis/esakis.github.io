import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'pl',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'en',
    renderMode: RenderMode.Prerender,
  },
];
