-- 048_gastro_tables_owner_rls.sql
-- Müşteri çalışma alanı tablolarını SAHİBİNE kilitler.
--
-- SORUN: 016 ve 025, gastro_* tablolarını `FOR ALL USING (true) WITH CHECK
-- (true)` ile açmıştı. Uygulamanın anon anahtarı JS paketinde YAYINLANDIĞI
-- için bu, isteyen herkesin — giriş yapmadan, tarayıcı konsolundan tek REST
-- çağrısıyla — HER müşterinin mutfak çizimini, projesini, sepetini ve
-- taslağını OKUYUP DEĞİŞTİREBİLMESİ demekti. Denetimde `gastro_design_projects`
-- ve `gastro_projects` anonim olarak okunabilir bulundu.
--
-- ÇÖZÜM: Yalnız `authenticated` rolüne, yalnız kendi satırı için izin.
-- Yönetici (public.is_admin(), 008) destek amacıyla hepsini görür.
-- `anon` için politika YOKTUR → RLS varsayılanı reddeder.
--
-- REGRESYON RİSKİ YOK: İstemci (gastroSync.ts / gastroDesignSync.ts) anonim
-- kullanıcıda bu tablolara zaten HİÇ istek atmıyor (uid === 'anonymous' ise
-- erken return; çizim yalnız localStorage'da yaşıyor). Yani kapatılan yol
-- uygulamanın kullandığı bir yol değil, yalnız saldırı yüzeyi.
--
-- MİRAS SATIRLAR: user_id = 'anonymous' olan eski satırlar (ziyaretçilerin
-- ortak kullandığı kayıtlar) artık yalnız yöneticiye görünür. Bunlar sahipsiz
-- ve karışık veri olduğundan bilinçli olarak SİLİNMİYOR, sadece gizleniyor.
--
-- NOT: user_id kolonu TEXT'tir (uuid değil) → auth.uid()::text ile kıyaslanır.
-- Ön koşul: public.is_admin() (008). Idempotent'tir.

do $$
declare
  t text;
begin
  foreach t in array array[
    'gastro_design_projects',
    'gastro_projects',
    'gastro_activities',
    'gastro_floor_plans',
    'gastro_cart',
    'gastro_user_prefs',
    'gastro_sketches'
  ]
  loop
    -- Tablo bu ortamda yoksa atla (migration'lar ortamlar arası farklı olabilir).
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- Eski "herkese açık" politikaları kaldır.
    execute format('drop policy if exists %I on public.%I', 'Allow all for ' || t, t);
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);

    -- Sahibi veya yönetici; anon'a politika verilmez.
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (user_id = auth.uid()::text or public.is_admin())
        with check (user_id = auth.uid()::text or public.is_admin())
    $f$, t || '_owner', t);
  end loop;
end $$;

-- anon rolünün tablo düzeyindeki geniş yetkisini de geri al (RLS zaten
-- engelliyor; bu ikinci savunma hattı).
do $$
declare
  t text;
begin
  foreach t in array array[
    'gastro_design_projects','gastro_projects','gastro_activities',
    'gastro_floor_plans','gastro_cart','gastro_user_prefs','gastro_sketches'
  ]
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
