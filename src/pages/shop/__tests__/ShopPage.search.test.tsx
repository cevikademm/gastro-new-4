import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CATEGORIES, type EquipmentItem } from '../../../stores/equipmentStore';
import { resolvedOf } from '../../../lib/categoryTaxonomy';
import ShopPage from '../ShopPage';

// ─────────────────────────────────────────────────────────────────────────────
// /magaza arama kutusunun ürün listesini GERÇEKTEN süzdüğünü doğrular.
//
// productSearch.ts'in kendi birim testleri ayrı (src/lib/__tests__); buradaki
// test UI bağlantısını kapsar: input → state → filtrelenmiş liste → grid.
// Hata bildirimi "yazdığım metne göre filtrelemiyor" diyordu, yani kırılabilecek
// yer saf arama mantığı değil, bu zincirdi.
// ─────────────────────────────────────────────────────────────────────────────

// cat alanları gerçek taksonomi id'leri (bkz. CATEGORIES) — resolvedOf regex ile
// eşleşmezse bu alana düşer, uydurma id kullanılırsa kategori butonu bulunamaz.
const FIXTURE: EquipmentItem[] = [
  mk('P1', 'Kompakt Fritteuse 8 Liter', 'Platzsparend', 'cooking', 'Fritteuse', 'COMPACT', 'DIAMOND', 1200),
  mk('P2', 'Gasherd 4 Brenner', 'Robuster Gasherd', 'cooking', 'Herd', 'ACTIVE', 'DIAMOND', 2400),
  mk('P3', 'Umluft-Kühlschrank 700 Liter', 'Belüftet', 'cooling', 'Kühlschrank', 'COOL', 'COMBISTEEL', 3100),
  mk('P4', 'Kompakt Spülmaschine', 'Korb 500x500', 'dishwash', 'Spülmaschine', 'WASH', 'HENDI', 1800),
];

function mk(
  id: string, name: string, desc: string, cat: string,
  sub: string, fam: string, brand: string, price: number,
): EquipmentItem {
  return {
    id, name, desc, cat, sub, fam, brand, price,
    img: '', l: 100, w: 100, h: '100', kw: 5, line: 'TEST',
  } as EquipmentItem;
}

// i18n: t('a.b') anahtarı aynen döndürsün — testler metne değil role/label'a bakar.
// initReactI18next korunmalı: src/i18n/index.ts onu import zincirinde kullanıyor.
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      // t(key), t(key, 'varsayılan metin') ve t(key, { count }) — üçü de çağrılıyor.
      t: (key: string, opts?: unknown) =>
        opts && typeof opts === 'object' && 'count' in opts
          ? `${key}:${(opts as { count: unknown }).count}`
          : key,
      // LanguageSelector i18n.language/changeLanguage bekliyor.
      i18n: { language: 'tr', changeLanguage: vi.fn() },
    }),
  };
});

vi.mock('../../../stores/equipmentStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../stores/equipmentStore')>();
  return {
    ...actual,
    useEquipmentStore: (selector: (s: { allItems: EquipmentItem[] }) => unknown) =>
      selector({ allItems: FIXTURE }),
  };
});

// Ürün detay çekmecesi ve karşılaştırma paneli App kökünde; testte gerekmiyor.
vi.mock('../../../stores/productDetailStore', () => ({
  useProductDetailStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ openFromItem: vi.fn() }),
}));

/** Mağaza arama kutusu (footer'daki bülten e-posta input'u ile karışmasın). */
function searchInput(): HTMLInputElement {
  return screen.getByPlaceholderText('shop.searchPlaceholder') as HTMLInputElement;
}

/** Grid'de görünen ürün adlarını toplar. */
function visibleProductNames(): string[] {
  return FIXTURE.map((p) => p.name).filter((n) => screen.queryAllByText(n).length > 0);
}

function renderShop() {
  return render(
    <MemoryRouter initialEntries={['/magaza']}>
      <ShopPage />
    </MemoryRouter>,
  );
}

describe('ShopPage — arama kutusu ürün listesini filtreler', () => {
  it('boş aramada tüm ürünler görünür', () => {
    renderShop();
    expect(visibleProductNames()).toHaveLength(FIXTURE.length);
  });

  it("'kompakt' yazınca yalnızca eşleşen ürünler listelenir", async () => {
    const user = userEvent.setup();
    renderShop();

    await user.type(searchInput(), 'kompakt');

    const visible = visibleProductNames();
    expect(visible).toContain('Kompakt Fritteuse 8 Liter');
    expect(visible).toContain('Kompakt Spülmaschine');
    expect(visible).not.toContain('Gasherd 4 Brenner');
    expect(visible).not.toContain('Umluft-Kühlschrank 700 Liter');
  });

  it('arama metni silinince tüm ürünler geri gelir', async () => {
    const user = userEvent.setup();
    renderShop();
    const input = searchInput();

    await user.type(input, 'kompakt');
    expect(visibleProductNames()).toHaveLength(2);

    await user.clear(input);
    expect(visibleProductNames()).toHaveLength(FIXTURE.length);
  });

  it('sonuçlar yazdıkça anında güncellenir (debounce/submit beklemez)', async () => {
    const user = userEvent.setup();
    renderShop();
    const input = searchInput();

    await user.type(input, 'gas');
    expect(visibleProductNames()).toEqual(['Gasherd 4 Brenner']);

    await user.type(input, 'xx'); // "gasxx" → eşleşme yok
    expect(visibleProductNames()).toHaveLength(0);
  });

  it('umlaut’suz yazım da eşleşir (kuhlschrank → Kühlschrank)', async () => {
    const user = userEvent.setup();
    renderShop();

    await user.type(searchInput(), 'kuhlschrank');
    expect(visibleProductNames()).toEqual(['Umluft-Kühlschrank 700 Liter']);
  });

  it('arama metni kategori filtresiyle birlikte çalışır', async () => {
    const user = userEvent.setup();

    // Kategori, ürün metninden taksonomiyle çözülür (resolvedOf) — sabit id
    // varsaymak yerine iki "Kompakt" ürününün gerçekten farklı kategorilere
    // düştüğünü doğrula, yoksa test bir şey kanıtlamaz.
    const fritteuseCat = resolvedOf(FIXTURE[0]).cat;
    const spulmaschineCat = resolvedOf(FIXTURE[3]).cat;
    expect(fritteuseCat).toBeTruthy();
    expect(fritteuseCat).not.toBe(spulmaschineCat);

    const catDef = CATEGORIES.find((c) => c.id === fritteuseCat);
    expect(catDef, `CATEGORIES içinde '${fritteuseCat}' yok`).toBeDefined();

    renderShop();

    // Önce arama: iki "Kompakt" ürünü kalır (farklı kategorilerde).
    await user.type(searchInput(), 'kompakt');
    expect(visibleProductNames()).toHaveLength(2);

    // Kategori daraltması arama ile BİRLİKTE uygulanmalı, aramayı sıfırlamamalı.
    await user.click(screen.getByRole('button', { name: new RegExp(catDef!.name, 'i') }));

    expect(visibleProductNames()).toEqual(['Kompakt Fritteuse 8 Liter']);
    expect(searchInput()).toHaveValue('kompakt');
    // Tüm ShopPage'i jsdom'da render edip harf harf yazmak yavaş; 5sn varsayılan dar.
  }, 20_000);

  it('Türkçe terim de süzer (fritöz → Fritteuse)', async () => {
    const user = userEvent.setup();
    renderShop();

    await user.type(searchInput(), 'fritöz');
    expect(visibleProductNames()).toEqual(['Kompakt Fritteuse 8 Liter']);
  }, 20_000);
});
