import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Save, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';

type Row = {
  id?: string;
  slug: string;
  locale: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  image: string;
  body: string;
  faq: Array<{ question: string; answer: string }>;
  reading_minutes: number;
  status: 'draft' | 'published';
  date_published: string | null;
};

const empty: Row = {
  slug: '',
  locale: 'tr',
  title: '',
  description: '',
  excerpt: '',
  category: 'Genel',
  tags: [],
  author: '2MC Gastro',
  image: '/logo-2mc-gastro.jpeg',
  body: '',
  faq: [],
  reading_minutes: 5,
  status: 'draft',
  date_published: null,
};

export default function BlogAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [keyword, setKeyword] = useState('');
  const [generating, setGenerating] = useState(false);

  async function generateBrief() {
    if (!keyword.trim() || !editing) return;
    setGenerating(true);
    setMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('content-briefer', {
        body: { keyword: keyword.trim(), locale: editing.locale },
      });
      if (error) throw error;
      const b = data.brief;
      setEditing({
        ...editing,
        title: b.title || editing.title,
        slug: b.slug || editing.slug,
        description: b.description || editing.description,
        excerpt: b.excerpt || editing.excerpt,
        category: b.category || editing.category,
        tags: b.tags || editing.tags,
        body: b.body || editing.body,
        faq: b.faqs || editing.faq,
        reading_minutes: b.reading_minutes || editing.reading_minutes,
      });
      setMsg('AI brief yüklendi — düzenleyip kaydedin.');
    } catch (e: any) {
      setMsg('AI hata: ' + (e.message || String(e)));
    } finally {
      setGenerating(false);
    }
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setRows((data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setMsg('');
    const payload = {
      ...editing,
      tags: typeof (editing.tags as any) === 'string'
        ? (editing.tags as any).split(',').map((t: string) => t.trim()).filter(Boolean)
        : editing.tags,
      date_published:
        editing.status === 'published' && !editing.date_published
          ? new Date().toISOString()
          : editing.date_published,
    };
    const { error } = editing.id
      ? await supabase.from('blog_posts').update(payload).eq('id', editing.id)
      : await supabase.from('blog_posts').insert(payload);
    if (error) { setMsg('Hata: ' + error.message); return; }
    setMsg('Kaydedildi ✓');
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Silinsin mi?')) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    load();
  }

  async function togglePublish(r: Row) {
    const next = r.status === 'published' ? 'draft' : 'published';
    await supabase.from('blog_posts').update({
      status: next,
      date_published: next === 'published' ? (r.date_published || new Date().toISOString()) : r.date_published,
    }).eq('id', r.id!);
    load();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Blog Yönetimi</h1>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B1F26] text-white rounded-lg font-semibold hover:bg-[#5A1219]"
        >
          <Plus size={18} /> Yeni Yazı
        </button>
      </div>

      {msg && <div className="mb-4 text-sm text-emerald-700">{msg}</div>}

      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 space-y-3">
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <input
              placeholder="Anahtar kelime (örn: kombi fırın seçimi)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 bg-white"
            />
            <button
              onClick={generateBrief}
              disabled={generating || !keyword.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B1F26] text-white rounded-lg font-semibold hover:bg-[#5A1219] disabled:opacity-50"
            >
              <Sparkles size={16} /> {generating ? 'Üretiliyor…' : 'AI ile Üret'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="slug (url)"
              value={editing.slug}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <select
              value={editing.locale}
              onChange={(e) => setEditing({ ...editing, locale: e.target.value })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="tr">TR</option>
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
          </div>
          <input
            placeholder="Başlık"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            placeholder="Meta description"
            value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <textarea
            placeholder="Özet (excerpt)"
            value={editing.excerpt}
            onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 h-20"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              placeholder="Kategori"
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Tags (virgülle)"
              value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value as any })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder="Okuma dk"
              value={editing.reading_minutes}
              onChange={(e) => setEditing({ ...editing, reading_minutes: Number(e.target.value) })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <input
            placeholder="Görsel URL"
            value={editing.image}
            onChange={(e) => setEditing({ ...editing, image: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <textarea
            placeholder="İçerik (markdown-lite: ## başlık, - madde)"
            value={editing.body}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 h-64 font-mono text-sm"
          />
          <div className="flex gap-3">
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
            </select>
            <button onClick={save} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold">
              <Save size={16} /> Kaydet
            </button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg">İptal</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl divide-y">
        {loading && <div className="p-6 text-slate-500">Yükleniyor…</div>}
        {!loading && rows.length === 0 && <div className="p-6 text-slate-500">Henüz yazı yok.</div>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{r.title}</div>
              <div className="text-xs text-slate-500">
                /{r.locale} · {r.slug} · {r.status}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => togglePublish(r)} className="p-2 hover:bg-slate-100 rounded" title="Yayın durumu">
                {r.status === 'published' ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={() => setEditing(r)} className="px-3 py-1 text-sm border rounded">Düzenle</button>
              <button onClick={() => remove(r.id!)} className="p-2 hover:bg-red-50 text-red-600 rounded">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
