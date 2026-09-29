# Thailand Jastip Management System

Private admin dashboard for managing a Thailand → Indonesia jastip (personal-shopper) business: customers, orders, pricing, invoices, and WhatsApp message generation.

**Stack:** React + TypeScript + Vite + Tailwind CSS + Supabase (Postgres/Auth/RLS), deployed on Netlify.

---

## 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project
- A [Netlify](https://netlify.com) account (for deployment)

## 2. Set up Supabase

1. Create a new Supabase project.
2. Open **SQL Editor** → **New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
   This creates all tables (`customers`, `orders`, `order_items`, `delivery_zones`, `settings`), indexes, Row Level Security policies, and seeds the three default delivery zones.
3. Create your admin login: go to **Authentication → Users → Add user**, enter an email and password. This is the only account that can access the dashboard (customers never get accounts).
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

   Never use the `service_role` key in the frontend.

## 3. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Install & run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 and log in with the admin account you created in step 2.3.

On first login, the app automatically creates the default `settings` row (Base Rate 480, Margin 4%, Nearest Rp10 rounding) and seeds delivery zones if none exist yet.

## 5. Build

```bash
npm run build
```

Output goes to `dist/`.

## 6. Deploy to Netlify

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- Add the same two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Netlify's **Site settings → Environment variables**.
- `netlify.toml` and `public/_redirects` are already included so client-side routing (React Router) works correctly after deployment.

You can deploy via the Netlify CLI (`netlify deploy --prod`) or by connecting the project's Git repository in the Netlify dashboard.

---

## How pricing works

- **Exchange rate:** `appliedRate = baseRate × (1 + margin / 100)`, then rounded per the configured rounding rule (default: nearest Rp10). Editable in **Settings → Currency**, with a live preview.
- **Jastip fee:** tiered by the item's price in IDR (`priceIDR = priceTHB × appliedRate`), per item:
  - `< Rp50.000` → Rp10.000/item
  - `Rp50.000 – < Rp100.000` → Rp15.000/item
  - `Rp100.000 – < Rp300.000` → Rp25.000/item
  - `Rp300.000 – < Rp500.000` → Rp35.000/item
  - `>= Rp500.000` → 8% of item price (no cap)
  All editable in **Settings → Jastip Fee**.
- **Delivery fee:** each order has a delivery method — **Kurir** (fee from the zones in **Settings → Delivery**, overridable per order), or **Grab / Gojek / Shopee Instant** (fee typed in manually per order).
- **Payment (DP / FP):** every order tracks payment type, status (Belum Bayar → DP / Belum Lunas → Lunas, or Refunded), paid and remaining amount. Payments are recorded in the `payments` table via **Order Detail → Add Payment**; the order's paid/remaining/status are always derived from that history.
- **Purchase flow:** payment status and purchase status are separate. A fully paid order that is not purchased yet shows up under **Orders → Ready to Purchase**, where **Mark as Purchased** stores `purchase_status` and `purchased_at` without touching any amounts.
- **Customer order form:** **Orders → Customer Form** copies an editable text template (Settings → Customer Form) you can send to customers; it is text only, not automated.
- **Pricing snapshot:** every order stores the exact base rate, margin, applied rate, rounding rule, and fee configuration used at creation time. Changing Settings later never changes existing orders — only new orders (or duplicated orders, which are explicitly re-priced) use the latest settings.

All of this logic lives in `src/utils/pricing.ts`, `src/utils/delivery.ts`, `src/utils/currency.ts` so it's calculated identically in the Calculator, Create Order, and Order Detail.

## WhatsApp messages

Order Detail → **WhatsApp Message** opens a modal with the generated text (built from the editable template in **Settings → WhatsApp Template** using `{{variables}}`) and a **Copy Message** button. The app never sends messages automatically — you open WhatsApp yourself and paste.

## Printing invoices

Order Detail → **View Invoice** (or **Print Invoice**) opens `/invoices/:id`, which renders a clean, printable invoice. The **Print Invoice** button calls the browser's print dialog; a dedicated print stylesheet (`src/index.css`) hides the sidebar/navbar/buttons so only the invoice prints — use "Save as PDF" in the print dialog to export a PDF.

## Project structure

```
src/
├── components/     # Shared UI (Card, Button, Modal, Toast, InvoiceView, WhatsAppModal...)
├── pages/          # One file per route
├── layouts/        # DashboardLayout (sidebar + mobile drawer)
├── hooks/          # useAuth
├── services/       # Supabase CRUD per table (customers, orders, deliveryZones, settings)
├── utils/          # pricing.ts, delivery.ts, currency.ts, whatsapp.ts, invoice.ts
├── types/          # database.ts (mirrors the SQL schema) + app-level types
└── App.tsx         # Routes
supabase/
└── schema.sql      # Full schema + RLS, copy-paste into the Supabase SQL editor
```
