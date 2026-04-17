# 2MC Gastro — Uzaktan Deploy Sistemi

Bu dosya, "deploy bunu" dediğin anda projeyi canlıya (Vercel production) göndermek için hazırlanan otomasyonu anlatır.  
Sistem üç katmanlıdır:

1. **GitHub Actions workflow** — `.github/workflows/deploy.yml`
2. **Lokal script'ler** — `scripts/deploy.sh` (bash) ve `scripts/deploy.ps1` (Windows)
3. **Env dosyası** — `.env.deploy` (commit edilmez, `.env.deploy.example` şablonundan kopyalanır)

---

## 1) Bir defalık kurulum (5 dakika)

### a) Bu commit'i GitHub'a push et (SEN, kendi PC'nden)

```bash
git push origin main
```

Artık `.github/workflows/deploy.yml` repo'da.

### b) Vercel Deploy Hook oluştur (en kolay yol)

1. https://vercel.com/team_n41lqyu6orb9bwmiojqqvwes/2mc-gastro/settings/git adresine git
2. Aşağıda "Deploy Hooks" bölümünü bul
3. **Create Hook** → Name: `prod-deploy`, Branch: `main` → **Create Hook**
4. Verilen URL'i kopyala (örn. `https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy`)

### c) `.env.deploy` dosyasını oluştur

```bash
cp .env.deploy.example .env.deploy
```

Dosyayı aç, `VERCEL_DEPLOY_HOOK_URL` satırına Vercel'den aldığın URL'i yapıştır. Bu dosya **gitignore** içinde, commit edilmez.

### d) (Opsiyonel) GitHub Secrets ekle — Actions ile build/deploy için

`.github/workflows/deploy.yml` içindeki tam pipeline (npm ci, vercel pull/build/deploy) için:

1. https://github.com/AYARLA/2mc-gastro/settings/secrets/actions  (kendi repo URL'n)
2. Aşağıdaki üç secret'ı ekle:

| Secret | Değer |
|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens adresinden üret |
| `VERCEL_ORG_ID` | `team_n41lqYU6oRB9bwmiOJqQVWeS` |
| `VERCEL_PROJECT_ID` | `prj_hswMS3mIw5VZPJedp9azWbgBRXBm` |

> Vercel zaten GitHub'a bağlıysa `git push`'un kendisi de deploy başlatır. Bu adım sadece `workflow_dispatch` / `repository_dispatch` ile uzaktan tetiklemek içindir.

### e) (Opsiyonel) `repository_dispatch` için fine-grained PAT

Eğer GitHub üzerinden de tetikleme istersen (API üzerinden):

1. https://github.com/settings/personal-access-tokens/new → Fine-grained
2. Repository access: sadece `2mc-gastro`
3. Permissions: **Actions: Read and write**
4. Üretilen token'ı `.env.deploy` dosyasındaki `GITHUB_TOKEN` ve `GITHUB_REPO` alanlarına yaz.

---

## 2) Günlük kullanım — "deploy bunu" dendiğinde

Artık her projede **SEN (ya da Claude** — aynı klasör PC'nde mount'lu olduğundan**) şu komutlardan birini çalıştırır**:

### En kolay: Vercel Deploy Hook ile

```bash
bash scripts/deploy.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
```

Bir **POST** isteği gönderir, Vercel saniyeler içinde build başlatır. Sonucu Vercel dashboard'unda izlersin.

### Alternatif 1: Git push ile (kod değişiklikleri de gider)

```bash
bash scripts/deploy.sh --push
```

Eğer uncommitted değişiklikler varsa önce otomatik commit eder, sonra push atar. Vercel GitHub integration otomatik deploy başlatır.

### Alternatif 2: GitHub Actions'ı dispatch ile tetikle

```bash
bash scripts/deploy.sh --github
```

`repository_dispatch` POST'u atılır, `.github/workflows/deploy.yml` tetiklenir, npm ci + vercel build + vercel deploy zinciri çalışır.

### Alternatif 3: Tamamen manuel — GitHub UI'dan

GitHub → **Actions** → "Deploy to Vercel Production" → **Run workflow** → environment seç (production / preview) → Run.

---

## 3) Peki Claude'a uzaktan "deploy bunu" dediğimde nasıl çalışıyor?

Bu klasör (`/sessions/lucid-dreamy-cerf/mnt/2mc gastro new`) aslında **senin PC'nde fiziksel bir klasör**. Cowork sandbox'ı sadece onu mount etti. Yani:

- Claude `bash scripts/deploy.sh` komutunu çalıştırdığında, `curl` çağrısı **senin makinendeki shell'den** gitmiyor; sandbox'tan gidiyor.
- Sandbox `api.vercel.com` ve `api.github.com` adreslerini blokluyor, bu nedenle **Claude'un sandbox'ından** deploy hook veya dispatch tetikleyemeyiz.
- **Ama** senin lokal makinene kurulum (a→c adımları) yapıldığında, sen PC'nde tek bir komutla tetikleyebilirsin.

Pratik gerçek: "deploy bunu" dediğinde en hızlı yol:
1. **Sen** PC'de terminal aç, proje klasörüne gir, `bash scripts/deploy.sh` çalıştır.  
2. Windows ise: `powershell -File scripts/deploy.ps1`

Tek komut. Saniyeler içinde Vercel build başlar.

### Eğer Claude'un otonom tetiklemesi gerekliyse

İki yol var, ikisi de **senin makinende** çalışacak bir köprü gerektirir:

**Seçenek A — Claude Desktop'ı kullan (önerilen).**  
Claude Code / Claude Desktop senin makinende çalışır, Cowork sandbox'ı değil. Orada ağ erişimi açıktır; `bash scripts/deploy.sh` gerçekten deploy tetikler.

**Seçenek B — Bir webhook servisi.**  
`cloudflared tunnel` ile makinende lokal bir HTTP endpoint aç (`POST /deploy` → `bash scripts/deploy.sh` çalıştırır). Claude'a o URL'i ver, Claude curl'leyebilir. (Güvenlik için bir paylaşımlı token ekle.) Bu daha ileri bir konfigürasyon; ihtiyacın olursa söyle, hazırlarım.

---

## 4) Dosya/komut hızlı referans

| Dosya | Rolü |
|---|---|
| `.github/workflows/deploy.yml` | push/manuel/dispatch ile Vercel'e deploy |
| `scripts/deploy.sh` | bash: hook / push / github modları |
| `scripts/deploy.ps1` | PowerShell karşılığı |
| `.env.deploy.example` | şablon (commit'lenir) |
| `.env.deploy` | gerçek değerler (commit edilmez) |
| `.gitignore` | `.env*` hariç `.env.example` ve `.env.deploy.example` |

| Komut | Ne yapar |
|---|---|
| `bash scripts/deploy.sh` | Vercel Deploy Hook'u POST'lar (en hızlı) |
| `bash scripts/deploy.sh --push` | değişiklikleri commit'le + push'la |
| `bash scripts/deploy.sh --github` | GitHub Actions'ı repository_dispatch ile tetikle |
| `powershell -File scripts/deploy.ps1 -Mode hook\|push\|github` | Windows karşılığı |

---

## 5) Sorun giderme

- **"VERCEL_DEPLOY_HOOK_URL tanımlı değil"** → `.env.deploy` oluşturmadın. Adım 1c'ye dön.
- **Push başarısız / authentication** → PC'nde `git config --global credential.helper manager-core` kurulu mu? Ya da SSH anahtarı `github.com` için ekli mi?
- **GitHub Actions kırmızı** → Actions sekmesinde log'u aç. Genelde `VERCEL_TOKEN` eksik ya da eski olur.
- **Vercel deploy "failed to upload prebuilt output"** → `vercel pull` env'si yanlış. `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secret'larını kontrol et.

---

**TL;DR:** Kurulumu bir defa yap (5 dakika), sonra her "deploy bunu" anında tek komut: `bash scripts/deploy.sh`.
