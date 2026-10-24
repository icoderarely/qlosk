# Landing page prompt

Use this after slice 3 (playground) is done. If it is not done yet, the prompt builds the playground section too.

```text
Read AGENTS.md, docs/spec.md (sections 6 and 10) and docs/design/LandingV2.dc.html.
Build the landing page at / exactly as section 10 of the spec and the design file.

- One page, server-rendered. Small client components only for: the navbar (scroll
  shrink and mobile menu), the playground, and the FAQ accordion.
- Reuse components/shop-page/ShopPage for the hero phone, the five gallery phones and
  the playground preview. Do not copy it.
- Reuse PlaygroundSection from slice 3. If it does not exist yet, build it to section 6
  first, as a standalone component also used by /playground.
- Put each section in its own component under components/landing/ (Navbar, Hero,
  MadeFor, Problem, Looks, HowItWorks, Features, Report, Pricing, Trust, Faq,
  ClosingCta, Footer) and compose them in app/page.tsx.
- Colors and fonts as listed in section 10: add them as CSS variables or Tailwind theme
  tokens, not one-off hex codes in components.
- Navbar: wide at the top, shrinks after scrolling using a CSS scroll-driven animation
  inside @supports; hamburger menu under 900 px, closes on link tap and Escape.
- Pricing reads plans from the database through services/plans.ts. Add
  compare_at_paise (nullable) to plans with a migration. Seed 1 month 29900
  (compare_at 39900 only if I confirm), 6 months 119900 (compare_at 179400), 1 year
  199900 (compare_at 358800). Yearly card in the middle, first on phones.
- WhatsApp links use the number from settings (placeholder until set).
- Mobile: follow the design's under-600 px rules: hero art scales to fit, playground
  preview first with options in scrollable rows, steps as compact rows, two-column
  features. No horizontal page scroll at 360 px.
- Respect prefers-reduced-motion.

When done: run typecheck, lint and a build; check the page at 1440, 1024, 768, 390 and
360 px wide and fix anything that overflows; list anything you could not match; commit.
Do not change admin files.
```
