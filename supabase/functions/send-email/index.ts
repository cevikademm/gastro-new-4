// send-email — Resend transactional email edge function
// ========================================================
// POST /send-email
// Body: { template: 'order-confirmation' | 'welcome' | 'order-shipped', to: string, data: object }
//
// Called from frontend (authenticated user) or from DB triggers via service role.
// Resend API key is server-side only.

import { Resend } from "https://esm.sh/resend@3.2.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM") || "2MC Gastro <noreply@2mcgastro.com>";

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type TemplateName = "order-confirmation" | "welcome" | "order-shipped" | "approval-granted" | "lead-followup" | "quote-ready" | "lead-magnet" | "cold-outreach" | "fix-deployed";

interface Payload {
  template: TemplateName;
  to: string;
  data: Record<string, unknown>;
}

// Minimal inline HTML templates. React Email + SSR is overkill inside an edge
// function — we keep these as plain HTML strings and let the brand design shine
// through CSS. For richer templates, render React Email on the client and pass
// the HTML in via `data.html`.
function render(template: TemplateName, data: Record<string, unknown>): { subject: string; html: string } {
  const brand = {
    logo: "https://ohcytmzyjvpfsqejujzs.supabase.co/storage/v1/object/public/2mcwerbung/logo4.png",
    primary: "#001f65",
    surface: "#f7f9fb",
    onSurface: "#191c1e",
    onSurfaceVariant: "#43474c",
  };

  const shell = (body: string, preview = "") => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"/><title>2MC Gastro</title></head>
<body style="margin:0;padding:0;background:${brand.surface};font-family:Inter,system-ui,sans-serif;color:${brand.onSurface}">
<div style="display:none;max-height:0;overflow:hidden">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.surface};padding:32px 16px">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0e3e5">
    <tr><td style="background:${brand.primary};padding:24px 32px">
      <img src="${brand.logo}" alt="2MC Gastro" height="32" style="display:block;height:32px"/>
    </td></tr>
    <tr><td style="padding:32px">${body}</td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid #eceef0;font-size:12px;color:${brand.onSurfaceVariant}">
      2MC Gastro · Bergisch Gladbacher Str. 172, 51063 Köln · +49 176 70295844<br/>
      Bu e-postayı almak istemiyorsanız <a href="https://2mcgastro.com/unsubscribe" style="color:${brand.primary}">aboneliği iptal edin</a>.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  switch (template) {
    // Bildirilen bir sorun düzeltilip canlıya alındığında bildirene gider.
    // Çağıran: supabase/functions/fix-agent (action:"deployed").
    // İÇERİK KURALI: commit sha, dosya adı, kişisel veri YAZILMAZ — bu metin
    // doğrudan müşteriye gidiyor.
    case "fix-deployed": {
      const name = String(data.name || "").trim();
      const summary = String(data.summary || "").trim();
      return {
        subject: "Bildirdiğiniz sorun düzeltildi · 2MC Gastro",
        html: shell(
          `<h1 style="margin:0 0 12px;font-size:22px">${name ? `Merhaba ${name},` : "Merhaba,"}</h1>
           <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
             Bize bildirdiğiniz sorun düzeltildi ve değişiklik yayına alındı.
           </p>
           <div style="margin:0 0 20px;padding:16px;background:${brand.surface};border-radius:12px;border:1px solid #e0e3e5">
             <div style="font-size:12px;font-weight:700;color:${brand.onSurfaceVariant};text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">
               Yapılan düzeltme
             </div>
             <p style="margin:0;font-size:15px;line-height:1.6">${summary}</p>
           </div>
           <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${brand.onSurfaceVariant}">
             Sorunun devam ettiğini görürseniz lütfen tekrar bildirin — kaydınızı yeniden açarız.
           </p>
           <a href="https://www.2mcgastro.de/degisiklikler"
              style="display:inline-block;background:${brand.primary};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px">
             Tüm düzeltmeleri gör
           </a>`,
          "Bildirdiğiniz sorun düzeltildi.",
        ),
      };
    }

    case "order-confirmation": {
      const orderNumber = String(data.orderNumber || "—");
      const total = String(data.total || "—");
      return {
        subject: `Siparişiniz alındı · ${orderNumber}`,
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Siparişiniz alındı</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Merhaba, <strong>${orderNumber}</strong> numaralı siparişiniz başarıyla alındı. En kısa sürede işleme alınacak.</p>
          <div style="background:#f2f4f6;border-radius:12px;padding:16px;margin:16px 0">
            <div style="font-size:12px;color:${brand.onSurfaceVariant};text-transform:uppercase;letter-spacing:0.05em">Toplam</div>
            <div style="font-size:24px;font-weight:800;color:${brand.primary}">${total}</div>
          </div>
          <a href="https://2mcgastro.com/#/orders" style="display:inline-block;background:${brand.primary};color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none">Siparişi görüntüle</a>`,
          `Siparişiniz ${orderNumber} alındı.`,
        ),
      };
    }
    case "order-shipped": {
      const orderNumber = String(data.orderNumber || "—");
      const tracking = String(data.tracking || "");
      return {
        subject: `Siparişiniz yola çıktı · ${orderNumber}`,
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Siparişiniz yola çıktı</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6"><strong>${orderNumber}</strong> numaralı siparişiniz kargoya verildi.</p>
          ${tracking ? `<div style="background:#f2f4f6;border-radius:12px;padding:16px;margin:16px 0">
            <div style="font-size:12px;color:${brand.onSurfaceVariant};text-transform:uppercase;letter-spacing:0.05em">Takip numarası</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700">${tracking}</div>
          </div>` : ""}`,
          `Sipariş ${orderNumber} yola çıktı.`,
        ),
      };
    }
    case "welcome": {
      const name = String(data.name || "Merhaba");
      return {
        subject: "2MC Gastro'ya hoş geldiniz",
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Hoş geldiniz, ${name}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Hesabınız oluşturuldu. Ekibimiz başvurunuzu inceliyor; onay sonrası e-posta ile bilgilendirileceksiniz.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Bu arada 10.000+ ekipman kataloğumuzu keşfedebilirsiniz.</p>
          <a href="https://2mcgastro.com" style="display:inline-block;background:${brand.primary};color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none">Katalogu keşfet</a>`,
          "2MC Gastro hesabınız oluşturuldu.",
        ),
      };
    }
    case "approval-granted": {
      return {
        subject: "Hesabınız onaylandı",
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Hesabınız onaylandı</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">2MC Gastro B2B hesabınız onaylandı. Artık özel fiyatlara, proje yönetimine ve teklif oluşturmaya erişebilirsiniz.</p>
          <a href="https://2mcgastro.com/#/dashboard" style="display:inline-block;background:${brand.primary};color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none">Panele git</a>`,
          "B2B hesabınız onaylandı.",
        ),
      };
    }
    case "lead-followup": {
      const source = String(data.source || "form");
      return {
        subject: "2MC Gastro — İlginiz için teşekkürler",
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Teşekkürler!</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">İletişim bilgilerinizi aldık. Satış ekibimizden birisi 24 saat içinde size özel bir teklif hazırlayıp geri dönecek.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Bu arada yapabilecekleriniz:</p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.8">
            <li><a href="https://2mcgastro.com/design" style="color:${brand.primary}">Ücretsiz 3D mutfak tasarlayın</a></li>
            <li><a href="https://2mcgastro.com/tools/kitchen-calculator" style="color:${brand.primary}">ROI hesaplayın</a></li>
            <li><a href="https://2mcgastro.com/diamond" style="color:${brand.primary}">Diamond kataloğunu inceleyin</a></li>
          </ul>
          <p style="margin:0;font-size:13px;color:${brand.onSurfaceVariant}">Kaynak: ${source}</p>`,
          "İletişim bilgilerinizi aldık; 24 saat içinde dönüş yapacağız.",
        ),
      };
    }
    case "quote-ready": {
      const projectName = String(data.projectName || "Proje");
      const pdfUrl = String(data.pdfUrl || "https://2mcgastro.com");
      return {
        subject: `Teklifiniz hazır — ${projectName}`,
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">Teklifiniz hazır</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6"><strong>${projectName}</strong> için profesyonel teklifiniz PDF olarak hazırlandı.</p>
          <a href="${pdfUrl}" style="display:inline-block;background:${brand.primary};color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none">Teklifi indir</a>
          <p style="margin:24px 0 0;font-size:14px;color:${brand.onSurfaceVariant}">Teklif 30 gün geçerlidir. Sorularınız için yanıtlayabilirsiniz.</p>`,
          `Teklifiniz hazır — ${projectName}`,
        ),
      };
    }
    case "lead-magnet": {
      const title = String(data.title || "Ücretsiz Rehber");
      const downloadUrl = String(data.downloadUrl || "https://2mcgastro.com");
      return {
        subject: `${title} — İndirme bağlantınız`,
        html: shell(
          `<h1 style="font-size:22px;font-weight:700;margin:0 0 12px">${title}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Talep ettiğiniz ücretsiz rehberi aşağıdaki bağlantıdan indirebilirsiniz:</p>
          <a href="${downloadUrl}" style="display:inline-block;background:${brand.primary};color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;text-decoration:none">PDF'i indir</a>
          <p style="margin:24px 0 0;font-size:14px;color:${brand.onSurfaceVariant}">Rehberin içeriği hakkında sorularınız için bu e-postayı yanıtlayabilirsiniz.</p>`,
          `${title} indirme bağlantınız`,
        ),
      };
    }
    case "cold-outreach": {
      // Müşteri Bulma — soğuk satış maili. Konu + gövde frontend'den gelir
      // ({{isim}} gibi placeholder'lar orada değiştirilmiş olur). bodyHtml HTML,
      // yoksa düz metin (satır sonları <br/> olur) kabul edilir.
      const subject = String(data.subject || "2MC Gastro");
      const bodyHtml = data.bodyHtml
        ? String(data.bodyHtml)
        : String(data.body || "").replace(/\n/g, "<br/>");
      return {
        subject,
        html: shell(
          `<div style="font-size:15px;line-height:1.6;color:${brand.onSurface}">${bodyHtml}</div>`,
          subject,
        ),
      };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);

  try {
    const body = (await req.json()) as Payload;
    if (!body.template || !body.to) return json({ error: "template and to are required" }, 400);

    const { subject, html } = render(body.template, body.data || {});

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: body.to,
      subject,
      html,
    });

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id: data?.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
