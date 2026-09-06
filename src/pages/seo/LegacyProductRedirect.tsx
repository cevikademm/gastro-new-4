/**
 * /product/{id} → /produkt/{slug} — istemci içi geçişler için (sunucu tarafında
 * api/render.ts aynı eşlemeyi 301 ile yapar).
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function LegacyProductRedirect() {
  const { pathname } = useLocation();
  const id = decodeURIComponent(pathname.replace(/^\/(?:[a-z]{2}\/)?product\//, ''));
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase || !id) { if (alive) setTarget('/produkte'); return; }
      const { data } = await supabase.from('product_seo').select('slug').or(`source_id.eq.${id},sku.eq.${id}`).limit(1).maybeSingle();
      if (alive) setTarget(data?.slug ? `/produkt/${data.slug}` : '/produkte');
    })();
    return () => { alive = false; };
  }, [id]);

  if (!target) return null;
  return <Navigate to={target} replace />;
}
