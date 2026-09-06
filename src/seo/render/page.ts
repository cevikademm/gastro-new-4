/**
 * page.ts — URL → tam HTML yanıt (api/render.ts + prerender ortak giriş noktası).
 */
import { matchSeoRoute } from '../routes';
import { buildModel } from '../model/pages';
import { injectIntoShell } from './shell';
import type { PageModel } from '../types';

export interface RenderResult {
  status: number;
  html: string;
  redirectTo?: string;
  headers: Record<string, string>;
  model: PageModel;
}

export async function renderPage(url: string, shell: string): Promise<RenderResult> {
  const route = matchSeoRoute(url);
  const model = await buildModel(route);
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Robots-Tag': /noindex/.test(model.robots) ? 'noindex' : 'all',
    Vary: 'Accept-Encoding',
  };
  if (model.status === 301 || model.status === 308) {
    headers.Location = model.redirectTo || '/';
    headers['Cache-Control'] = 'public, s-maxage=86400, max-age=3600';
    return { status: model.status, html: '', redirectTo: model.redirectTo, headers, model };
  }
  headers['Cache-Control'] = model.cacheSeconds > 0
    ? `public, s-maxage=${model.cacheSeconds}, stale-while-revalidate=86400, max-age=0`
    : 'private, no-cache';
  return { status: model.status, html: injectIntoShell(shell, model), headers, model };
}
