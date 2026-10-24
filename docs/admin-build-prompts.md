# Admin panel: setup, Better Auth, and prompts for slices 3 to 9

## 0. Environment variables

Create `.env.local` in the repo root (it must be in `.gitignore`). Claude Code should also write `.env.example` with the same names and empty values.

```text
DATABASE_URL=         # Neon pooled connection string
DIRECT_URL=           # Neon direct (non-pooled) string, used by Prisma migrations
BETTER_AUTH_SECRET=   # random string, 32+ characters (openssl rand -base64 32)
BETTER_AUTH_URL=http://localhost:3000
ADMIN_USERNAME=       # your login name, used only by the seed script
ADMIN_PASSWORD=       # a long password, used only by the seed script
```

Run the seed script once, then delete `ADMIN_PASSWORD` from `.env.local`. When you deploy, set the same variables in Vercel with `BETTER_AUTH_URL` set to the live domain, use a different, long password for production, and run the seed once against the production database.

Later slices add: `CLOUDINARY_URL`, `QR_BASE_URL`, `IP_HASH_SALT`, `CRON_SECRET`, `WHATSAPP_NUMBER`. Claude Code will tell you when a slice needs one.

## 1. Does the first prompt build the whole admin panel?

No. Slice 1 builds the login, the sign-in protection, and the admin shell (collapsible sidebar, profile, Log out) with placeholder pages. Each admin page is built in its own later slice, below. The order matters because later pages depend on earlier data: the editor needs the ShopPage component, QR assignment needs shops, reports need tracking.

| Admin page | Built in slice |
| --- | --- |
| Login at /admin-login, shell, sidebar | 1 |
| Shops list | 4a |
| Shop editor: Details, Buttons | 4b |
| Shop editor: Look, live preview, publish | 4c |
| QR codes page, editor QR tab, Offers and Wi-Fi, Activity | 5 |
| Overview, Reports, Onboarding | 8 |
| Billing, Settings | 9 |

## 2. Better Auth: how it works here

- Packages: `better-auth` with the Prisma adapter. Username and password only (Better Auth's username plugin). No Google, no social login.
- Sign-up is closed. Nobody can create an account from the website. The owner account comes from the seed script; later accounts are created by the owner in Settings (slice 9).
- Better Auth creates its own tables (`user`, `session`, `account`, `verification`). Generate them with its CLI into the Prisma schema, then migrate. Our `admin_roles` table (user_id, role) adds the role: owner, admin or viewer.
- Routes:
  - `/admin-login` is the login page. It lives outside `/admin`.
  - Signed out and opening any `/admin/...` page: redirect to `/admin-login`.
  - Signed in and opening `/admin-login`: redirect to `/admin`.
  - Log out: go back to `/admin-login`.
- Where the session is checked: on the server, in `app/admin/layout.tsx` and in every server action, through one helper, `requireRole('admin')` in `lib/auth`. Middleware may add a fast redirect, but is never the only check.
- Login form: one error message for any failure ("Wrong username or password"), rate limiting on the sign-in route, secure and httpOnly session cookie, a disabled state while submitting.
- `/admin-login` is not a secret. Anyone can find it, so the protection is the long password, closed sign-up, rate limiting and the server checks. The unusual address only reduces noise.
- Better Auth's API changes between versions. Claude Code must read the current docs before writing code, not rely on memory.

### Correction prompt for the session that is already running

Paste this if it already started with Auth.js or Google sign-in:

```text
Change of plan on auth: use Better Auth with username and password only, no
Google and no Auth.js. Remove any Auth.js or Google sign-in code, packages and env
vars you added. Read the current Better Auth docs first. Use better-auth with the
Prisma adapter and its username plugin. Disable public sign-up. Generate Better
Auth's tables with its CLI into the Prisma schema and migrate. Replace the
admin_users table with admin_roles (user_id, role: owner, admin, viewer).
Write a seed script that creates the owner from ADMIN_USERNAME and ADMIN_PASSWORD
and gives it the owner role.
Routes: the login page is /admin-login (outside /admin). A signed-out visit to any
/admin page redirects to /admin-login. A signed-in visit to /admin-login redirects
to /admin. Log out returns to /admin-login. Check the session and role on the server
in app/admin/layout.tsx and in every server action through one helper,
requireRole(); do not rely on middleware alone. Login form: one generic error
message, rate limiting on sign-in. Env vars: DATABASE_URL, DIRECT_URL,
BETTER_AUTH_SECRET, BETTER_AUTH_URL, ADMIN_USERNAME, ADMIN_PASSWORD. Update
.env.example. The login screen in docs/design/AdminApp.dc.html shows a Google
button; use a username and password form instead. Then continue with slices 1 and 2.
```

## 3. How to run the slices without breaking things

- One slice per session. Finish, run the checks, commit, then start the next prompt (use `/clear` or a new session).
- Every prompt below ends with the same rule: do not change files outside the slice unless a bug forces it, and say so if you do.
- Before each slice, check that `git status` is clean. If a slice goes wrong, `git reset --hard` to the last commit and try again with a tighter prompt.
- Open the page and click through it before moving on. "Typecheck passes" does not mean the page works.

## 4. Prompts

All prompts assume the first line: `Read AGENTS.md, docs/spec.md and docs/design/.`

### Slice 3: Playground

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 3 only: /playground, as in section 6 of the spec.
- Reuse the ShopPage component from slice 2. Do not copy it.
- Pickers for theme, layout and font, a shop-type switcher with suggested looks,
  a "Your shop name" input, and the WhatsApp button with a pre-filled message.
- Look is stored in the URL query and rendered on the server from it.
- Put the interactive part in one client component, PlaygroundSection, that takes
  no required props, so the landing page can embed it later.
- Sample data is fake. No database writes.
Done when: a copied URL reopens the same look, pickers work by keyboard, and the
page works at 320 px. Run typecheck, lint, build, then commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 4a: Shops list

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 4a only: /admin/shops, matching the Shops page in docs/design/AdminApp.dc.html.
- services/shops.ts: list, search, filter (status, type, theme, layout, plan),
  paginate (8 per page), bulk update of theme, layout, font.
- Status tabs with counts, search box, filter dropdowns, checkbox column with a
  bulk bar, Look column ("Blush · List"), Edit button linking to
  /admin/shops/[id].
- Add a seed script with 12 fake shops across statuses and looks so the page has data.
- Bulk actions are server actions that call requireRole('admin') and write
  change_log rows.
Done when: filters and search work, bulk change updates the Look column, a viewer
cannot run a bulk action. Add tests for the service. Run checks, then commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 4b: Shop editor, Details and Buttons

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 4b only: /admin/shops/new and /admin/shops/[id] with the editor header,
the tab bar, and the Details and Buttons tabs, matching docs/design/AdminApp.dc.html.
- Draft and publish: edits save to the draft row of shop_pages; Publish copies
  draft to published. Header shows Unpublished changes when they differ.
- Details: business fields, contact and links, logo and cover upload through
  services/storage.ts (images only, size limit), owner and notes (internal).
- Buttons: list with reorder, on/off switch, edit, add button by type. Validate
  link targets with zod: only https, tel and wa.me.
- Slug is generated from the name, editable, unique; changing it writes slug_history.
- Every save writes change_log.
Leave the Look, Offers and Wi-Fi, QR and plan, and Activity tabs as "Coming soon"
cards. Leave the preview column empty for now.
Done when: you can create a shop, edit it, reload and see the draft, and publish.
Add tests for slug uniqueness, slug history and link validation. Run checks, commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 4c: Look tab, live preview, public page

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 4c only: the Look tab, the live preview column, and /s/[slug].
- Look tab: theme cards, layout cards with wireframes, font cards, button color
  override, page language chips, Reset to suggested look. Respect the enabled
  themes and layouts from settings (default: all on).
- Live preview: the real ShopPage inside the phone frame, scaled 0.85, reading the
  unsaved form state so it updates as you click.
- Block a button color override that fails 4.5:1 contrast and show why.
- /s/[slug]: server-rendered published page using ShopPage; old slugs 301 to the
  new one; unknown slug shows a plain not-found page. Keep client JavaScript
  small.
Done when: changing the look updates the preview instantly, Publish changes
/s/slug, and an old slug redirects. Add tests for contrast checking and slug
redirect. Run checks, commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 5: QR codes, redirects, and the editor's remaining tabs

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 5 only.
- services/qr.ts: generate a batch of 6-character codes (alphabet without 0 O 1 I L),
  assign, reassign, retire. Never reuse a retired code.
- /admin/qr page per the design: stats, table with filters, generate batch panel.
- /q/[code]: log a scan, 302 to /s/[slug]; unassigned code shows a friendly
  "not activated yet" page with the WhatsApp number from settings.
- /r/[code]/[linkId]: verify the signed token, log the tap, 302 to the target.
  Tokens are issued when the shop page renders. Store ip_hash with a daily-rotating
  salt (IP_HASH_SALT); never store raw IPs.
- Shop editor tabs: QR and plan (assign or reassign, slug, pause, archive),
  Offers and Wi-Fi (offer, festival banner, Wi-Fi), Activity (change_log with Undo
  for simple changes, traffic summary).
Do not build bot filtering yet; log everything with is_bot = false.
Done when: assigning a code to a shop and opening /q/code lands on the shop and
shows a scan row; a tap logs a click row. Add tests for code generation and
reassignment. Run checks, commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 6: Print files

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 6 only.
- services/print.ts: an A5 (148 x 210 mm) PDF with 3 mm bleed, the shop name,
  logo, a vector QR (error correction Q, quiet zone at least 4 modules, at least
  30 x 30 mm) encoding QR_BASE_URL/q/<code>. Also a 4x6 inch card and a PDF sheet of
  unassigned codes for the chosen sticker size.
- Wire the download buttons in the editor QR tab and in /admin/qr.
- Fonts embedded in the PDF. The QR must be vector, not an image.
Done when: the A5 PDF opens at the right size, and a printed or on-screen copy scans
from 1 m. Add a test that the encoded URL is exactly QR_BASE_URL/q/<code>. Run checks,
commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 7: Bot filtering and rollups

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 7 only, as in section 7 of the spec.
- services/tracking.ts: crawler check (isbot plus preview agents), ignore HEAD and
  prefetch, missing-token flag, 30-second duplicate rule, per-minute rate limit,
  hourly spike detection. Flag with bot_reason; never delete.
- Wire it into /q and /r.
- /api/cron/daily-stats rebuilds daily_stats for the last two days, protected by
  CRON_SECRET. Add the Vercel cron entry.
- Settings switches for each rule (read from settings, default on).
Done when: a curl with a bot user agent is stored with is_bot = true and reason
crawler, a normal browser scan is counted, and the cron fills daily_stats. Add tests
for every rule. Run checks, commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 8: Overview, Reports, Onboarding

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 8 only: /admin, /admin/reports and /admin/onboarding, matching the design.
- Read numbers from daily_stats only, never from raw events. Counted numbers
  exclude flagged events.
- Overview: KPIs, scans chart, most used buttons, needs attention, recent shops.
- Reports: KPIs, by-shop table, traffic quality card by reason, unusual traffic card
  with Count them and Mark as bots, monthly report preview, CSV download.
- Onboarding: columns Lead, Building, Preview sent, Printing, Live this week. Add a
  stage field to shops if needed. Cards move between columns with a button menu
  (no drag-only interaction).
Done when: numbers match a hand count from the seeded events and a spike shop is held
out of the monthly report until reviewed. Run checks, commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```

### Slice 9: Billing and Settings

```text
Read AGENTS.md, docs/spec.md and docs/design/.
Build slice 9 only: /admin/billing and /admin/settings, matching the design.
- Billing: plan counts, renewals table with Remind, Call, Mark as paid; plan
  prices stored in plans.price_paise and editable. No payment gateway yet.
- Plan expiry job: after plans end, the page stays live 15 days, then shows only the
  shop name, a Call button and Directions. Add a daily cron for it.
- Settings: team accounts (owner creates an account with username and a temporary
  password, sets the role, can reset a password or remove a user; the owner account
  cannot be removed), enabled themes and layouts, suggested look by shop type, traffic
  filtering switches, QR domain and WhatsApp number.
Done when: removing a team account blocks that user on their next request, and an
expired test shop renders the reduced page. Add tests for expiry and team accounts. Run checks, commit.
Do not change files outside this slice unless a bug forces it; say so if you do.
```
