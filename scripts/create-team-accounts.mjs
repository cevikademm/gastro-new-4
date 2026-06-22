// create-team-accounts.mjs — kurumsal ekip için Supabase giriş hesapları açar
// ============================================================================
// Servis anahtarıyla auth kullanıcısı oluşturur (email_confirm=true), ardından
// profiles satırını approved=true + rol ile günceller. İdempotent: hesap zaten
// varsa şifresini sıfırlar ve profilini düzeltir.
//
// Çalıştırma:  node scripts/create-team-accounts.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// --- .env oku (bağımlılıksız) ---
const env = {};
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('HATA: .env içinde SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- güçlü, okunabilir geçici şifre ---
function genPass() {
  const base = randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  return base.slice(0, 12) + 'A9!'; // harf + rakam + sembol garantisi
}

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const u = data.users.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 1000) return null;
    page++;
  }
}

const ACCOUNTS = [
  { email: 'mete@2mcgastro.de', role: 'admin', full_name: 'Mete' },
  { email: 'fatih@2mcgastro.de', role: 'admin', full_name: 'Fatih' },
  { email: 'info@2mcgastro.de', role: 'b2b', full_name: '2MC Gastro' },
];

const results = [];
for (const acc of ACCOUNTS) {
  const password = genPass();
  let userId = null;
  let note = 'oluşturuldu';

  const created = await supabase.auth.admin.createUser({
    email: acc.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: acc.full_name },
  });

  if (created.error) {
    const existing = await findUserByEmail(acc.email);
    if (!existing) {
      results.push({ email: acc.email, ok: false, msg: created.error.message });
      continue;
    }
    userId = existing.id;
    note = 'zaten vardı → şifre sıfırlandı';
    const upd = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (upd.error) {
      results.push({ email: acc.email, ok: false, msg: 'şifre güncellenemedi: ' + upd.error.message });
      continue;
    }
  } else {
    userId = created.data.user.id;
  }

  const { error: pErr } = await supabase.from('profiles').upsert({
    id: userId,
    approved: true,
    role: acc.role,
    email: acc.email,
    full_name: acc.full_name,
  });
  if (pErr) {
    results.push({ email: acc.email, ok: false, msg: 'profil güncellenemedi: ' + pErr.message });
    continue;
  }

  results.push({ email: acc.email, ok: true, role: acc.role, password, note });
}

console.log('\n========== SONUÇ ==========');
for (const r of results) {
  if (r.ok) {
    console.log(`✓ ${r.email.padEnd(24)} | rol=${r.role.padEnd(5)} | şifre: ${r.password}  (${r.note})`);
  } else {
    console.log(`✗ ${r.email.padEnd(24)} | HATA: ${r.msg}`);
  }
}
console.log('===========================\n');
