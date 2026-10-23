"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkChangeLook } from "@/app/admin/shops/actions";
import { Button, LinkButton } from "./button";
import { Card } from "./card";
import { DataTable, Td, Th } from "./data-table";
import { formatCode, formatScans } from "./format";
import { ICON_PLUS, ICON_SEARCH } from "./icons";
import { Icon } from "./icon";
import { Chip } from "./chip";
import { FONT_OPTIONS, LAYOUT_OPTIONS, THEME_OPTIONS, lookLabel } from "./look-options";
import { PageHeader } from "./page-header";
import { Segmented } from "./segmented";
import { StatusChip } from "./status-chip";
import { SelectField, TextField } from "./form-field";
import { SHOP_TABS, type ShopList, type ShopListQuery, type ShopListTab } from "@/services/shops";

const TAB_LABELS: Record<ShopListTab, string> = {
  all: "All",
  live: "Live",
  preview: "Preview",
  building: "Building",
  expired: "Expired",
};

// The URL holds the tab, search, filters and page, so a copied link reopens the
// same list. Defaults are left out to keep it short.
function listHref(pathname: string, query: ShopListQuery): string {
  const p = new URLSearchParams();
  if (query.tab !== "all") p.set("tab", query.tab);
  if (query.q) p.set("q", query.q);
  if (query.type) p.set("type", query.type);
  if (query.theme) p.set("theme", query.theme);
  if (query.layout) p.set("layout", query.layout);
  if (query.plan) p.set("plan", query.plan);
  if (query.page > 1) p.set("page", String(query.page));
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

type BulkChoice = { theme: string; layout: string; font: string };
const NO_CHOICE: BulkChoice = { theme: "", layout: "", font: "" };

export function ShopsTable({ list, canEdit }: { list: ShopList; canEdit: boolean }) {
  const { shops, tabCounts, query, total, page, pageCount, pageSize, types, plans } = list;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<BulkChoice>(NO_CHOICE);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Changing the list clears the selection, so a bulk action never reaches
  // shops that are no longer on screen.
  function go(change: Partial<ShopListQuery>) {
    setSelected(new Set());
    setMessage(null);
    const next = { ...query, page: 1, ...change };
    startTransition(() => router.push(listHref(pathname, next)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOnPage = shops.length > 0 && shops.every((s) => selected.has(s.id));
  function toggleAll() {
    setSelected(allOnPage ? new Set() : new Set(shops.map((s) => s.id)));
  }

  function applyBulk() {
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const result = await bulkChangeLook({
          ids,
          theme: choice.theme || undefined,
          layout: choice.layout || undefined,
          font: choice.font || undefined,
        });
        if (result.ok) {
          setMessage({
            ok: true,
            text: `Updated ${result.updated} ${result.updated === 1 ? "shop" : "shops"}.`,
          });
          setSelected(new Set());
          setChoice(NO_CHOICE);
        } else {
          setMessage({ ok: false, text: result.error });
        }
      } catch {
        setMessage({ ok: false, text: "You do not have permission to change shops." });
      }
    });
  }

  const from = shops.length ? (page - 1) * pageSize + 1 : 0;
  const to = (page - 1) * pageSize + shops.length;
  const columns = canEdit ? 8 : 7;
  const nothingChosen = !choice.theme && !choice.layout && !choice.font;

  return (
    <>
      <PageHeader
        title="Shops"
        subtitle="Find a shop, change its look, or download its print file."
        actions={
          <>
            <Segmented
              label="Filter by status"
              value={query.tab}
              onChange={(tab) => go({ tab })}
              options={SHOP_TABS.map((id) => ({
                id,
                label: `${TAB_LABELS[id]} ${tabCounts[id]}`,
              }))}
            />
            {canEdit ? (
              <LinkButton href="/admin/shops/new" variant="primary" icon={ICON_PLUS}>
                New shop
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Card aria-label="Shops table" aria-busy={pending} className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2.5 border-b border-line-soft px-4 py-3.5">
          <form
            role="search"
            className="relative flex-[1_1_240px]"
            onSubmit={(e) => {
              e.preventDefault();
              go({ q: search.trim() });
            }}
          >
            <span className="pointer-events-none absolute left-3 top-[13px] text-muted">
              <Icon d={ICON_SEARCH} />
            </span>
            <TextField
              block
              hideLabel
              label="Search shops"
              type="search"
              placeholder="Search name, code, slug or phone"
              className="pl-[38px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => {
                if (search.trim() !== query.q) go({ q: search.trim() });
              }}
            />
          </form>
          <SelectField
            block
            hideLabel
            label="Shop type"
            className="w-auto font-bold"
            value={query.type}
            onChange={(e) => go({ type: e.target.value })}
          >
            <option value="">Shop type</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
          <SelectField
            block
            hideLabel
            label="Theme"
            className="w-auto font-bold"
            value={query.theme}
            onChange={(e) => go({ theme: e.target.value as ShopListQuery["theme"] })}
          >
            <option value="">Theme</option>
            {THEME_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            block
            hideLabel
            label="Layout"
            className="w-auto font-bold"
            value={query.layout}
            onChange={(e) => go({ layout: e.target.value as ShopListQuery["layout"] })}
          >
            <option value="">Layout</option>
            {LAYOUT_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            block
            hideLabel
            label="Plan"
            className="w-auto font-bold"
            value={query.plan}
            onChange={(e) => go({ plan: e.target.value })}
          >
            <option value="">Plan</option>
            {plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>
        </div>

        {canEdit && selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] px-4 py-2.5">
            <span className="font-extrabold">
              {selected.size} {selected.size === 1 ? "shop" : "shops"} selected
            </span>
            <SelectField
              block
              hideLabel
              label="Change theme to"
              className="w-auto font-bold"
              value={choice.theme}
              onChange={(e) => setChoice((c) => ({ ...c, theme: e.target.value }))}
            >
              <option value="">Change theme</option>
              {THEME_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              block
              hideLabel
              label="Change layout to"
              className="w-auto font-bold"
              value={choice.layout}
              onChange={(e) => setChoice((c) => ({ ...c, layout: e.target.value }))}
            >
              <option value="">Change layout</option>
              {LAYOUT_OPTIONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              block
              hideLabel
              label="Change font to"
              className="w-auto font-bold"
              value={choice.font}
              onChange={(e) => setChoice((c) => ({ ...c, font: e.target.value }))}
            >
              <option value="">Change font</option>
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </SelectField>
            <Button
              variant="primary"
              disabled={nothingChosen || pending}
              onClick={applyBulk}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply to {selected.size}
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : null}

        <div role="status" className={message ? "border-b border-line-soft px-4 py-2.5 font-bold" : "sr-only"}>
          {message ? (
            <span className={message.ok ? "" : "text-chip-over-fg"}>{message.text}</span>
          ) : null}
        </div>

        <DataTable
          minWidth={900}
          head={
            <>
              {canEdit ? (
                <Th className="w-11 pl-4">
                  <label className="-my-2 flex size-11 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      className="size-5 accent-accent"
                      checked={allOnPage}
                      onChange={toggleAll}
                      aria-label="Select all shops on this page"
                    />
                  </label>
                </Th>
              ) : null}
              <Th className={canEdit ? "" : "pl-4"}>Shop</Th>
              <Th>Look</Th>
              <Th>Code</Th>
              <Th>Plan</Th>
              <Th className="text-right">Scans, 30 days</Th>
              <Th>Status</Th>
              <Th className="pr-4">
                <span className="sr-only">Edit</span>
              </Th>
            </>
          }
        >
          {shops.length === 0 ? (
            <tr>
              <Td colSpan={columns} className="py-8 text-center text-muted">
                No shops match. Clear the search or a filter.
              </Td>
            </tr>
          ) : (
            shops.map((s) => (
              <tr key={s.id}>
                {canEdit ? (
                  <Td className="pl-4">
                    <label className="-my-2 flex size-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        className="size-5 accent-accent"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        aria-label={`Select ${s.name}`}
                      />
                    </label>
                  </Td>
                ) : null}
                <Td className={canEdit ? "" : "pl-4"}>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs text-muted">
                    {s.typeLabel ? `${s.typeLabel} · ` : ""}/s/{s.slug}
                  </div>
                </Td>
                <Td>
                  <Chip>{s.look ? lookLabel(s.look.theme, s.look.layout) : "Not set"}</Chip>
                </Td>
                <Td className="font-code text-[13px]">{formatCode(s.code)}</Td>
                <Td>
                  <div className="font-semibold">{s.plan}</div>
                  <div className="text-xs text-muted">{s.planNote}</div>
                </Td>
                <Td className="text-right font-semibold">{formatScans(s.scans)}</Td>
                <Td>
                  <StatusChip status={s.status} />
                </Td>
                <Td className="pr-4 text-right">
                  <LinkButton href={`/admin/shops/${s.id}`} aria-label={`Edit ${s.name}`}>
                    Edit
                  </LinkButton>
                </Td>
              </tr>
            ))
          )}
        </DataTable>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-muted">
          <span>
            Showing {from} to {to} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page <= 1 || pending}
              onClick={() => go({ page: page - 1 })}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              disabled={page >= pageCount || pending}
              onClick={() => go({ page: page + 1 })}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
