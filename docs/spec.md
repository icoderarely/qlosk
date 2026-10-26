# Qlosk: Build Spec

Visual reference: `docs/design/` (ShopPage, AdminApp, LandingV2, Standee, Logo, Colors). The product is called Qlosk (qlosk.com). Where this spec and the design files disagree, ask.

## 1. What we are building

A done-for-you service for local shops in India. One permanent QR code opens a mobile page with Call, WhatsApp, Google review, Instagram, Wi-Fi, Maps and an offer. We build each page, print the standee, and send the owner a monthly scan report. One admin app manages every shop, its look, its QR code and its renewals.

**v1 includes**

- Public shop page with 5 themes, 5 layouts and 3 fonts, switchable per shop.
- Permanent QR codes (`/q/code`) that can be reassigned, with scan logging.
- Admin app: login, overview, shops list, shop editor with live preview, QR codes, onboarding board, reports, plans and billing, settings.
- Public `/playground` page where anyone can try the looks. It later becomes a section of the landing page.
- Standee designer per shop (3 designs, light colours, A5 or A4) with a live preview and print PDF and PNG downloads, plus a printable sheet of unassigned codes. See section 11.
- Tracking with bot filtering. Bots are flagged and kept, never deleted.

**v1 leaves out**

- Owner self-serve login. The owner asks on WhatsApp and we make the change.
- Online payment. Billing is tracked by hand first; Razorpay comes after the first paying shops.
- Automated WhatsApp reports. v1 shows the report in admin and lets us send it by hand.
- Landing page. It comes last and reuses the playground.

## 2. Stack and repo layout

One Next.js app does everything for v1. Business logic lives in `services/` with no Next.js imports, so it can move into NestJS later.

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js (App Router), TypeScript strict | One deploy for pages, admin and API |
| Database | Postgres on Neon | Relational data and reporting; plain Postgres moves to AWS RDS later |
| ORM | Prisma | Typed queries, easy migrations |
| Admin auth | Better Auth, username and password | Sign-up is closed; accounts are created by the owner only |
| Validation | zod | Shared by forms and route handlers |
| Files | Cloudflare R2 or Vercel Blob | Logos and covers; behind one storage service |
| Hosting | Vercel | Cron jobs for daily stats and reminders |
| Payments | Razorpay (later) | After v1 |

The repo already exists as a plain `create-next-app` project with `app/` at the root and no `src/`. Keep that: do not add a `src/` folder.

```text
/
  AGENTS.md  CLAUDE.md (one line: @AGENTS.md)
  docs/spec.md  docs/design/
  prisma/schema.prisma
  app/
    (public)/s/[slug]/page.tsx             public shop page
    (public)/q/[code]/route.ts             scan log, then 302
    (public)/r/[code]/[linkId]/route.ts    tap log, then 302
    (public)/playground/page.tsx           try the looks
    admin/...                              all admin pages
    api/cron/...                           daily rollup, reminders
  components/
    shop-page/                             ShopPage, layouts, themes, fonts
    admin/                                 shell, tables, editor tabs
  services/                                shops, links, qr, tracking, reports, plans, storage
  lib/                                     db client, auth, zod schemas, utils
```

Route handlers and server actions stay thin: validate input, call a service, return.

## 3. Routes

The QR code always encodes `/q/code`, never the shop page. That lets us count scans, reassign a code to another shop, and rename a shop's address without reprinting.

**Public**

| Route | What it does |
| --- | --- |
| `/s/[slug]` | Renders the published shop page. Old slugs forward to the new one. |
| `/q/[code]` | Logs the scan, then 302 to `/s/[slug]`. An unassigned code shows a friendly "not activated yet" page and a retired code a "no longer in use" page (`/code-retired`); both show our WhatsApp contact and a "Visit Qlosk" link to the main site. |
| `/r/[code]/[linkId]` | Logs a button tap with a signed token, then 302 to the real target. |
| `/` | Landing page (section 10). |
| `/playground` | Public page to try themes, layouts and fonts on a sample shop. Same section the landing page embeds. |

**Admin** (behind Better Auth username and password login)

| Route | Page |
| --- | --- |
| `/admin-login` | Username and password sign-in. Lives outside `/admin`. Signed-in users who open it go to `/admin`. Anyone not signed in who opens any `/admin/...` page is redirected here. |
| `/admin` | Overview: KPIs, scans chart, top buttons, needs attention, recent shops |
| `/admin/shops` | List with status tabs, search, filters, bulk change of theme, layout, font |
| `/admin/shops/new`, `/admin/shops/[id]` | Shop editor: tabs Details, Buttons, Look, Offers and Wi-Fi, Standee, QR and plan, Activity, Quick setup (the first tab for a new shop), plus live preview |
| `/admin/shops/[id]/standee.pdf`, `.png` | Server-generated standee downloads for that shop (role-checked) |
| `/admin/qr` | Code stock, generate a batch, print sheet, assign and reassign. Each assigned code has a "Standee" button that opens that shop's Standee tab. |
| `/admin/onboarding` | Board: Lead, Building, Preview sent, Printing, Live this week |
| `/admin/reports` | KPIs, by-shop table, traffic quality, spike review, monthly report |
| `/admin/billing` | Plan counts, renewals, plan prices |
| `/admin/settings` | Team accounts and roles, enabled themes and layouts, suggested look by shop type, traffic filtering, domain and WhatsApp |

## 4. Data model

Postgres holds everything. Raw events stay in the database; daily rollups make reports fast.

| Table | Key fields | Notes |
| --- | --- | --- |
| `shops` | id, slug, name, tagline, shop_type, area, city, address, phone, whatsapp, wa_message, logo_url, cover_url, status, owner_name, owner_whatsapp, notes, standee_design, standee_theme, standee_headline, standee_size, plan_id, plan_started_at, plan_ends_at | status: building, preview, live, quiet, expired, paused, archived |
| `shop_pages` | shop_id, state (draft or published), config JSON, published_at | config = theme, layout, font, button color override, language, offer, banner, wifi. Publish copies draft to published. |
| `print_files` | id, shop_id, kind (pdf, png, sheet), design, theme, size, created_by, created_at, file_url | One row per generated download |
| `slug_history` | shop_id, old_slug | Old addresses keep forwarding |
| `links` | id, shop_id, type, label, target, position, enabled | type: whatsapp, call, google_review, wifi, maps, instagram, facebook, youtube, website, menu, custom |
| `qr_codes` | code, shop_id (nullable), status, batch_id, created_at | 6 characters, no look-alike letters; unassigned codes have no shop |
| `scan_events` | id, code, shop_id, at, ip_hash, ua_family, is_bot, bot_reason | ip_hash is salted and rotates daily |
| `click_events` | id, shop_id, link_id, at, ip_hash, is_bot, bot_reason | Only written through `/r/...` |
| `daily_stats` | shop_id, day, scans, taps, bot_scans, bot_taps, taps_by_link JSON | Rebuilt by the nightly job |
| `plans` | id, name, months, price_paise | Prices are set in admin, not in code |
| `change_log` | id, shop_id, user_email, what, at, undo_payload | Powers the Activity tab and Undo |
| `admin_roles` | user_id (Better Auth user), role | owner, admin, viewer. Better Auth owns the user, session and account tables; this table only adds the role. |
| `settings` | key, value JSON | enabled themes and layouts, defaults by shop type, filtering switches |

After a plan ends the page stays fully live for 15 days, then shows only the shop name, a Call button and Directions.

## 5. Design system: themes, layouts, fonts

A shop's look is three choices plus a few small overrides, stored as JSON in `shop_pages.config`. One `ShopPage` component renders it. The same component powers the live shop page, the editor's live preview and the playground. Copy markup and spacing from `docs/design/ShopPage.dc.html`; it is the visual source of truth.

**Themes** are sets of CSS variables on the page root.

| Theme | bg | card | text | muted | line | button | button text | icon bg | icon fg | chip bg | chip text |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| daylight | `#F3F6FB` | `#FFFFFF` | `#0E1A2B` | `#55607A` | `#DCE3EF` | `#1F4FD1` | `#FFFFFF` | `#E6EDFC` | `#1F4FD1` | `#E6EDFC` | `#1B3FAE` |
| nightfall | `#0F1424` | `#1A2138` | `#F2F4FA` | `#A3ABC2` | `#2C3554` | `#FFB547` | `#1B1303` | `#2A3354` | `#FFB547` | `#2A3354` | `#FFD08A` |
| marigold | `#FFF1D0` | `#FFFDF7` | `#2A1D05` | `#6B5530` | `#EBD9AE` | `#B4540A` | `#FFFFFF` | `#FBE3B0` | `#8F4107` | `#FBE3B0` | `#7A3706` |
| blush | `#FDEFF1` | `#FFFFFF` | `#3A1620` | `#7A4A55` | `#F2D3D9` | `#9F1D45` | `#FFFFFF` | `#FBD9E0` | `#8A1538` | `#FBD9E0` | `#7A1233` |
| graphite | `#F2F1EF` | `#FFFFFF` | `#16181D` | `#5E5C57` | `#DEDBD6` | `#16181D` | `#FFFFFF` | `#E9E7E3` | `#16181D` | `#E9E7E3` | `#2B2A27` |

Cover gradients per theme are in the `ShopPage` design file.

**Layouts** are five components with the same props (shop, links, offer, wifi, banner). Switching layout never changes data.

| Layout | Look |
| --- | --- |
| list | Logo and name on top, stacked button rows in one card |
| tiles | Two-column grid of tiles |
| cover | Cover photo across the top, logo overlapping it, buttons below |
| index | Large numbered text list, editorial feel |
| chat | Buttons shown as a conversation |

If this table and the design file differ, the design file wins.

**Fonts**

| Font | Heading | Body |
| --- | --- | --- |
| editorial | Fraunces | DM Sans |
| clean | DM Sans | DM Sans |
| rounded | Nunito | Nunito |

**Per-shop overrides** are limited on purpose: button color (small palette), page language (English, Hindi, Marathi), offer, festival banner, Wi-Fi block. Nothing else is free-form.

**Rules**

- Button text on button color and body text on background must meet 4.5:1. The editor blocks an override that fails.
- Phone-first at 390 px wide; layouts must not break at 320 px.
- Admins turn themes and layouts on or off in Settings; disabled ones stay available to shops already using them.
- Suggested look by shop type lives in `settings`, not in code.

## 6. Playground page

`/playground` lets a shop owner try every look on a sample shop. It is public, needs no login and writes nothing to the database. Build it as a self-contained section component so the landing page can embed it later.

- A phone frame showing the real `ShopPage` at 390 px, scaled down on small screens.
- Pickers for theme (5 swatch cards), layout (5 small wireframes) and font (3 samples). Changing a picker updates the phone immediately.
- A shop-type switcher (Salon, Clinic, Gym, Cafe, Jeweller) that swaps sample name, tagline and buttons, and selects the suggested look.
- A "Your shop name" input that replaces the sample name.
- A "Get this for my shop" button that opens WhatsApp with a pre-filled message naming the chosen theme, layout and font.
- The look is stored in the URL, for example `?theme=blush&layout=cover&font=editorial&type=salon`, so it can be shared.

Rules: fake sample data only; same enabled themes and layouts as Settings; pickers are real buttons with `aria-pressed`, visible focus and 44 px targets; server-render the first look from the URL; log nothing beyond a plain page view count.

## 7. Tracking, bot filtering and reports

Every request is logged. Bots are flagged with a reason and kept, never deleted.

| Check | Rule | Reason stored |
| --- | --- | --- |
| Crawlers and link previews | `isbot` package plus a small list of WhatsApp and social preview agents | `crawler` |
| Prefetch and HEAD | Ignore `HEAD` and prefetch requests; do not log | none |
| Tap without page token | `/r/...` needs a short-lived signed token issued when the page rendered | `no_token` |
| Repeats | Same ip_hash and target within 30 seconds counts once | `duplicate` |
| Rate limit | Too many requests per ip_hash per minute | `rate_limit` |
| Spikes | Shop scans in one hour far above its normal rate are held for review | `spike_review` |

No CAPTCHA.

**Privacy:** salted hash of the IP, salt rotated daily, never raw IPs; no cookies on public pages; raw events older than 13 months deleted, rollups kept.

**Reports:** a nightly job rebuilds `daily_stats` for the last two days. Admin Reports reads `daily_stats` only. Counted numbers exclude flagged events; a Traffic quality card shows flagged totals by reason. A shop in `spike_review` is left out of the monthly report until an admin chooses Count them or Mark as bots. In v1 the monthly owner report is previewed in admin and sent by hand.

## 8. Rules

**Google review button**

- One plain link to the shop's Google review form, shown to every visitor.
- No rating question first, no routing low ratings to us and high ratings to Google, no rewards for reviews, no AI-written review text. Google's policies ban review gating and incentives.
- Owner feedback, if wanted later, is a separate button not tied to the review button.

**QR and print**

- The QR encodes `https://<domain>/q/<code>` only. Vector output (SVG or PDF), error correction H, white border of at least 2 modules inside a white card (4 modules when printed without a card).
- The Qlosk Q mark sits in the centre of the standee QR codes (section 11). It covers under 10% of the code and is near-black with no background tile. Nothing else is placed on the code and the code is never coloured.
- Before any PDF, PNG or sheet is saved, the server decodes the QR from the rendered output and fails loudly if it does not read back exactly the expected URL.
- Every QR download on `/admin/qr` (`/admin/print/code/<code>`, any code that is not retired) is the trial sticker: a 7 x 7 cm PNG at 600 dpi (1654 px) with the headline "Everything about us, one scan away.", the QR with the Q mark, the Call / Chat / Review / Map / Offers row and "Powered by Qlosk · qlosk.com" with the code as its number. The QR is decoded from the PNG before it is sent. Code: `services/sticker.ts`.
- Several stickers at once: on `/admin/qr` an admin ticks codes (assigned or in stock, not retired) on the page and clicks "Download sticker sheet" (`/admin/print/stickers?codes=A,B,C`, up to 500). The PDF is A4 with 6 stickers per page (2 across x 3 down, each in an 80 mm cell with 5 mm of white around its border so they are not crowded; 2 x 4 is the most that physically fits), with crop marks in the margins on the cell lines, so each cut falls midway between two stickers, and a one-line header and footer. Every QR is read back from the finished PDF before the file is saved or sent, and one `print_files` row (kind sheet, design sticker, size A4x6) is logged. Code: `buildStickerSheet` in `services/sticker.ts`.
- Print file is A5 (148 x 210 mm) with 3 mm bleed (or A4), QR at least 30 x 30 mm (the standee designs print it at about 65 to 80 mm). Also a sheet of unassigned codes.
- Codes are 6 characters from an alphabet without 0, O, 1, I, L. Never reuse a retired code.

**Security**

- Every admin route and server action checks the Better Auth session on the server and the user's role in `admin_roles`. Viewers cannot write.
- Login: sign-up is disabled. Generic error message ("Wrong username or password"), rate limiting on the sign-in route, long session cookies marked secure and httpOnly. `/admin-login` is an unlisted address, not a security measure; the password and the server checks are the protection.
- Validate all input with zod. Link targets allow only `https`, `tel` and `wa.me` URLs.
- Uploads: images only, size limit, re-encoded on the server.
- Secrets only in environment variables; never commit `.env`.

**Quality**

- Mobile first for public pages. Admin works at 1024 px and up and degrades gracefully below.
- Real buttons and labels, visible focus, 4.5:1 contrast, 44 px touch targets, no color-only meaning.
- Public page under 100 KB of JavaScript, server-rendered.
- A test for each service function that carries a rule from this spec.
- No made-up numbers or testimonials anywhere.

## 9. Build order

Vertical slices. Each ends with something clickable and a check.

1. **Foundation.** Prisma schema, Neon, Better Auth username and password, `/admin-login`, admin shell with collapsible sidebar. Done when a signed-out visit to `/admin` redirects to `/admin-login`, a signed-in visit to `/admin-login` redirects to `/admin`, and the sidebar collapses.
2. **ShopPage component.** All 5 themes, 5 layouts, 3 fonts with sample data. Done when `/dev/shop-page` shows every combination and matches the design boards.
3. **Playground.** Pickers, shop-type switcher, URL state, WhatsApp button. Done when a copied URL reopens the same look.
4. **Shops and editor.** List with filters and bulk actions; editor tabs; draft and publish; live preview. Done when you create a shop, change its look, publish, and `/s/slug` shows it.
   - **Quick setup tab.** Paste a Google share or Maps link, an Instagram link and a website. No AI. `GOOGLE_PLACES_API_KEY` is optional. Without it, or when Google refuses it, the name and a directions link come from the pasted link itself (the redirect carries the name; a full Maps link carries the place's cid) and phone, address and review link stay manual. With it, the business is found by name through the Google Places API (New) (server-only) and gives name, address, phone, website, directions link and the review link (`search.google.com/local/writereview?placeid=...`). Instagram and website are read from the pasted URLs. The admin ticks what to apply, nothing is saved until Save draft or Publish, and the logo stays manual. A mobile number is also offered as the WhatsApp number. The default WhatsApp message is written from the customer's side: "Hi {shop}! 👋 I scanned your Qlosk code and wanted to get in touch. Could you help me with some details?" Only Google hosts are followed for redirects.
5. **QR and redirects.** Code generation, assign and reassign, `/q/code`, `/r/...`, logging, unassigned page. Done when a test scan is logged and lands on the shop.
6. **Standee designer and print files.** Standee tab, three designs, live preview, PDF and PNG downloads, unassigned sheet (section 11). Done when a test print scans from 1 m.
7. **Bot filtering and rollups.** Checks from section 7, nightly job. Done when a curl with a bot user agent is flagged and a phone scan is counted.
8. **Overview, Reports, Onboarding** with real numbers.
9. **Billing and Settings.** Plans, renewals, expiry behavior, team accounts, toggles.
10. **Landing page.** As in section 10. Reuses the playground section from slice 3.

## 10. Landing page

Design source: `docs/design/LandingV2.dc.html`. Copy its layout, spacing, colors and copy. It is one long page at `/`, server-rendered, with small client components only where needed (navbar menu, playground, FAQ).

**Palette:** deep teal `#0F6B5C` and a darker teal mixed from it, cream page `#FBF8F2`, near-black `#0D1F1B`, pale yellow `#FBF1B5` for main buttons only, mint tint for icon chips. Fonts: Fraunces for headings, Manrope for text. Do not add other accent colors.

**Sections, in order**

| # | Section | Notes |
| --- | --- | --- |
| 1 | Navbar | Dark floating pill over the hero. Full width at the top; shrinks to about 780 px after 180 px of scroll (CSS scroll-driven animation inside `@supports`, otherwise stays wide). Links: How it works, Looks, Pricing, FAQ, plus a pale-yellow "Let's go" button. Below 900 px: links hide, a hamburger opens a dropdown with the links and a WhatsApp button. Menu closes on link tap and on Escape. |
| 2 | Hero | Rounded teal panel. Headline "One QR for your whole shop.", two buttons (Try a look, Chat on WhatsApp), three check items. Right: phone with the real ShopPage (graphite, list, editorial), floating QR card and two small cards. On phones the art scales down to fit; floating cards hide. |
| 3 | Made for | One line of shop-type pills plus "+ many more". Scrolls sideways on phones, never wraps. |
| 4 | Problem | Dark section, "Your counter has too many codes.", stickers turning into one code. |
| 5 | Looks | Five small phones, one per shop type in its suggested look, and a "Try them on your shop" button to the playground. Scrolls sideways under 1024 px. |
| 6 | How it works | Four steps; the last one highlighted. Compact rows on phones. |
| 7 | Playground | The `PlaygroundSection` from slice 3 (section 6). On phones: preview first, then shop type, theme, layout and font as single scrollable rows. |
| 8 | Features | Eight tiles; four columns, two on tablet and phone. |
| 9 | Monthly report | Text plus a WhatsApp-style card clearly labeled "Sample data". |
| 10 | Pricing | Three cards, yearly in the middle and highlighted ("Best value"); on phones yearly comes first. Prices come from the `plans` table, not hard-coded. |
| 11 | Built to last | Three cards: permanent code, real numbers, honest reviews. |
| 12 | FAQ | Accordion; buttons with `aria-expanded`. Questions from the design file. |
| 13 | Closing call to action and footer | WhatsApp button; footer with Product, Help, Legal links. |

**Pricing display rules**

- Plans: 1 month, 6 months, 1 year. Store `price_paise` and an optional `compare_at_paise` per plan.
- Show `compare_at` struck out only when it is set. For 6 months and 1 year it is the monthly price times the months, with the note under the cards saying so. For the monthly plan, set `compare_at` only if that higher price is genuinely the regular price; otherwise leave it empty.
- Struck prices need screen-reader text ("Regular price ... now ...").

**Rules**

- No invented numbers, customer counts, testimonials or logos. The report card says "Sample data".
- All WhatsApp links use the number from settings; the playground button includes the chosen theme, layout and font in the message.
- Accessibility: one `h1`, real buttons and links, visible focus, 44 px targets, `prefers-reduced-motion` turns off the nav animation and hover lifts.
- Performance: hero and fonts load first; the five gallery phones and the playground preview render on the server; no layout shift when fonts load.
- Placeholders to replace before launch: support email, city, WhatsApp number, legal pages. The brand name (Qlosk) and logo are settled; see section 11.

## 11. Brand and standee

**Brand**

- Name: Qlosk. Domain: qlosk.com. Replace every placeholder brand name with Qlosk (landing, admin sidebar and login, shop page footer "Powered by Qlosk", standee).
- Mark: a Q built from a QR finder square. A rounded square frame (stroke 6 on a 48 grid, corner radius 9) with a centre dot (8 x 8, radius 2) and a small square tail at the bottom right (12 x 12, radius 3.2). Default use is the near-black mark on a butter tile (`#FBF1B5`, radius 14); on teal or dark, a butter mark. Reference: `docs/design/Logo.dc.html`; vector file: `docs/design/qlosk-icon.svg` (use it as `app/icon.svg`).
- Wordmark: "Qlosk" in Fraunces Bold, letter spacing -0.025em, beside the mark.
- Colours: butter `#FBF1B5`, ink `#0D1F1B`, teal `#0F6B5C`, cream `#FBF8F2`. Clear space around the mark is at least half the tile. Do not recolour outside these, stretch, or use another font for the wordmark.

**Standee**

- Three designs: **arch** (rounded panel with logo, name, QR and an icon row), **ticket** (coupon card with a tear line, QR beside a list of what it opens) and **badge** (QR inside a circle with words around its edge). Reference: `docs/design/Standee.dc.html` (props: design, theme, font, shopname, tagline, headline).
- Light themes only: blush, marigold, daylight, graphite, or "match shop page" (nightfall maps to daylight). The font follows the shop page font.
- Content on every design: shop logo (or initials), name, tagline, headline, QR with the Qlosk mark in the middle, a short hint ("Point your phone camera at the code. No app needed."), icons for the shop's enabled buttons, and the credit "Powered by [Qlosk mark] Qlosk · qlosk.com".
- Default headlines: arch "Everything about us, one scan", ticket "Your shortcut to everything here", badge "One scan. Everything here." The owner can edit the headline (under 40 characters). Review wording never offers rewards or asks only happy customers to review.
- Sizes: A5 (148 x 210 mm) and A4 (210 x 297 mm), same proportions, 3 mm bleed on the PDF. PNG export is 1080 px wide for WhatsApp.
- QR centre: clear the middle 9 x 9 modules, place the Q mark (near-black, no tile) with about 1.5 modules of white margin. The three corner squares stay dark. Tested: scans at full size and at about 45% size with this layout. Pale yellow marks or corner squares do not scan; do not use them.
- The editor's Standee tab saves the choices on the shop (`standee_design`, `standee_theme`, `standee_headline`, `standee_size`) and logs every generated file in `print_files`.
- Before ordering stickers in bulk, print one copy of each design and scan it with two or three phones from about 1 m.
