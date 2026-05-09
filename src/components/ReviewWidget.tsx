import type React from 'react';
import { useEffect, useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type Review = {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string;
  verified_purchase: boolean;
  created_at: string;
};

type Props = {
  productId: string;
};

export default function ReviewWidget({ productId }: Props) {
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (active) {
        setReviews((data as Review[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError('Yorum yapmak için giriş yapmalısınız.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Geçerli bir puan seçin.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          rating,
          title: title.trim() || null,
          body: body.trim() || null,
          author_name: user.email?.split('@')[0] || 'Kullanıcı',
          user_id: user.id,
        })
        .select()
        .single();
      if (dbErr) throw dbErr;
      if (data) setReviews((prev) => [data as Review, ...prev]);
      setShowForm(false);
      setTitle('');
      setBody('');
      setRating(5);
    } catch (err: any) {
      setError(err?.message || 'Yorum kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-12 pt-8 border-t border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Müşteri Yorumları</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-600">
                {avg.toFixed(1)} · {reviews.length} yorum
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-[#DC2626] text-white rounded-lg text-sm font-bold hover:bg-[#991B1B] transition"
        >
          {showForm ? 'İptal' : 'Yorum Yaz'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-5 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Puanınız</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  aria-label={`${i} yıldız`}
                >
                  <Star
                    size={28}
                    className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'}
                  />
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık (opsiyonel)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#DC2626]"
            maxLength={100}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Deneyiminizi paylaşın…"
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#DC2626] resize-none"
            maxLength={1000}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#DC2626] text-white rounded-lg font-bold hover:bg-[#991B1B] disabled:opacity-50 transition"
          >
            {submitting ? 'Gönderiliyor…' : 'Yorumu Gönder'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Yorumlar yükleniyor…</div>
      ) : reviews.length === 0 ? (
        <div className="text-slate-500 text-sm">Henüz yorum yok. İlk yorumu siz yazın!</div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="p-5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-900">{r.author_name}</span>
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={12} />
                    Doğrulanmış Alıcı
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  {new Date(r.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
              {r.title && <div className="font-semibold text-slate-900 mb-1">{r.title}</div>}
              {r.body && <p className="text-sm text-slate-700">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
