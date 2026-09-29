# AGENT_GUIDE.md — Reusable E-Commerce Website Template

> **CRITICAL DIRECTIVE FOR AI AGENTS:**  
> This repository is a **GENERIC REUSABLE E-COMMERCE WEBSITE TEMPLATE**, built to launch production-grade online stores across diverse retail and physical product industries.  
> Read this entire document before editing or generating any code when provisioning a new client project from this template.

---

## 1. PROJECT IDENTITY

### What This Project Is
This repository is an enterprise-grade, turnkey **Reusable E-Commerce Website Template**. It pairs a modern Astro static-first/hybrid frontend with a robust Supabase backend, a built-in guest checkout flow, an administrative management dashboard, and an end-to-end Razorpay payment processing pipeline.

The architecture is deliberately industry-agnostic. It can be tailored for:
- Apparel & Fashion
- Home Goods, Furniture & Living
- Electronics & Everyday Carry Accessories
- Beauty, Skincare & Cosmetics
- Packaged Food, Gourmet & Beverage Goods
- Custom Fabrication, Bespoke Craft & Rapid Prototyping (e.g., 3D printing)
- Any other legitimate physical product or direct-to-consumer (D2C) brand

### Architectural Stack
- **Frontend Framework**: [Astro v7](https://astro.build/) (Static Site Generation with on-demand hybrid islands & API routes)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with Vite plugin (`@tailwindcss/vite`)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row-Level Security, Database Triggers, PL/pgSQL RPCs)
- **Authentication**: Supabase Auth (Email/Password for Admin Dashboard with role-based access control via `public.admin_users`)
- **Storage**: Supabase Storage (`product-images` public CDN bucket with restricted authenticated write policies)
- **Serverless Backend**: Supabase Edge Functions (Deno runtime) for server-side Razorpay order creation, payment HMAC verification, and webhooks
- **Payment Processing**: [Razorpay](https://razorpay.com/) (Standard Checkout Modal, Server-Side Order Generation, Signature Verification, and Webhook Reconciliation)
- **Deployment Target**: Vercel / Netlify / Node (via `@astrojs/vercel` or standard Astro adapters)

### Included Built-In Systems
1. **Catalog & Merchandising**:
   - Dynamic product showcase with flexible specifications (dimensions, weights, materials, variants/colors, badges).
   - Category navigation and hierarchical filtering.
   - Admin-controlled Hero Carousel (`hero_slides` table) supporting dynamic marketing banners.
2. **Shopping & Checkout Flow**:
   - Client-side reactive shopping cart with local persistence and stock validation.
   - Frictionless Guest Checkout requiring no mandatory customer account creation.
   - Server-side atomic order creation RPC (`create_guest_order`) enforcing authoritative database prices and preventing client tampering.
3. **Razorpay Integration Pipeline**:
   - Pre-order creation via Edge Function `create-razorpay-order`.
   - Client checkout modal invocation with auto-filled customer info.
   - Post-payment cryptographic verification via Edge Function `verify-razorpay-payment`.
   - Asynchronous payment state sync and fallback handling via Edge Function `razorpay-webhook`.
4. **Order Management & Tracking**:
   - Public customer order tracking by Order ID + Phone Number verification (`get_guest_order`).
   - Guest cancellation window for pending orders (`cancel_guest_order`).
   - Comprehensive Admin Dashboard for managing products, categories, hero slides, and customer orders.

### The Template Contract
The frontend visual identity is designed to be completely redesigned, restyled, and adapted for each client's unique brand language, while the underlying e-commerce engine, database schema, security policies, and payment architecture remain rock-solid and stable.

---

## 2. GOLDEN RULE

```
========================================================================================
            COPY THE TEMPLATE — NEVER TURN THE MASTER INTO A CLIENT PROJECT!
========================================================================================

   [Master-Ecommerce-Template]  (Permanent clean template — keep clean, generic, secure)
                 │
                 ├── 1. Clone / Copy directory to new location
                 ▼
   [ClientName]                 (Client working repository — e.g. AcmeClothing, NovaDecor)
                 │
                 ├── 2. Configure src/config/site.ts with client details
                 ├── 3. Create NEW independent Supabase project
                 ├── 4. Connect client's own Razorpay account
                 ├── 5. Apply migrations & configure Edge Function secrets
                 ├── 6. Populate client catalog, categories & hero slides
                 ├── 7. Inspect .agents/skills/ & choose a .design-references/ design system
                 ├── 8. Customize frontend UI to match client's brand & reference
                 ├── 9. Add requested business-specific features (if applicable)
                 ├── 10. Test cart, checkout, payments, and order tracking
                 └── 11. Deploy to production & map custom client domain
========================================================================================
```

> **NEVER** put client API keys, client database URLs, client logos, or hardcoded client details into the master repository.  
> **NEVER** build a client website directly on the `main` branch of `Master-Ecommerce-Template`.

---

## 3. MASTER VS CLIENT-SPECIFIC

| Area / Component | Master Template Role | Client Project Action |
| :--- | :--- | :--- |
| **Core E-Commerce Logic** | Reusable | Retain intact; do not rewrite working business logic. |
| **Database Schema & Migrations** | Reusable | Execute all existing SQL migrations against the new client database. |
| **Row Level Security (RLS)** | Reusable | Keep intact; protects guest orders, catalog access, and admin tables. |
| **Auth Architecture** | Reusable | Retain Supabase Auth integration; create fresh admin credentials. |
| **Admin Dashboard UI & Logic** | Reusable | Retain structure; adjust colors or typography only if requested. |
| **Shopping Cart Logic** | Reusable | Retain state management, item calculations, and storage handlers. |
| **Checkout & Guest Order Flow** | Reusable | Retain validation, price checks, and atomic order creation. |
| **Razorpay Payment Pipeline** | Reusable Architecture | Retain Edge Functions & checkout modal hooks; supply client credentials. |
| **Edge Functions (`supabase/functions`)** | Reusable Architecture | Deploy exact function code to the client's Supabase instance. |
| **Design References & Skills** | Curated Reference Library | **USE** `.agents/skills/` and `.design-references/` to steer UI redesign. |
| **Brand Name & Tagline** | Generic Placeholder | **REPLACE** in `src/config/site.ts` and `public/site.webmanifest`. |
| **Logo & Favicon Suite** | Template Assets | **REPLACE** all icons in `public/` (`favicon.ico`, `favicon.svg`, etc.). |
| **Color Palette & Theme Tokens** | Neutral Obsidian / Off-White | **CUSTOMIZE** in `src/styles/global.css` (`@theme` tokens). |
| **Typography & Web Fonts** | Inter & JetBrains Mono | **CUSTOMIZE** in `src/layouts/Layout.astro` & `src/styles/global.css`. |
| **Hero Banners & Copy** | Placeholder Slides | **REPLACE** via Supabase `hero_slides` table or initial seeding. |
| **Products & Descriptions** | Sample Product Items | **REPLACE** with client's actual product catalog & specifications. |
| **Categories & Taxonomies** | 5 Generic Categories | **REPLACE** in database (`categories` table) and `src/config/site.ts`. |
| **Product Media & Photos** | Sample Renderings | **REPLACE**; upload client photography to `product-images` bucket. |
| **Contact Phone & Raw WhatsApp** | Blank / Empty Strings | **REPLACE** with client's active customer support numbers. |
| **Support Email & Address** | Blank / Empty Strings | **REPLACE** with client's verified domain email and physical address. |
| **Social Links (Instagram, etc.)** | Blank / Empty Strings | **REPLACE** with client's social media handles and URLs. |
| **Domain & Canonical URLs** | Empty String | **REPLACE** with client's production domain (e.g., `https://clientbrand.com`). |
| **Supabase Project Instance** | None (Local / Test) | **CREATE NEW** project for every single client. |
| **Razorpay Account & Keys** | None (Placeholders) | **PROVISION CLIENT KEYS** (Key ID, Secret, Webhook Secret). |
| **Admin Accounts** | None | **CREATE FRESH** in client Supabase Auth & `admin_users` table. |
| **Orders & Customer Records** | Empty | **FRESH / EMPTY** for each client launch. |

---

## 4. ENVIRONMENT VARIABLES

The project uses a split-environment architecture: public non-sensitive configuration is read by Astro on the frontend, while sensitive API keys and secrets exist solely inside Supabase Edge Functions.

### Frontend Environment Variables (`.env`)

These variables are defined in `.env` for local development and in the deployment platform's Environment Variables settings (e.g., Vercel / Netlify dashboard).

| Variable Name | Type | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `PUBLIC_SUPABASE_URL` | **REQUIRED** | **PUBLIC** | The HTTPS project URL for the client's Supabase instance (e.g., `https://xyzproject.supabase.co`). |
| `PUBLIC_SUPABASE_ANON_KEY` | **REQUIRED** | **PUBLIC** | The public anon key for the client's Supabase instance. Safe for browser exposure; protected by Postgres RLS. |
| `PUBLIC_RAZORPAY_KEY_ID` | **REQUIRED** | **PUBLIC** | The public Razorpay Key ID (e.g., `rzp_live_...` or `rzp_test_...`). Used by frontend checkout modal. |

> [!CAUTION]
> **NEVER EXPOSE SECRETS IN FRONTEND CODE OR `.env`:**
> - `SUPABASE_SERVICE_ROLE_KEY`
> - `RAZORPAY_KEY_SECRET`
> - `RAZORPAY_WEBHOOK_SECRET`
> 
> Never prefix sensitive credentials with `PUBLIC_`. Client-side code is accessible to any website visitor.

### Supabase Edge Functions Secrets (Server-Side Only)

These variables are stored directly inside the client's Supabase project using the Supabase CLI (`supabase secrets set ...`) or the Supabase Project Dashboard under **Project Settings -> Edge Functions -> Secrets**.

| Secret Name | Type | Access Level | Where Used | Description |
| :--- | :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | **REQUIRED** | **SECRET** | `create-razorpay-order`, `verify-razorpay-payment` | Razorpay Key ID for authenticating server-to-server API requests. |
| `RAZORPAY_KEY_SECRET` | **REQUIRED** | **SECRET** | `create-razorpay-order`, `verify-razorpay-payment` | Razorpay Secret used to create orders and compute HMAC SHA256 payment verification signatures. |
| `RAZORPAY_WEBHOOK_SECRET` | **REQUIRED** | **SECRET** | `razorpay-webhook` | Secret configured in Razorpay Webhook Dashboard to verify incoming event webhook signatures. |
| `SUPABASE_URL` | *Automatic* | *Internal* | All Edge Functions | Automatically injected by Supabase Deno runtime. |
| `SUPABASE_SERVICE_ROLE_KEY` | *Automatic* | *Internal* | All Edge Functions | Automatically injected by Supabase Deno runtime to bypass RLS for administrative order reconciliation. |

---

## 5. WHAT IS CURRENTLY BLANK / PLACEHOLDER

The table below reflects the exact state of `Master-Ecommerce-Template`. When onboarding a new client, inspect each field and replace it with verified client data.

| Field | Current Repository Value | Client Must Replace? | Where Defined |
| :--- | :--- | :--- | :--- |
| **Brand Name** | `'E-commerce Store'` | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`brand.name`), `public/site.webmanifest` |
| **Brand Tagline** | `'Quality Products. Simple Shopping.'` | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`brand.tagline`) |
| **Brand Description** | `'A modern, premium e-commerce store...'` | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`brand.description`) |
| **Brand URL** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`brand.url`) |
| **WhatsApp Number** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.whatsapp`) |
| **WhatsApp Display** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.whatsappDisplay`) |
| **WhatsApp URL** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.whatsappUrl`) |
| **WhatsApp Pre-fill Message** | `"Hi! I'd like to know more about your products."` | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`contact.whatsappMessage`) |
| **Support Email** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.email`) |
| **Support Phone** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.phone`) |
| **Phone (Raw digits)** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.phoneRaw`) |
| **Phone (Formatted)** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`contact.phoneDisplay`) |
| **Instagram URL** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`social.instagram`) |
| **Instagram Handle** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`social.instagramHandle`) |
| **Instagram Display** | `''` | **BLANK — MUST BE PROVIDED FOR CLIENT** | `src/config/site.ts` (`social.instagramDisplay`) |
| **Shipping Flat Rate** | `110` (INR) | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`shipping.flatRate`), SQL RPC `create_guest_order` |
| **Currency Settings** | `INR` / `₹` / `en-IN` | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`currency`) |
| **Categories Config** | 5 Generic Categories (`Home & Living`, `Office`, etc.) | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `src/config/site.ts` (`categories`) & Supabase `categories` table |
| **Webmanifest Name** | `"E-commerce Store"` / `"Store"` | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `public/site.webmanifest` |
| **Favicons & App Icons** | Generic Template Icons | **TEMPLATE DEFAULT — REVIEW FOR CLIENT** | `public/favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `web-app-manifest-*.png` |
| **Frontend .env file** | Not committed (`.env.example` only) | **BLANK — MUST BE PROVIDED FOR CLIENT** | Create `.env` based on `.env.example` |

---

## 6. MASTER CONFIGURATION (`src/config/site.ts`)

The central file governing client metadata, navigational structures, pricing display formatters, and contact links is [`src/config/site.ts`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/src/config/site.ts).

### Structure Breakdown

```typescript
export const siteConfig = {
  brand: {
    name: 'E-commerce Store',         // REPLACE: Client's registered brand or trade name
    tagline: 'Quality Products...',   // REPLACE: Client's brand punchline or value proposition
    description: '...',               // REPLACE: Meta description for SEO and social preview
    url: '',                          // REPLACE: Production canonical URL (e.g. 'https://clientbrand.com')
  },
  contact: {
    whatsapp: '',                     // REPLACE: International format without symbols (e.g. '919876543210')
    whatsappDisplay: '',              // REPLACE: Human-readable format (e.g. '+91 98765 43210')
    whatsappUrl: '',                  // OPTIONAL: Custom wa.me override if not using helper
    whatsappMessage: '...',           // REVIEW: Default message when visitors initiate chat
    email: '',                        // REPLACE: Primary sales or support inbox (e.g. 'hello@client.com')
    phone: '',                        // REPLACE: Standard customer service phone format
    phoneRaw: '',                     // REPLACE: Tel link value (e.g. '+919876543210')
    phoneDisplay: '',                 // REPLACE: Display format for headers and footers
  },
  social: {
    instagram: '',                    // REPLACE: Full Instagram profile URL
    instagramHandle: '',              // REPLACE: @handle
    instagramDisplay: '',             // REPLACE: Human label for footer
  },
  nav: [                              // REVIEW/CUSTOMIZE: Header primary navigation links
    { label: 'Shop', href: '/shop' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Custom Printing', href: '/custom' }, // RENAME/REPLACE per business requirements
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ] as const,
  legal: [                            // RETAIN/REVIEW: Standard mandatory compliance pages
    { label: 'Return Policy', href: '/return-policy' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ] as const,
  categories: [                       // REVIEW: Keep in sync with initial database categories
    { name: 'Home & Living', slug: 'home-living', description: '...' },
    { name: 'Office', slug: 'office', description: '...' },
    // ...
  ] as const,
  currency: {
    code: 'INR',
    symbol: '₹',
    locale: 'en-IN',
  },
  shipping: {
    flatRate: 110,                    // REVIEW: Matches shipping default in database RPC
  },
} as const;
```

### Critical Rules for `siteConfig`
1. **Never Hardcode Client Info in UI Components**: Never type a phone number, email, or company name directly inside an `.astro` or `.ts` file. Always import and read from `siteConfig.brand`, `siteConfig.contact`, or `siteConfig.social`.
2. **Use Helper Functions**:
   - `formatPrice(amount)`: Formats numbers using the configured currency code and locale.
   - `getWhatsAppLink(customMessage)`: Generates compliant `https://wa.me/` URLs using `siteConfig.contact.whatsapp`.

---

## 7. DATABASE / SUPABASE SETUP

Every client project **MUST** connect to an independent, freshly created Supabase project.

> [!WARNING]
> **NEVER connect a new client to a previous client's database.**  
> Doing so creates severe data privacy breaches, cross-pollinates customer order records, and violates regulatory compliance.

### Core Database Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE POSTGRESQL                             │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│ TABLE                    │ DESCRIPTION                 │ ACCESS RULE   │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ public.admin_users       │ Registered admin staff      │ Admin-only    │
│ public.categories        │ Product taxonomy            │ Public read   │
│ public.products          │ Product catalog & specs     │ Public read   │
│ public.orders            │ Guest & customer orders     │ Strict RPC    │
│ public.order_items       │ Line items per order        │ Strict RPC    │
│ public.hero_slides       │ Homepage carousel banners   │ Public read   │
│ storage.objects          │ Bucket: 'product-images'    │ Public read   │
└──────────────────────────┴─────────────────────────────┴───────────────┘
```

### Reusable Migrations (`supabase/migrations/`)
The database schema is defined in sequential migration files. Run these in order on the new client project:

1. `20260926_init_printveda_schema.sql` (Creates `admin_users`, `categories`, `products`, `orders`, `order_items`, `is_admin()`, `create_guest_order()`, and `product-images` storage bucket with full RLS).
2. `20260927_hero_slides.sql` (Creates `hero_slides` table with RLS and admin controls).
3. `20260928210000_update_shipping_and_cancel.sql` (Updates shipping calculations and adds guest cancellation logic).
4. `20260928213000_add_order_tracking_number.sql` (Adds shipment tracking number support).
5. `20260928220000_harden_guest_order_lookup_and_cancel.sql` (Hardens phone + order validation against IDOR attacks).

> [!NOTE]
> **Historical Migration Filenames**:  
> The initial migration contains historical naming (`20260926_init_printveda_schema.sql`). **DO NOT rename this migration file.** Supabase tracks migrations by exact filename in the `supabase_migrations.schema_migrations` table. Renaming files breaks migration consistency.

### Provisioning an Admin User
After executing the migrations on the new project:
1. Open the Supabase Dashboard -> **Authentication** -> **Users** -> **Add user** (Create user with client email & strong password).
2. Copy the generated `UUID` of the newly created user.
3. In SQL Editor, run:
   ```sql
   INSERT INTO public.admin_users (user_id, email, full_name, role)
   VALUES ('<USER-UUID>', 'admin@clientdomain.com', 'Store Admin', 'super_admin');
   ```

---

## 8. RAZORPAY SETUP

Each client operates their own business entity and must provide their own Razorpay account credentials.

### Required Razorpay Parameters
1. **Key ID (Public & Server)**:
   - Frontend: `PUBLIC_RAZORPAY_KEY_ID` (in `.env`)
   - Edge Functions: `RAZORPAY_KEY_ID` (in Supabase secrets)
2. **Key Secret (Server-Only)**:
   - Edge Functions: `RAZORPAY_KEY_SECRET` (in Supabase secrets)
   - *Never put this in frontend code or repository files.*
3. **Webhook Secret (Server-Only)**:
   - Edge Functions: `RAZORPAY_WEBHOOK_SECRET` (in Supabase secrets)
   - Configured in Razorpay Dashboard under **Settings -> Webhooks**.

### Webhook Configuration in Razorpay Dashboard
- **Webhook URL**: `https://<CLIENT-PROJECT-REF>.supabase.co/functions/v1/razorpay-webhook`
- **Secret**: Set a random cryptographic string and mirror it in `RAZORPAY_WEBHOOK_SECRET`.
- **Active Events to Select**:
  - `payment.captured`
  - `payment.failed`
  - `order.paid`

### Integrity of Payment Logic
The files under [`supabase/functions/`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/supabase/functions) and the checkout scripts in [`src/pages/checkout.astro`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/src/pages/checkout.astro) constitute an audited payment pipeline.  
Do not refactor or replace these scripts during routine design work.

---

## 9. REQUIRED SKILLS & DESIGN REFERENCES (`.agents/skills` & `.design-references/`)

> [!IMPORTANT]
> **MANDATORY DESIGN PROTOCOL FOR AI AGENTS:**  
> Before performing ANY frontend, UI, styling, or redesign task, you **MUST** inspect and use the relevant installed skills in [`.agents/skills/`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills) and the curated design references in [`.design-references/`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.design-references).  
> **DO NOT** rely only on general LLM memory or generic Tailwind templates. Authoritative, high-taste resources are built into this repository.

### 9.1 Installed Frontend Skills (`.agents/skills/`)
Before building or redesigning UI, inspect the matching skill's `SKILL.md` to guide your architectural and stylistic choices:

| Skill Directory | Primary Purpose & Agent Instructions |
| :--- | :--- |
| [`.agents/skills/design-taste-frontend`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/design-taste-frontend/SKILL.md) | Anti-slop frontend guidelines for landing pages and redesigns. Prevents generic AI templates, enforces typography hierarchy, whitespace calibration, and authentic design systems. |
| [`.agents/skills/frontend-design`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/frontend-design/SKILL.md) | Guidance for distinctive, intentional visual design. Sets aesthetic directions and prevents defaults that look like stock templates. |
| [`.agents/skills/high-end-visual-design`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/high-end-visual-design/SKILL.md) | Teaches the AI to design like a top-tier digital agency. Defines exact font pairings, spacing scales, shadow elevations, card structures, and subtle tactile surfaces. |
| [`.agents/skills/minimalist-ui`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/minimalist-ui/SKILL.md) | Clean editorial-style interfaces, warm monochrome palettes, high typographic contrast, and flat bento layouts without excessive shadows or gradients. |
| [`.agents/skills/industrial-brutalist-ui`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/industrial-brutalist-ui/SKILL.md) | Mechanical interfaces, rigid grids, high-contrast type scales, hairline borders, and utilitarian aesthetics for technical, automotive, or engineering brands. |
| [`.agents/skills/responsive-design`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/responsive-design/SKILL.md) | Fluid typography, container queries, modern CSS Grid, and mobile-first breakpoint strategies. Enforces ~44px minimum touch targets and eliminates horizontal overflow. |
| [`.agents/skills/tailwind-4-docs`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/tailwind-4-docs/SKILL.md) | Official Tailwind CSS v4 reference, `@theme` token definitions, CSS-first imports, and variant syntax. |
| [`.agents/skills/redesign-existing-projects`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/redesign-existing-projects/SKILL.md) | Safely upgrades existing interfaces to premium standards without breaking existing cart, checkout, form IDs, or API contracts. |
| [`.agents/skills/web-design-guidelines`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/web-design-guidelines/SKILL.md) | Audits UI for Web Interface Guidelines compliance, accessibility (WCAG contrast, focus indicators, keyboard navigation), and conversion UX. |
| [`.agents/skills/brandkit`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.agents/skills/brandkit/SKILL.md) | Guides creation and refinement of brand identity decks, harmonious color systems, logo framing, and visual-world assets. |

### 9.2 Curated Design References (`.design-references/`)
The repository includes 74 curated `DESIGN.md` design system specifications from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md), located in [`.design-references/`](file:///c:/preview%20sites%20for%20business/Master-Ecommerce-Template/.design-references).

Each `DESIGN.md` provides **color tokens**, **typography scales**, **card geometry**, **layout rules**, and **anti-patterns** extracted from world-class digital brands:

```
.design-references/
├── apple/DESIGN.md          # Benchmark physical product photography, whitespace, elegant typography
├── stripe/DESIGN.md         # Gold-standard e-commerce conversion, mesh gradients, precise typography
├── shopify/DESIGN.md        # Frictionless commerce UX, clean cards, actionable component design
├── nike/DESIGN.md           # Bold athletic typography, impactful full-bleed imagery, strong rhythm
├── starbucks/DESIGN.md      # Warm tactile craft, deep rich organic tones, humanized commerce
├── airbnb/DESIGN.md         # Generous whitespace, soft rounded cards, seamless discovery browsing
├── linear.app/DESIGN.md     # Near-black canvas, lavender accents, hairline borders, quiet luxury
├── vercel/DESIGN.md         # Stark monochrome, razor-sharp geometric grids, Geist typography
├── supabase/DESIGN.md       # Dark slate canvas, emerald accents, technical precision UI
├── raycast/DESIGN.md        # Deep dark chrome, vivid neon glow accents, tactile keyboard-driven UI
├── tesla/DESIGN.md          # Futuristic engineering precision, monochrome high contrast
├── claude/DESIGN.md         # Warm terracotta, intellectual editorial layout, paper-like warmth
└── [62+ additional brands: bmw, ferrari, notion, figma, framer, runwayml, etc.]
```

### 9.3 How to Apply Skills and References During Client Work
1. **Analyze Client Requirements**: When the client specifies a brand mood, target industry, or shares a reference website, locate the matching directory in `.design-references/`.
2. **Extract Principles (Never Copy Proprietary Assets)**: Read the corresponding `DESIGN.md`. Extract:
   - Primary surface and background colors (add to `src/styles/global.css` under `@theme`).
   - Typography scales and Google Fonts pairings.
   - Border styles (hairline borders vs. subtle elevation vs. borderless cards).
   - Component geometry (subtle radius vs. sharp structural edges).
3. **Combine With Frontend Skills**:
   - Use `design-taste-frontend` or `high-end-visual-design` to craft section layouts that feel bespoke.
   - Use `responsive-design` to verify mobile behavior (mobile-first touch ergonomics).
   - Use `web-design-guidelines` for final visual and accessibility quality assurance.

---

## 10. CLIENT FRONTEND CUSTOMIZATION

Every client should receive a tailored visual experience that matches their industry, brand character, market positioning, and target audience. The master template provides a proven architectural foundation, but should not constrain the visual design.

### What May Be Freely Redesigned
- **Hero & Landing Section**: Full-bleed cinematic photography, split-screen hero, minimalist typography, promotional editorial banner, or interactive product showcase.
- **Color Scheme & Theme Tokens**: Tailored palette configured via Tailwind v4 `@theme` (luxury dark mode, clean airy modern minimalism, warm organic earthy tones, or bold high-contrast styling).
- **Typography & Font Pairing**: Google Fonts or web fonts appropriate to the client's industry (e.g., editorial serifs, technical grotesques, geometric sans, or classic humanist types).
- **Navigation & Header**: Sticky minimalist header, center-logo bar, multi-category mega menu, or clean slide-out drawer.
- **Product Cards & Grid**: High-density e-commerce grids, cardless editorial layouts, hover-reveal details, badges, or carousel showcases.
- **Product Detail Page**: Multi-angle image galleries, swatch selectors, accordion specifications, shipping estimation notices, and customer trust badges.
- **Sections & Component Styling**: Testimonials, brand story/about blocks, featured collection grids, promotional banners, FAQ accordions, and footers.
- **Mobile Layout & Interactions**: Bottom sticky action bars, touch-optimized swipers, slide-over cart drawers, and thumb-friendly controls.

### Workflow: Designing From a Client Reference
When a client supplies a reference website, Figma file, or visual moodboard:
1. **Match with `.design-references/` & Skills**: Identify the closest architectural design system in `.design-references/` and review the relevant `.agents/skills/`.
2. **Analyze Visual Direction**: Identify the color palette, type scales, surface treatments, whitespace density, and card geometry.
3. **Configure Design System**: Update `src/styles/global.css` using Tailwind v4 `@theme` directives and semantic surface/text tokens.
4. **Restructure Layout & Components**: Adapt `src/components/Navbar.astro`, `src/components/Footer.astro`, and `src/components/ProductCard.astro`.
5. **Preserve E-Commerce Contracts**: Keep all HTML IDs, form submission handlers, cart event listeners, and Supabase client calls intact.
6. **Avoid Blind Copying**: Draw inspiration from the reference's layout principles, rhythm, and visual hierarchy; never copy proprietary logos, trademarked assets, or copyrighted copy.

---

## 11. BUSINESS-SPECIFIC FEATURES

The core e-commerce engine (catalog, cart, checkout, payments, orders, admin) is universally reusable across all retail sectors. Business-specific requirements should be introduced additively according to the client's commercial model:

### Common Business Specializations
- **Apparel & Fashion**: Size guides, fit selectors (S/M/L/XL), color swatches, fabric care instructions, model measurements.
- **Home & Living**: Room dimension calculators, material finishes (wood, ceramic, metal, linen), care guides, assembly instructions.
- **Beauty & Cosmetics**: Skin type selectors, ingredient glossaries, volume/weight variations (30ml, 50ml), routine pairing suggestions.
- **Electronics & Accessories**: Device compatibility matrices, technical specification tables, warranty options.
- **Food & Beverage**: Dietary tags (vegan, gluten-free), ingredient lists, net weight, shelf life, bundle/pack options.
- **Bespoke / Fabrication / 3D Printing**: Custom quote calculators, CAD/STL file uploads, material selection (PLA, PETG, Resin), finish options, or WhatsApp bespoke consultation flows.

The existing `/custom` route in the template is an example of a bespoke consultation flow. It can be adapted, renamed, or repurposed (e.g., to `/bespoke`, `/custom-order`, `/book-consultation`, or removed from navigation) depending on what the client sells.

---

## 12. WHAT AN AGENT MAY ADD

When a client requests enhanced capabilities, agents may extend the platform with features that integrate seamlessly into the existing architecture:

| Feature | Recommended Implementation Strategy |
| :--- | :--- |
| **Product Variant Engine** | Extend `products` with structured variants (size, color, material) or use variant mapping in UI. |
| **Discount & Coupon Engine** | Create `coupons` table with verification RPC; validate discount server-side before order creation. |
| **Instant Quote / Price Calculator** | Add interactive calculator on custom order pages (e.g., area/volume × rate). |
| **File Upload System** | Create dedicated Supabase Storage bucket with restricted MIME-types; attach URL to order. |
| **Automated WhatsApp / SMS Alerts** | Connect Supabase database webhooks to WhatsApp/SMS provider (Twilio, Wati, etc.). |
| **Automated Email Notifications** | Trigger Resend / SendGrid Edge Function when `orders.status` changes. |
| **Postal Code / Delivery Checker** | Client-side postal code lookup against courier serviceability API (Shiprocket, Delhivery, etc.). |
| **Customer Product Reviews** | Add `reviews` table with product relation; enforce verified purchase checks or admin moderation. |
| **Catalog Search & Filtering** | Implement client-side Fuse.js fuzzy search or Postgres full-text search on `products.name` and `description`. |
| **Customer Wishlist** | LocalStorage-backed wishlist drawer with heart icons on `ProductCard.astro`. |
| **Subscription / Recurring Orders** | Integrate Razorpay Subscriptions via dedicated Edge Function. |

> **Architectural Rule**: Always inspect existing tables and RPCs first. Extend via additive migrations and auxiliary functions rather than replacing existing core structures.

---

## 13. WHAT AN AGENT MUST NOT CHANGE CASUALLY

The following items are core infrastructure. **DO NOT MODIFY** unless explicitly instructed to perform a breaking architectural refactor:

1. **`public.create_guest_order` RPC**: This function enforces server-authoritative price calculation directly from the `products` table. Altering its price calculation logic creates critical vulnerabilities where malicious users could order items at arbitrary prices.
2. **`public.is_admin()` Security Definer Function**: Controls RLS access to admin tables and storage uploads. Modifying its search path or security context compromises database security.
3. **Row-Level Security (RLS) Policies**: All policies on `products`, `categories`, `orders`, `order_items`, and `hero_slides` have been audited. Do not run `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.
4. **Payment HMAC Verification**: The signature verification algorithms in `verify-razorpay-payment` and `razorpay-webhook` use standard crypto standards (`crypto.subtle`). Never bypass or stub signature checks.
5. **Existing Migration Files**: Never edit an already-committed migration file in `supabase/migrations/`. Always create a new, sequentially timestamped migration file for schema changes.
6. **Cart Data Contract**: The cart stores items with `{ id, name, price, original_price, quantity, color, image, slug }`. Modifying these keys breaks checkout serialization.

---

## 14. CLIENT CONTENT CHECKLIST

Collect or verify every item on this checklist before preparing a client build:

### Brand Assets
- [ ] Registered Brand Name
- [ ] Short Name / Mobile App Title
- [ ] Official Logo (SVG vector format preferred)
- [ ] High-resolution Favicons (SVG, ICO, and PNG web-app formats)
- [ ] Primary, Secondary & Accent Brand Colors (HEX / HSL values)
- [ ] Preferred Brand Typography / Google Fonts

### Business Details
- [ ] Customer Support Phone Number
- [ ] WhatsApp Business Number (with international country code)
- [ ] Support / Contact Email Address
- [ ] Physical Business / Store / Warehouse Address
- [ ] Social Media Links (Instagram, YouTube, X, Facebook, LinkedIn)
- [ ] Production Domain Name (e.g., `https://clientbrand.com`)

### Catalog & Inventory
- [ ] Category Taxonomy & Slugs
- [ ] Product Titles and Descriptions
- [ ] Authoritative Product Retail Prices (`price`) & MRP (`original_price`)
- [ ] Product Variants (sizes, colors, materials, options)
- [ ] Dimensions, Weight, and Shipping Specifications
- [ ] High-resolution Product Media (minimum 1200×1200px, WebP format)
- [ ] Initial Stock Quantities

### Operations & Policies
- [ ] Standard Shipping Rates & Delivery Rules
- [ ] Free Shipping Threshold (if applicable)
- [ ] Return Policy terms & conditions
- [ ] Refund Policy guidelines
- [ ] Privacy Policy details
- [ ] Terms of Service / Disclaimer
- [ ] Business-specific terms (lead times, bespoke order policies, etc.)

### Payments
- [ ] Active Razorpay Account (KYC completed)
- [ ] Live Razorpay Key ID
- [ ] Live Razorpay Key Secret
- [ ] Razorpay Webhook Secret configured

### Supabase Backend
- [ ] Dedicated Supabase project provisioned
- [ ] All migrations applied successfully
- [ ] Initial Admin User registered and inserted into `admin_users`
- [ ] `product-images` storage bucket verified as Public
- [ ] Edge Function secrets set (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`)
- [ ] Edge Functions deployed (`create-razorpay-order`, `verify-razorpay-payment`, `razorpay-webhook`)

---

## 15. DEPLOYMENT CHECKLIST

Execute this verification checklist prior to delivering a client build to production:

```markdown
### Sanitization & Content Verification
- [ ] Verified zero placeholder brand names, domains, or prior client references in code
- [ ] Verified zero placeholder phone numbers (e.g., 9999999999) or empty contact strings in UI
- [ ] Verified all legal and policy pages have client's legal business name and email
- [ ] Verified site.webmanifest displays client name and correct icon paths
- [ ] Verified WhatsApp and call buttons open with client's active customer service numbers

### Configuration & Security
- [ ] Verified .env is NOT committed to Git repository
- [ ] Verified production deployment platform has PUBLIC_SUPABASE_URL set
- [ ] Verified production deployment platform has PUBLIC_SUPABASE_ANON_KEY set
- [ ] Verified production deployment platform has PUBLIC_RAZORPAY_KEY_ID set (Live Key)
- [ ] Verified no sensitive secrets exist in frontend bundle (search client JS build)

### E-Commerce Flow Testing
- [ ] Added products to cart from catalog
- [ ] Tested cart quantity increment, decrement, and item removal
- [ ] Tested cart price updates and shipping fee calculations
- [ ] Executed real test order via Razorpay (Test mode or ₹1 Live test)
- [ ] Verified payment signature successfully validated by Edge Function
- [ ] Verified order appears in Supabase `orders` table with status 'confirmed' / 'paid'
- [ ] Verified order items appear correctly in Supabase `order_items` table
- [ ] Navigated to `/track-order` and verified order status lookup via Order ID + Phone
- [ ] Verified Admin Dashboard allows login and displays new order in `/admin`

### Technical & Performance Validation
- [ ] Ran `npm run build` and verified zero build errors
- [ ] Checked browser console for JavaScript exceptions or hydration errors
- [ ] Tested responsive layouts on Mobile (375px), Tablet (768px), and Desktop (1440px)
- [ ] Verified custom domain SSL certificate is active
```

---

## 16. SAFE DEVELOPMENT RULES FOR AI AGENTS

Follow these guidelines on every task:

### 1. Before Editing Any File
- **Inspect Skills & References**: Always check relevant skills in `.agents/skills/` and matching systems in `.design-references/` before writing frontend code.
- **Inspect Code First**: Use `view_file` or `grep_search` to understand existing component contracts before introducing modifications.
- **Trace Dependencies**: Check where an exported function or component is imported across the project.
- **Preserve Contracts**: Keep prop types and exported interfaces backward-compatible.

### 2. During Frontend Redesign
- **Do Not Remove Functionality**: Never delete cart drawer triggers, checkout validation, or payment callbacks just to simplify HTML markup.
- **Maintain Accessibility**: Preserve button labels, form input names, ARIA attributes, and color contrast (refer to `web-design-guidelines` skill).
- **Keep Data Selectors**: Ensure all IDs, data attributes, and form field names referenced by client scripts remain unchanged.

### 3. During Backend Operations
- **Non-Destructive Migrations**: Always write additive migrations (`ADD COLUMN IF NOT EXISTS`, etc.).
- **Verify RLS Security**: Test that anonymous clients cannot modify tables without passing through security-definer RPCs.
- **Never Log Secrets**: Do not write console log statements that output API keys, secrets, or customer PII.

### 4. Post-Edit Verification
- **Audit Text Matches**: Grep for old client names or leftover placeholders.
- **Compile Check**: Run `npm run build` to verify TypeScript types and Astro template integrity.
- **Summarize Changes**: Clearly document all files modified, any newly added environment variables, and pending client deliverables.

---

## 17. COMMON MISTAKES TO AVOID

1. **Editing Master Directly**: Starting client work directly inside the `Master-Ecommerce-Template` repository instead of creating a copy.
2. **Ignoring Skills & Design References**: Designing UI with generic LLM defaults instead of reading `.agents/skills/` and `.design-references/`.
3. **Reusing Previous Client Databases**: Pointing a new client to an existing Supabase project, causing cross-client data contamination.
4. **Reusing Previous Razorpay Keys**: Using old Razorpay test or live keys, resulting in payments depositing into the wrong bank account.
5. **Forgetting to Seed Admin User**: Creating an account in Supabase Auth but forgetting to add the matching row into `public.admin_users`, which prevents admin dashboard login.
6. **Leaving Placeholder Product Images**: Deploying with template product photos instead of uploading client-specific product media.
7. **Hardcoding Client Data in Pages**: Typing phone numbers or URLs into individual `.astro` pages instead of configuring `src/config/site.ts`.
8. **Breaking Razorpay Modal Handler**: Altering the checkout script in `src/pages/checkout.astro` such that the Razorpay `handler` callback fails to invoke `verify-razorpay-payment`.
9. **Disabling Row-Level Security**: Turning off Postgres RLS during debugging and forgetting to re-enable it before deployment.
10. **Renaming Existing Migrations**: Renaming `20260926_init_printveda_schema.sql` to clean up historical naming, which corrupts the migration state.
11. **Exposing Service Role Keys**: Placing `SUPABASE_SERVICE_ROLE_KEY` inside `.env` or Astro client code.
12. **Altering Shipping Logic in One Place Only**: Changing `shipping.flatRate` in `site.ts` but failing to update the default shipping rate inside the database RPC `create_guest_order`.
13. **Blindly Zeroing Border Radii**: Replacing all Tailwind radius classes indiscriminately rather than applying intentional design geometry.

---

## 18. QUICK START FOR A NEW CLIENT

Follow this sequential runbook when spinning up a new client store:

```bash
# 1. Copy the master repository to a new client directory
cp -r Master-Ecommerce-Template ClientName
cd ClientName

# 2. Inspect configuration and instructions
cat AGENT_GUIDE.md

# 3. Inspect available design skills and choose a reference system
# Review .agents/skills/ (design-taste-frontend, high-end-visual-design, responsive-design)
# Review .design-references/ to find matching brand aesthetic (e.g., stripe, nike, apple, starbucks)

# 4. Configure site branding and contact information
# Edit src/config/site.ts with client details

# 5. Replace branding assets
# Update public/favicon.ico, favicon.svg, apple-touch-icon.png, and public/site.webmanifest

# 6. Add client catalog, content, and media assets
# Prepare product photography, descriptions, categories, and inventory

# 7. Create a fresh Supabase project in the Supabase Dashboard
# Note the Project URL and anon public key

# 8. Initialize local environment variables
cp .env.example .env
# Fill PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_RAZORPAY_KEY_ID in .env

# 9. Apply database migrations to the new Supabase project
supabase link --project-ref <CLIENT-PROJECT-REF>
supabase db push

# 10. Register admin user
# In Supabase Auth Dashboard, create user: admin@clientdomain.com
# In Supabase SQL Editor, insert user into public.admin_users table

# 11. Set Edge Function secrets
supabase secrets set RAZORPAY_KEY_ID="rzp_live_..."
supabase secrets set RAZORPAY_KEY_SECRET="..."
supabase secrets set RAZORPAY_WEBHOOK_SECRET="..."

# 12. Deploy Edge Functions
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook

# 13. Configure Razorpay Webhook in Razorpay Dashboard
# URL: https://<CLIENT-PROJECT-REF>.supabase.co/functions/v1/razorpay-webhook
# Events: payment.captured, payment.failed, order.paid

# 14. Populate client categories, products, and hero slides
# Use Admin Dashboard (/admin) or SQL migration scripts

# 15. Customize frontend aesthetic
# Apply tokens from chosen .design-references/DESIGN.md to src/styles/global.css
# Refactor layout components adhering to .agents/skills/ guidance

# 16. Add requested business-specific features (if applicable)

# 17. Validate build
npm run build

# 18. Run full QA and test transactions

# 19. Deploy to hosting platform (Vercel / Netlify)

# 20. Connect production domain
```

---

## 19. WHEN IN DOUBT — FINAL AGENT DIRECTIVES

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   WHEN IN DOUBT:                                                       │
│   Preserve the reusable ecommerce architecture and ask or inspect      │
│   before making destructive or business-specific assumptions.         │
│                                                                        │
│   1. NEVER GUESS CLIENT-SPECIFIC INFORMATION.                          │
│      If a client's GST number, phone, email, or shipping rate is       │
│      unknown, mark it explicitly as "TODO: CLIENT VALUE REQUIRED".     │
│                                                                        │
│   2. NEVER REUSE OLD CLIENT CREDENTIALS OR DATABASES.                  │
│      Every client gets their own isolated Supabase and Razorpay setups.│
│                                                                        │
│   3. ALWAYS LEVERAGE .agents/skills/ & .design-references/.            │
│      Never build generic UI when curated design skills and 74          │
│      world-class design systems are available in this repository.      │
│                                                                        │
│   4. NEVER COMPROMISE CORE SECURITY OR PAYMENT LOGIC.                  │
│      Redesign visual presentation freely, but keep the underlying      │
│      e-commerce engine, database RPCs, and cryptographic checks intact.│
│                                                                        │
│   5. ADD BUSINESS-SPECIFIC FEATURES INTENTIONALLY.                     │
│      Do not assume every store is identical. Introduce variants,       │
│      size charts, custom forms, or calculators additively.             │
│                                                                        │
│   6. VERIFY BEFORE DEPLOYING.                                          │
│      Always test cart addition, checkout, payment, tracking, and build │
│      correctness before marking a client site ready for launch.        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```
