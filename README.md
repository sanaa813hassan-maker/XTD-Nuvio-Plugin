# XTD — Nuvio Plugin 🎬

مصدر **XTD** لتطبيق Nuvio — أفلام ومسلسلات وأنمي بروابط **MP4 مباشرة** (بدون تورنت) مع **ترجمات عربي SRT** و**دبلجات عربية** عند التوفر.

يعتمد على كتالوج `videodownloader.site` (aoneroom API) — نفس محرك موقعك [x-td.vercel.app](https://x-td.vercel.app).

## 📥 طريقة التركيب في Nuvio

1. افتح Nuvio → **الإعدادات** → **المحتوى والاستكشاف** → **Plugins**
2. اضغط **Add Repository**
3. الصق هذا الرابط:

```
https://raw.githubusercontent.com/sanaa813hassan-maker/XTD-Nuvio-Plugin/main/manifest.json
```

4. فعّل الـ plugin اسمه **XTD**
5. افتح أي فيلم أو مسلسل → هتلاقي مصادر **XTD** بجودات متعددة + ترجمات عربي

## ✨ المميزات

- روابط MP4 مباشرة تشتغل على الموبايل بدون Debrid ولا تورنت
- جودات متعددة (360p حتى 1080p حسب المتوفر)
- ترجمة عربي + إنجليزي تظهر تلقائياً في المشغل
- **كل نسخ الصوت تظهر كمصادر منفصلة**: Arabic dub (مدبلج) 🥇 ثم Arabic sub (hardsub — الترجمة داخل الفيديو) ثم Original Audio ثم باقي الدبلجات (French, Hindi, Russian, Spanish, ptbr...)
- جودات متعددة لكل نسخة (360p حتى 1080p حسب المتوفر)
- بدون إعلانات ولا popups

## ⚙️ إعدادات (اختياري)

من إعدادات الـ plugin داخل Nuvio:

| الإعداد | الشرح |
|---|---|
| **Use CDN relay** | فعّله فقط لو فشل فتح الفيديو مباشرة (يمرر الفيديو عبر `xt-cdn-relay.fly.dev` الذي يحاكي TLS كروم) |
| **Relay URL** | عنوان relay بديل لو عندك سيرفر خاص |

## 🔧 كيف يعمل

```
Nuvio → XTD provider
  → TMDB (اسم الفيلم + السنة)
  → aoneroom catalog API (بحث + مطابقة)
  → subject/play (روابط MP4 موقّعة)
  → subject/caption (ترجمات SRT)
  → Nuvio player (MP4 + SRT)
```

## 🧪 الاختبار

`test-provider.js` يحاكي بيئة Nuvio (fetch + atob فقط) ويختبر فيلم + مسلسل حقيقيين:

```bash
node test-provider.js
```

---

⚠️ **ملاحظة أمنية**: لو شاركت الـ GitHub token الخاص بك في مكان عام، قم بـ revoke فوراً من GitHub → Settings → Developer settings → Tokens.
