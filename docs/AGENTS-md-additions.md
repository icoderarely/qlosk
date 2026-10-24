# Add this to the end of your AGENTS.md

Your repo has an `AGENTS.md` from create-next-app. Keep what is in it and paste the block below at the end.

Then create a `CLAUDE.md` in the repo root containing only this one line, so Claude Code also reads AGENTS.md:

```text
@AGENTS.md
```

Project rules to append to AGENTS.md:

```text
# Project
QR shop pages for Indian local shops. One permanent QR opens a mobile page with
buttons (call, WhatsApp, Google review, Instagram, Wi-Fi, maps, offer).
Full spec: docs/spec.md. Visual reference: docs/design/. Read the spec before
starting any task and follow its rules.

# Stack
Next.js App Router, TypeScript strict, Prisma + Postgres (Neon), Better Auth with
username and password (sign-up closed, roles in admin_roles table), zod, Tailwind, Vercel.
The app lives in app/ at the repo root. Do not create a src/ folder.

# Conventions
- Business logic in services/*, no Next.js imports there.
- Route handlers and server actions stay thin: validate, call a service, return.
- Themes are CSS-variable token sets in components/shop-page/themes.ts.
  Layouts are components. Fonts are packs. Never add per-shop free-form CSS.
- One ShopPage component serves /s/[slug], the editor preview and /playground.
- QR codes encode /q/<code> only. Never encode the shop page URL.
- Bots are flagged with a reason and kept, never deleted.
- Google review button is one plain link. No rating gating, no rewards,
  no AI-written reviews.
- Admin login is at /admin-login. Signed-out visits to /admin/* redirect there; signed-in
  visits to /admin-login redirect to /admin. Check session and role on the server in
  every admin layout and server action, never only in the proxy or middleware.
- Never store raw IPs. Salted daily hash only. No cookies on public pages.
- Accessibility: real buttons and labels, visible focus, 4.5:1 contrast,
  44px touch targets.

# Workflow
- Work one slice at a time from section 9 of docs/spec.md.
- Run typecheck, lint and tests before saying a slice is done.
- Commit after each slice with a clear message.
- If the spec and the design files disagree, ask instead of guessing.
```
