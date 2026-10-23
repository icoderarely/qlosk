"use client";

import { useMemo, useState } from "react";
import { Button, LinkButton } from "./button";
import { Card } from "./card";
import { DataTable, Td, Th } from "./data-table";
import { formatCode, formatScans } from "./format";
import { ICON_PLUS, ICON_SEARCH } from "./icons";
import { Icon } from "./icon";
import { Chip } from "./chip";
import { LAYOUT_OPTIONS, THEME_OPTIONS, lookLabel } from "./look-options";
import { PageHeader } from "./page-header";
import { Segmented } from "./segmented";
import { StatusChip } from "./status-chip";
import { SelectField, TextField } from "./form-field";
import type { ShopList, ShopRow, ShopTab } from "@/services/shops";

const PAGE_SIZE = 8;

const TAB_LABELS: Record<ShopTab, string> = {
  all: "All",
  live: "Live",
  preview: "Preview",
  building: "Building",
  expired: "Expired",
};

// Which shop statuses each tab holds. Quiet shops are still live; a shop at the
// printing stage has been approved from a preview.
const TAB_STATUSES: Record<Exclude<ShopTab, "all">, ShopRow["status"][]> = {
  live: ["live", "quiet"],
  preview: ["preview", "printing"],
  building: ["building"],
  expired: ["expired"],
};

type Filters = { type: string; theme: string; layout: string; plan: string };
const NO_FILTERS: Filters = { type: "", theme: "", layout: "", plan: "" };

function matches(shop: ShopRow, tab: ShopTab, query: string, f: Filters): boolean {
  if (tab !== "all" && !TAB_STATUSES[tab].includes(shop.status)) return false;
  if (f.type && shop.typeLabel !== f.type) return false;
  if (f.theme && shop.theme !== f.theme) return false;
  if (f.layout && shop.layout !== f.layout) return false;
  if (f.plan && shop.plan !== f.plan) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [shop.name, shop.code ?? "", shop.slug].some((v) => v.toLowerCase().includes(q));
}

export function ShopsTable({ shops, tabCounts }: ShopList) {
  const [tab, setTab] = useState<ShopTab>("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const types = useMemo(
    () => Array.from(new Set(shops.map((s) => s.typeLabel))).sort(),
    [shops],
  );
  const plans = useMemo(() => Array.from(new Set(shops.map((s) => s.plan))), [shops]);

  const rows = useMemo(
    () => shops.filter((s) => matches(s, tab, query, filters)),
    [shops, tab, query, filters],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  // The design shows 48 shops but lists 8. With no search or filter the total
  // is the tab count from the design; otherwise it is the rows that matched.
  const unfiltered = !query.trim() && !Object.values(filters).some(Boolean);
  const total = unfiltered ? tabCounts[tab] : rows.length;
  const from = visible.length ? current * PAGE_SIZE + 1 : 0;
  const to = current * PAGE_SIZE + visible.length;

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const setFilter = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(0);
  };

  return (
    <>
      <PageHeader
        title="Shops"
        subtitle="Find a shop, change its look, or download its print file."
        actions={
          <>
            <Segmented
              label="Filter by status"
              value={tab}
              onChange={reset(setTab)}
              options={(Object.keys(TAB_LABELS) as ShopTab[]).map((id) => ({
                id,
                label: `${TAB_LABELS[id]} ${tabCounts[id]}`,
              }))}
            />
            <LinkButton href="/admin/shops/new" variant="primary" icon={ICON_PLUS}>
              New shop
            </LinkButton>
          </>
        }
      />

      <Card aria-label="Shops table" className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2.5 border-b border-line-soft px-4 py-3.5">
          <div className="relative flex-[1_1_240px]">
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
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <SelectField
            block
            hideLabel
            label="Shop type"
            className="w-auto font-bold"
            value={filters.type}
            onChange={setFilter("type")}
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
            value={filters.theme}
            onChange={setFilter("theme")}
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
            value={filters.layout}
            onChange={setFilter("layout")}
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
            value={filters.plan}
            onChange={setFilter("plan")}
          >
            <option value="">Plan</option>
            {plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line-soft bg-[color-mix(in_srgb,var(--color-accent)_10%,white)] px-4 py-2.5">
            <span role="status" className="font-extrabold">
              {selected.size} {selected.size === 1 ? "shop" : "shops"} selected
            </span>
            {/* TODO(slice 4): bulk change of theme, layout and font; export */}
            <Button>Change theme</Button>
            <Button>Change layout</Button>
            <Button>Change font</Button>
            <Button>Export</Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : null}

        <DataTable
          minWidth={900}
          head={
            <>
              <Th className="w-11 pl-4">
                <span className="sr-only">Select</span>
              </Th>
              <Th>Shop</Th>
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
          {visible.length === 0 ? (
            <tr>
              <Td colSpan={8} className="py-8 text-center text-muted">
                No shops match. Clear the search or a filter.
              </Td>
            </tr>
          ) : (
            visible.map((s) => (
              <tr key={s.id}>
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
                <Td>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-xs text-muted">
                    {s.typeLabel} · /s/{s.slug}
                  </div>
                </Td>
                <Td>
                  <Chip>{lookLabel(s.theme, s.layout)}</Chip>
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
            <Button disabled={current === 0} onClick={() => setPage(current - 1)} className="disabled:cursor-not-allowed disabled:opacity-50">
              Previous
            </Button>
            <Button
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
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
