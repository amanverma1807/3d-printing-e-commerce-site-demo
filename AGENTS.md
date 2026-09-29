# AGENTS.md — PrintVeda Development Instructions

## 1. PROJECT RULE

PrintVeda is a real production e-commerce website for a 3D-printing business.

Treat this as a production project, not a demo, prototype, or generic template.

Primary goals:
- Premium product presentation
- Strong visual identity
- Excellent UX
- Reliable functionality
- Responsive design
- Accessibility
- Performance
- Maintainable code

Never sacrifice existing business functionality merely for visual changes.

---

# 2. REQUIRED SKILLS & DESIGN REFERENCES

## IMPORTANT

Before performing ANY frontend/design/UI task, you MUST inspect and use the relevant installed frontend skills and design references available in the project.

The project contains:
- installed frontend skills
- `.design-references/`
- multiple `DESIGN.md` design-system references

These resources are authoritative design references for this project.

DO NOT ignore them.

DO NOT rely only on your general knowledge of UI design when relevant project references exist.

---

## 2.1 Inspect Available Skills

Before starting a frontend task:

1. Identify the installed skills relevant to the task.
2. Read their instructions.
3. Follow their recommendations where applicable.
4. Use the appropriate skill for:
   - UI/UX design
   - frontend implementation
   - responsive design
   - accessibility
   - visual QA
   - typography
   - interaction design
   - component architecture
   - performance
   - design-system work

If multiple skills are relevant, use all relevant skills rather than choosing only one.

Do not install duplicate skills unnecessarily.

---

## 2.2 Inspect `.design-references/`

Before any significant UI redesign:

1. Inspect `.design-references/`.
2. Identify the most relevant `DESIGN.md` references for the task.
3. Read the relevant references before designing.
4. Extract useful principles from them.
5. Apply those principles to PrintVeda's own identity.

Relevant reference categories may include:

- Apple
- Tesla
- Linear
- Raycast
- Vercel
- Supabase
- Stripe
- Shopify
- Nike
- Airbnb
- other relevant design systems present in the repository

Use references as inspiration and design principles.

NEVER copy another company's website directly.

---

# 3. PRINTVEDA DESIGN PHILOSOPHY

PrintVeda's design direction is:

## Precision & Craft

The visual identity should combine:

- technical precision
- manufacturing
- craftsmanship
- premium product presentation
- editorial whitespace
- modern industrial character

PrintVeda should feel like a premium physical-product brand.

It should NOT look like:
- a generic Tailwind template
- a default Shopify store
- a SaaS dashboard
- an AI-generated landing page
- a generic "3D printing" website

---

# 4. DESIGN PRINCIPLES

## Product First

The actual 3D-printed product is the visual hero.

Prioritize:
- product imagery
- silhouette
- material appearance
- scale
- whitespace
- product details
- clear pricing

Never unnecessarily crop the product.

Prefer `object-contain` when product geometry requires it.

---

## Intentional Geometry

Do NOT apply one border-radius rule globally.

Do NOT blindly replace:

`rounded-lg → rounded-none`

or:

`rounded-full → rounded-none`

Geometry must have intent.

Use:
- sharp corners for structural/architectural elements
- subtle radius where appropriate
- circular shapes when their meaning is circular
- pills for counters or appropriate controls
- restrained radius for product surfaces when visually appropriate

Never zero all radius tokens globally.

---

## Typography

Typography must have hierarchy.

Use:
- strong display typography
- readable body text
- restrained metadata
- tabular numbers for prices/specifications when useful
- intentional tracking

Do NOT force uppercase everywhere.

Do not make every button or label `uppercase`.

Typography should communicate precision without becoming aggressive or difficult to read.

---

## Color

Prefer:
- deep obsidian
- warm off-white
- neutral grays
- restrained borders
- subtle accent usage

Maintain a subtle warm undertone where appropriate.

Avoid:
- unnecessary purple gradients
- excessive neon colors
- generic SaaS gradients
- excessive visual effects

Product imagery can provide the strongest visual color.

---

## Borders & Shadows

Use borders intentionally.

Prefer:
- thin structural borders
- hairline-like dividers where appropriate
- whitespace for hierarchy

Avoid:
- excessive shadows
- floating-card-everything design
- cards inside cards inside cards

Depth should primarily come from:
- spacing
- typography
- contrast
- imagery
- structural lines

---

# 5. DESIGN REFERENCES MUST INFLUENCE THE SYSTEM

When studying references, extract principles rather than copying layouts.

### Apple / Tesla

Use for:
- product presentation
- whitespace
- physical-product focus
- premium visual hierarchy
- restrained interaction

### Linear / Raycast / Vercel / Supabase

Use for:
- typography
- spacing
- precision
- information density
- interface structure
- restrained surfaces

### Stripe / Shopify

Use for:
- e-commerce UX
- checkout clarity
- product discovery
- pricing hierarchy
- conversion-oriented layouts

Combine principles from multiple references into an original PrintVeda system.

---

# 6. RESPONSIVE DESIGN

Every frontend change must work across:

- mobile
- tablet
- desktop
- large desktop

Design mobile intentionally.

Never simply shrink desktop layouts.

Pay attention to:
- touch targets
- navigation
- product grids
- product galleries
- filters
- checkout
- typography
- section spacing
- horizontal overflow

Minimum practical touch target:
~44px where appropriate.

---

# 7. ACCESSIBILITY

Maintain:

- semantic HTML
- correct heading hierarchy
- keyboard navigation
- visible focus states
- sufficient contrast
- accessible labels
- meaningful alt text
- accessible form controls
- reduced-motion consideration

Do not sacrifice accessibility for aesthetics.

---

# 8. PERFORMANCE

Prefer lightweight solutions.

Use:
- Astro
- Tailwind
- CSS transitions
- existing utilities
- existing project architecture

Avoid unnecessary:
- animation libraries
- dependencies
- JavaScript
- scroll effects
- expensive visual effects

Do not add GSAP/Framer Motion/etc. unless there is a clear, documented reason.

---

# 9. EXISTING FUNCTIONALITY IS SACRED

Frontend redesigns MUST preserve existing functionality.

Do not break:

- Supabase catalog
- category fetching
- product fetching
- admin-managed hero slides
- admin-managed category images
- cart state
- cart reconciliation
- product variants
- quantities
- Add to Cart
- Buy Now
- shop filtering
- shop sorting
- checkout validation
- Razorpay
- payment verification
- order creation
- order confirmation
- admin authentication
- admin dashboard

A visual task should not modify backend behavior.

---

# 10. BACKEND / DATABASE / PAYMENT SAFETY

NEVER modify the following during a frontend-only task unless explicitly requested:

- Supabase schema
- RLS policies
- Edge Functions
- Razorpay architecture
- payment verification
- server-side price validation
- order creation logic
- authentication architecture

Never expose secrets.

Never put:
- Razorpay secret
- Supabase service-role key
- webhook secret

into client-side code.

---

# 11. ADMIN-MANAGED CONTENT

Hero slides and category images are controlled from the admin system.

Frontend designs must support arbitrary admin-uploaded imagery.

Hero designs must work with:
- dark images
- light images
- colorful images
- technical images
- photographic images

Always maintain text readability using appropriate overlays or layout.

Never assume one fixed hero image.

---

# 12. CONTENT INTEGRITY

Never invent business claims.

Do NOT fabricate:
- manufacturing precision
- layer height
- material specifications
- certifications
- delivery guarantees
- customer counts
- review counts
- production statistics
- technical tolerances
- quality percentages

If information is not present in the project data, either:
- omit it, or
- use clearly generic non-factual descriptive copy.

---

# 13. COMPONENT REUSE

Prefer reusable components.

Before creating a new component:

1. Check whether an existing component can be reused.
2. Check whether the component should be improved instead.
3. Avoid duplicate implementations.

Shared visual primitives should remain consistent across:
- buttons
- inputs
- cards
- badges
- product layouts
- navigation
- forms

---

# 14. DO NOT OVER-DESIGN

Premium does NOT mean:

- excessive animations
- huge gradients
- glassmorphism everywhere
- giant rounded cards
- excessive shadows
- floating elements everywhere
- unnecessary parallax
- dozens of decorative elements

Every visual element should have a purpose.

When in doubt:
choose clarity, hierarchy, whitespace, and product focus.

---

# 15. BEFORE IMPLEMENTATION

For significant frontend tasks:

1. Inspect the current implementation.
2. Inspect relevant skills.
3. Inspect relevant `.design-references/DESIGN.md` files.
4. Understand existing functionality.
5. Identify reusable components.
6. Create a design/implementation plan.
7. Identify regression risks.
8. Only then implement.

Do not immediately start changing files without understanding the existing system.

---

# 16. AFTER IMPLEMENTATION

Always run appropriate validation.

At minimum for significant frontend changes:

```bash
npm run build