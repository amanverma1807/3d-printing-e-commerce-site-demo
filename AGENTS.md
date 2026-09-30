# AGENTS.md — Master E-Commerce Template Development Instructions

## 1. PROJECT RULE

This repository is a production-ready, reusable e-commerce template engineered for multi-client deployment.

Treat this as a production project, not a demo, prototype, or toy site.

Primary goals:
- Premium product presentation
- Strong visual identity
- Excellent UX
- Reliable functionality
- Responsive design
- Accessibility
- Performance
- Maintainable code
- Clean client-reusability

Never sacrifice existing business functionality merely for visual changes.

---

# 2. REQUIRED SKILLS & DESIGN REFERENCES

## IMPORTANT

Before performing ANY frontend/design/UI task, inspect and use the relevant installed frontend skills and design references available in the project.

The project contains:
- installed frontend skills in `.agents/skills/`
- `.design-references/`
- multiple `DESIGN.md` design-system references

These resources are authoritative design references for this project.

DO NOT ignore them. DO NOT rely only on generic default UI patterns when relevant project references exist.

---

## 2.1 Inspect Available Skills

Before starting a frontend task:
1. Identify the installed skills relevant to the task.
2. Read their instructions.
3. Follow their recommendations where applicable.
4. Use the appropriate skill for UI/UX, responsive design, accessibility, performance, and design systems.

---

## 2.2 Inspect `.design-references/`

Before any significant UI redesign:
1. Inspect `.design-references/`.
2. Identify the most relevant `DESIGN.md` references for the task (Apple, Tesla, Linear, Raycast, Vercel, Supabase, Stripe, Shopify, Nike).
3. Extract useful principles from them and apply those principles to the store's identity.

NEVER copy another brand's website directly. Extract principles rather than copying layouts.

---

# 3. DESIGN PHILOSOPHY

The template's default aesthetic direction is:

## Precision & Craft

The visual identity combines:
- technical precision
- craftsmanship
- premium product presentation
- editorial whitespace
- modern tactile character

The store should feel like a premium physical-product brand.

It should NOT look like:
- a generic Tailwind template
- a default low-effort store
- a SaaS dashboard
- an AI-generated landing page

---

# 4. DESIGN PRINCIPLES

## Product First
The actual physical product is the visual hero.
Prioritize:
- product imagery
- silhouette
- material appearance
- scale
- whitespace
- product details
- clear pricing

Never unnecessarily crop the product. Prefer `object-contain` when product geometry requires it.

---

## Intentional Geometry
Do NOT apply one border-radius rule globally.
Do NOT blindly replace:
`rounded-lg → rounded-none` or `rounded-full → rounded-none`

Geometry must have intent:
- sharp corners for structural/architectural elements
- subtle radius where appropriate
- circular shapes when their meaning is circular
- pills for counters or appropriate controls
- restrained radius for product surfaces

Never zero all radius tokens globally.

---

## Typography
Typography must have clear hierarchy:
- strong display typography
- readable body text
- restrained metadata
- tabular numbers for prices/specifications
- intentional tracking

Do NOT force uppercase everywhere. Do not make every button or label uppercase.

---

## Color
Prefer:
- deep obsidian
- warm off-white
- neutral grays
- restrained borders
- subtle accent usage

Maintain a subtle warm undertone where appropriate.
Avoid unnecessary purple gradients, excessive neon colors, and generic SaaS gradients.

---

## Borders & Shadows
Use borders intentionally:
- thin structural borders
- hairline-like dividers where appropriate
- whitespace for hierarchy

Avoid excessive shadows, floating-card-everything layouts, or cards inside cards inside cards.

---

# 5. RESPONSIVE DESIGN

Every frontend change must work across mobile, tablet, desktop, and large desktop screens.
Design mobile intentionally; never simply shrink desktop layouts.
Minimum practical touch target: ~44px where appropriate.

---

# 6. ACCESSIBILITY

Maintain:
- semantic HTML
- correct heading hierarchy
- keyboard navigation
- visible focus states
- sufficient contrast
- accessible labels and meaningful alt text
- accessible form controls
- reduced-motion consideration

---

# 7. PERFORMANCE

Prefer lightweight solutions:
- Astro SSR
- Tailwind CSS
- CSS transitions
- existing utilities

Avoid unnecessary animation libraries, heavy dependencies, or expensive visual effects.

---

# 8. EXISTING FUNCTIONALITY IS SACRED

Frontend changes MUST preserve existing functionality:
- Supabase catalog fetching
- category fetching
- product fetching
- admin-managed hero slides
- admin-managed category images
- cart state & local reconciliation
- product variants & quantities
- Add to Cart & Buy Now
- shop filtering & sorting
- checkout validation & guest checkout
- Razorpay payment verification
- order creation & order confirmation
- order tracking & guest cancellation
- admin authentication & dashboard

A visual or template task must not break backend or e-commerce flows.

---

# 9. BACKEND / DATABASE / PAYMENT SAFETY

NEVER modify the following during a frontend-only task:
- Supabase schema
- RLS policies
- Edge Functions
- Razorpay architecture
- payment verification
- server-side price validation
- order creation logic
- authentication architecture

Never expose secrets:
- Razorpay secret key
- Supabase service-role key
- webhook secret

Must NEVER be put into client-side code or git.

---

# 10. CENTRALIZED CONFIGURATION

All client-specific brand metadata, contact details, social links, currency, shipping rates, and legal dates must be sourced from:

`src/config/site.ts`

Never hardcode new client names, phone numbers, emails, or domains directly into page markup.

---

# 11. AFTER IMPLEMENTATION

Always run appropriate validation:

```bash
npm run build
```