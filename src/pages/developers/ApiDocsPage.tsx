import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SWAGGER_VERSION = '5.17.14';
const SWAGGER_CSS = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
const SWAGGER_JS = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;

const SPEC_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/api-gateway/v1/openapi.json` : '';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Yüklenemedi: ${src}`));
    document.head.appendChild(s);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

export default function ApiDocsPage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!SPEC_URL) {
      setError(t('developerApi.docs.errNotConfigured'));
      return;
    }
    loadCss(SWAGGER_CSS);
    loadScript(SWAGGER_JS)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        // deno-lint-ignore no-explicit-any
        const SwaggerUIBundle = (window as any).SwaggerUIBundle;
        if (!SwaggerUIBundle) {
          setError(t('developerApi.docs.errSwagger'));
          return;
        }
        SwaggerUIBundle({
          url: SPEC_URL,
          domNode: containerRef.current,
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout',
        });
      })
      .catch((e) => setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-on-surface">{t('developerApi.docs.title')}</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl">{t('developerApi.docs.subtitle')}</p>
        <a href="/account/api-keys" className="inline-block mt-3 text-brand-red font-semibold hover:underline">
          {t('developerApi.docs.backToKeys')}
        </a>
      </header>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div ref={containerRef} className="bg-white rounded-xl border border-outline overflow-hidden" />
    </div>
  );
}
