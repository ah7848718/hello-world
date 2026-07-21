# Deployment — Cloudflare

> ⚠️ **مهم:** المشروع ده مبني على **TanStack Start (SSR)** و بيشتغل على **Cloudflare Workers** (مش Pages الستاتيك). فيه Server Functions و SSR Entry في `src/server.ts` — مينفعش يتنشر كـ static site عادي على Pages بدون الـ Worker.
>
> الأنسب: **Cloudflare Workers** (عبر `wrangler deploy`) أو **Cloudflare Pages مع Functions / Workers Integration**.

---

## 1) المتطلبات

- Node.js **>= 20** (مضبوط في `.nvmrc` / `.node-version` / `package.json#engines`)
- Bun (lockfile = `bun.lock`) أو npm
- حساب Cloudflare + Wrangler CLI

---

## 2) متغيرات البيئة (Environment Variables)

انسخ `.env.example` لـ `.env` محليًا، و على Cloudflare ضيفهم في:
**Workers & Pages → Project → Settings → Variables and Secrets**

### Client (Build-time, مدمجة في الـ bundle)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Server (Runtime, Secrets)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` ← **Secret** (متحطهاش في عام)

> أي مفتاح حساس (Service Role, API keys) يتحط كـ **Secret** مش Plain Variable.

---

## 3) النشر عبر GitHub

### الخيار (أ) — Cloudflare Workers (الموصى به للمشروع ده)

1. اربط الـ GitHub Repo بـ Cloudflare:
   **Workers & Pages → Create → Workers → Connect to Git**
2. اختار الـ repo + الـ branch (`main`).
3. إعدادات الـ Build:
   - **Build command:** `bun install && bun run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/`
4. ضيف الـ Environment Variables و الـ Secrets.
5. Deploy.

`wrangler.jsonc` موجود فعلًا و بيشاور على `src/server.ts` كـ entry.

### الخيار (ب) — Cloudflare Pages (Static fallback، لو معطّلت الـ SSR)

> ملاحظة: ده هيكسر السيرفر فنكشنز و الـ SSR. استخدمه بس لو محوّل المشروع لـ SPA كامل.

1. **Workers & Pages → Create → Pages → Connect to Git**
2. إعدادات:
   - **Framework preset:** None
   - **Build command:** `bun install && bun run build`
   - **Build output directory:** `dist` (أو `.output/public` حسب البناء)
   - **Node version:** `20` (مضبوطة من `.nvmrc`)
3. الـ `public/_redirects` بيعمل SPA fallback (`/* → /index.html 200`).
4. الـ `public/_headers` فيه security headers و cache rules.

---

## 4) ملفات الإعداد المهمة

| الملف | الغرض |
|------|------|
| `.nvmrc` / `.node-version` | يحدد Node 20 لـ CI و Cloudflare |
| `package.json#engines` | يفرض Node >= 20 |
| `.env.example` | template لكل المتغيرات المطلوبة |
| `public/_redirects` | SPA fallback لـ Pages |
| `public/_headers` | Security headers + cache control |
| `wrangler.jsonc` | إعداد Cloudflare Worker (للـ SSR) |
| `bun.lock` | الـ lockfile الوحيد (مفيش npm/yarn/pnpm) |

---

## 5) Security Headers المطبّقة (`public/_headers`)

- `X-Frame-Options: SAMEORIGIN` — يمنع clickjacking
- `X-Content-Type-Options: nosniff` — يمنع MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — يقفل camera/geolocation، يسمح للمايك بس
- `Strict-Transport-Security` — يفرض HTTPS لمدة سنة
- Cache Rules: `/assets/*`, `*.js`, `*.css`, `*.woff2` immutable لمدة سنة

---

## 6) Checklist قبل الـ Deploy

- [ ] كل المتغيرات من `.env.example` متضافة على Cloudflare
- [ ] `SUPABASE_SERVICE_ROLE_KEY` متحطّ كـ **Secret** مش Variable
- [ ] Supabase Auth → Redirect URLs فيها الـ domain النهائي
- [ ] الـ Custom Domain متربوط في Cloudflare DNS
- [ ] جربت `bun run build` محليًا و الـ build بينجح
