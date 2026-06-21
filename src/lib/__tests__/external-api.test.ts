// Unit tests for the external-API shared edge helpers. These modules are pure
// (Web Crypto + Response only, no Deno-specific imports), so they run under vitest.
import { describe, it, expect } from 'vitest';
import { sha256Hex, generateApiKey } from '../../../supabase/functions/_shared/hash.ts';
import { corsForKey } from '../../../supabase/functions/_shared/cors.ts';
import { jsonOk, jsonError } from '../../../supabase/functions/_shared/errors.ts';

describe('hash.ts', () => {
  it('sha256Hex matches the known SHA-256("abc") vector', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('sha256Hex always returns 64 hex chars', async () => {
    const h = await sha256Hex('2mc_live_anything');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateApiKey embeds the environment and exposes a non-secret prefix', () => {
    const live = generateApiKey('live');
    expect(live.raw.startsWith('2mc_live_')).toBe(true);
    expect(live.raw.startsWith(live.prefix)).toBe(true);
    expect(live.prefix.length).toBeLessThan(live.raw.length); // prefix is a truncation

    const sandbox = generateApiKey('sandbox');
    expect(sandbox.raw.startsWith('2mc_sandbox_')).toBe(true);
  });

  it('generateApiKey produces unique keys', () => {
    const a = generateApiKey('live').raw;
    const b = generateApiKey('live').raw;
    expect(a).not.toBe(b);
  });
});

describe('corsForKey — strict allowlist (never wildcard)', () => {
  it('echoes the Origin only when it is in the allowlist', () => {
    const h = corsForKey('https://partner.example.com', ['https://partner.example.com']);
    expect(h['Access-Control-Allow-Origin']).toBe('https://partner.example.com');
  });

  it('omits ACAO entirely for a non-allowlisted Origin', () => {
    const h = corsForKey('https://evil.example.com', ['https://partner.example.com']);
    expect(h['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('omits ACAO for server-to-server (no Origin) and never emits a wildcard', () => {
    const h = corsForKey(null, []);
    expect(h['Access-Control-Allow-Origin']).toBeUndefined();
    expect(Object.values(h)).not.toContain('*');
  });
});

describe('errors.ts — response envelopes', () => {
  it('jsonOk wraps payload in { data } and optional { meta }', async () => {
    const res = jsonOk([1, 2], { meta: { total: 2, limit: 20, offset: 0 } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([1, 2]);
    expect(body.meta.total).toBe(2);
  });

  it('jsonError maps codes to HTTP status and never leaks internals', async () => {
    const res = jsonError('unauthorized', 'Invalid or revoked API key');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthorized');
    expect(body.error.message).toBe('Invalid or revoked API key');
    expect(typeof body.error.request_id).toBe('string');
  });

  it('rate_limited and quota_exceeded both map to 429', async () => {
    expect(jsonError('rate_limited', 'x').status).toBe(429);
    expect(jsonError('quota_exceeded', 'x').status).toBe(429);
  });
});
