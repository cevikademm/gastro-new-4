/** .env → process.env (yalnızca eksik anahtarlar). Node script'leri için basit dotenv. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadDotEnv(root: string): void {
  for (const name of ['.env', '.env.local']) {
    try {
      const raw = readFileSync(resolve(root, name), 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const [, k, v0] = m;
        const v = v0.replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    } catch { /* dosya yok */ }
  }
}
