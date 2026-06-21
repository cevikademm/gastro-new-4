import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const ALL_SCOPES = ['products:read', 'catalog:read'] as const;

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  environment: 'live' | 'sandbox';
  allowed_origins: string[];
  rate_limit_per_min: number;
  quota_monthly: number | null;
  revoked: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

type Action = 'list' | 'create' | 'revoke' | 'rotate';

async function callApi<T = unknown>(action: Action, body: Record<string, unknown> = {}): Promise<T> {
  if (!SUPABASE_URL) throw new Error('Supabase not configured');
  const { data: sess } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = sess?.session?.access_token || SUPABASE_ANON_KEY || '';
  const res = await fetch(`${SUPABASE_URL}/functions/v1/api-keys-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Request failed (${res.status})`);
  return payload.data as T;
}

export default function ApiKeysPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Newly created/rotated raw key — shown exactly once.
  const [newKey, setNewKey] = useState<{ name: string; api_key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState('');
  const [fEnv, setFEnv] = useState<'live' | 'sandbox'>('live');
  const [fScopes, setFScopes] = useState<string[]>(['products:read']);
  const [fRate, setFRate] = useState(60);
  const [fQuota, setFQuota] = useState<string>('10000');
  const [fOrigins, setFOrigins] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await callApi<ApiKey[]>('list'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <h1 className="text-2xl font-black text-on-surface">{t('developerApi.keys.loginRequiredTitle')}</h1>
        <p className="text-on-surface-variant">{t('developerApi.keys.loginRequiredDesc')}</p>
        <Link to="/login" className="inline-block mt-2 px-5 py-2.5 rounded-lg bg-brand-red text-white font-semibold">
          {t('developerApi.keys.login')}
        </Link>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!fName.trim()) {
      setError(t('developerApi.keys.errNameRequired'));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await callApi<ApiKey & { api_key: string }>('create', {
        name: fName.trim(),
        environment: fEnv,
        scopes: fScopes,
        rate_limit_per_min: fRate,
        quota_monthly: fQuota.trim() === '' ? null : Number(fQuota),
        allowed_origins: fOrigins
          .split(/[\n,]/)
          .map((o) => o.trim())
          .filter(Boolean),
      });
      setNewKey({ name: created.name, api_key: created.api_key });
      setCopied(false);
      setShowForm(false);
      setFName('');
      setFOrigins('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm(t('developerApi.keys.confirmRevoke'))) return;
    setBusyId(id);
    setError(null);
    try {
      await callApi('revoke', { id });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRotate(id: string) {
    if (!confirm(t('developerApi.keys.confirmRotate'))) return;
    setBusyId(id);
    setError(null);
    try {
      const rotated = await callApi<ApiKey & { api_key: string }>('rotate', { id });
      setNewKey({ name: rotated.name, api_key: rotated.api_key });
      setCopied(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function toggleScope(s: string) {
    setFScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface">{t('developerApi.keys.title')}</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl">{t('developerApi.keys.subtitle')}</p>
        </div>
        <Link to="/developers/api" className="text-brand-red font-semibold hover:underline whitespace-nowrap">
          {t('developerApi.keys.docsLink')}
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      {/* One-time raw key reveal */}
      {newKey && (
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-emerald-900">{t('developerApi.keys.createdTitle', { name: newKey.name })}</h2>
            <button onClick={() => setNewKey(null)} className="text-emerald-700 text-sm hover:underline">
              {t('developerApi.keys.close')}
            </button>
          </div>
          <p className="text-sm text-emerald-800">⚠️ {t('developerApi.keys.oneTimeWarning')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-sm bg-white border border-emerald-300 rounded-lg px-3 py-2 break-all">
              {newKey.api_key}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey.api_key);
                setCopied(true);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 whitespace-nowrap"
            >
              {copied ? t('developerApi.keys.copied') : t('developerApi.keys.copy')}
            </button>
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-5 py-2.5 rounded-lg bg-brand-red text-white font-semibold hover:opacity-90"
        >
          {showForm ? t('developerApi.keys.cancel') : t('developerApi.keys.newKey')}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-outline bg-surface p-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">{t('developerApi.keys.fieldName')}</span>
            <input
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder={t('developerApi.keys.fieldNamePlaceholder')}
              className="rounded-lg border border-outline px-3 py-2 bg-surface"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-on-surface">{t('developerApi.keys.fieldEnv')}</span>
            <select
              value={fEnv}
              onChange={(e) => setFEnv(e.target.value as 'live' | 'sandbox')}
              className="rounded-lg border border-outline px-3 py-2 bg-surface"
            >
              <option value="live">{t('developerApi.keys.envLive')}</option>
              <option value="sandbox">{t('developerApi.keys.envSandbox')}</option>
            </select>
          </label>

          <fieldset className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-on-surface">{t('developerApi.keys.fieldScopes')}</span>
            <div className="flex flex-wrap gap-3 pt-1">
              {ALL_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={fScopes.includes(s)} onChange={() => toggleScope(s)} />
                  <code>{s}</code>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-on-surface">{t('developerApi.keys.fieldRate')}</span>
            <input
              type="number"
              min={1}
              max={6000}
              value={fRate}
              onChange={(e) => setFRate(Number(e.target.value))}
              className="rounded-lg border border-outline px-3 py-2 bg-surface"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-on-surface">{t('developerApi.keys.fieldQuota')}</span>
            <input
              type="number"
              min={0}
              value={fQuota}
              onChange={(e) => setFQuota(e.target.value)}
              placeholder="10000"
              className="rounded-lg border border-outline px-3 py-2 bg-surface"
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-sm font-semibold text-on-surface">{t('developerApi.keys.fieldOrigins')}</span>
            <textarea
              value={fOrigins}
              onChange={(e) => setFOrigins(e.target.value)}
              rows={2}
              placeholder={t('developerApi.keys.originsPlaceholder')}
              className="rounded-lg border border-outline px-3 py-2 bg-surface font-mono text-sm"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-lg bg-brand-red text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {creating ? t('developerApi.keys.creating') : t('developerApi.keys.create')}
            </button>
          </div>
        </form>
      )}

      {/* Key list */}
      <div className="rounded-xl border border-outline overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">{t('developerApi.keys.loading')}</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">{t('developerApi.keys.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-variant text-on-surface-variant text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('developerApi.keys.colName')}</th>
                  <th className="px-4 py-3 font-semibold">{t('developerApi.keys.colKey')}</th>
                  <th className="px-4 py-3 font-semibold">{t('developerApi.keys.colEnv')}</th>
                  <th className="px-4 py-3 font-semibold">{t('developerApi.keys.colLimits')}</th>
                  <th className="px-4 py-3 font-semibold">{t('developerApi.keys.colLastUsed')}</th>
                  <th className="px-4 py-3 font-semibold">{t('developerApi.keys.colStatus')}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t('developerApi.keys.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-outline">
                    <td className="px-4 py-3 font-medium text-on-surface">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{k.key_prefix}…</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          k.environment === 'live'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {k.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {t('developerApi.keys.perMin', { n: k.rate_limit_per_min })} ·{' '}
                      {k.quota_monthly == null
                        ? t('developerApi.keys.unlimited')
                        : t('developerApi.keys.perMonth', { n: k.quota_monthly })}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatDate(k.last_used_at)}</td>
                    <td className="px-4 py-3">
                      {k.revoked ? (
                        <span className="text-red-600 font-semibold">{t('developerApi.keys.statusRevoked')}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">{t('developerApi.keys.statusActive')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!k.revoked && (
                        <>
                          <button
                            onClick={() => handleRotate(k.id)}
                            disabled={busyId === k.id}
                            className="text-brand-red hover:underline mr-3 disabled:opacity-50"
                          >
                            {t('developerApi.keys.rotate')}
                          </button>
                          <button
                            onClick={() => handleRevoke(k.id)}
                            disabled={busyId === k.id}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            {t('developerApi.keys.revoke')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
