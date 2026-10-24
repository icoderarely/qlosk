# First Claude Code prompt (slices 1 and 2)

Before pasting: unzip into the repo root so `docs/` sits next to `app/`, and append `docs/AGENTS-md-additions.md` to `AGENTS.md` and create a one-line `CLAUDE.md` containing `@AGENTS.md`. Then start Claude Code in the repo and paste:

```text
Read AGENTS.md, docs/spec.md and the files in docs/design/.

Build slices 1 and 2 from section 9 of the spec. Do not start slice 3.
The Next.js app already exists with app/ at the repo root. Keep that layout.

Slice 1, foundation:
- Add Tailwind if it is not already set up.
- Add Prisma with the schema from section 4 of the spec and an initial
  migration. Use a DATABASE_URL env var for Neon. Add .env.example.
- Add Better Auth (Prisma adapter) with username and password sign-in only (use its
  username plugin; read the current Better Auth docs first). Public sign-up must be
  disabled. Add an admin_roles table (user_id, role: owner, admin, viewer).
- Add a seed script that creates the owner account from ADMIN_USERNAME and
  ADMIN_PASSWORD env vars and gives it the owner role.
- Build the admin shell from docs/design/AdminApp.dc.html: the login page at
  /admin-login (username and password form, not the Google button shown in the design),
  and the collapsible sidebar (232 px open, 76 px rail) with Overview, Shops, QR codes,
  Onboarding, Reports, Plans and billing, Settings, plus the profile block and
  Log out. Use the teal accent #0F6B5C and the neutrals from Colors.dc.html.
  Each page can be a placeholder heading for now.
- Auth flow: a signed-out visit to any /admin page redirects to /admin-login; a
  signed-in visit to /admin-login redirects to /admin; Log out returns to /admin-login.
  Check the session and role on the server in app/admin/layout.tsx and in every server
  action through one helper, requireRole(). Do not rely on middleware alone.
- Login form: generic error ("Wrong username or password"), rate limit the sign-in
  route, show a disabled state while submitting.

Slice 2, ShopPage component:
- Build components/shop-page/ with 5 themes, 5 layouts and 3 fonts exactly
  as in section 5 and docs/design/ShopPage.dc.html. Props: theme, layout, font,
  shop, links, offer, wifi, banner.
- Put a temporary page at /dev/shop-page that shows every theme and layout
  combination in a grid, using the sample shop from the design file.

When done: run typecheck, lint and a build; list anything in the design you
could not match; then commit. Ask me before adding any dependency that is not
in the stack table.
```

After slice 2, compare `/dev/shop-page` with the design boards. If it matches, ask for slice 3 (the playground) and continue down section 9 of the spec.

Note: the `.dc.html` files in `docs/design/` are design source files. Claude Code reads them as text for markup, spacing and colors. They are not meant to be opened in a browser.
