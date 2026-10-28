"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignQrCode, deleteQrCodes, reassignQrCode, retireQrCode } from "@/app/qr/admin/qr/actions";
import { Button, DownloadButton, LinkButton } from "./button";
import { Card } from "./card";
import { Chip } from "./chip";
import { DataTable, Td, Th } from "./data-table";
import { SelectField, TextField } from "./form-field";
import { QrPreviewDialog, QrThumb, type QrPreviewData } from "./qr-preview";
import { Segmented } from "./segmented";
import { formatAgo, type QrListQuery, type QrOverview, type QrRow, type QrStatus } from "@/services/qr";
import { notify } from "./notify";

type Filter = QrListQuery["status"];

const LABEL: Record<QrStatus, string> = { assigned: "Assigned", unassigned: "Unassigned", retired: "Retired" };
const TONE: Record<QrStatus, "green" | "neutral" | "red"> = { assigned: "green", unassigned: "neutral", retired: "red" };

function listHref(pathname: string, q: QrListQuery): string {
  const p = new URLSearchParams();
  if (q.status !== "all") p.set("status", q.status);
  if (q.q) p.set("q", q.q);
  if (q.page > 1) p.set("page", String(q.page));
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function QrCodesTable({
  overview,
  shops,
  canEdit,
  qrSvgs,
  qrBase,
}: {
  overview: QrOverview;
  shops: { id: string; name: string }[];
  canEdit: boolean;
  /** Code to QR image (SVG text), for the codes on this page. Empty when no QR address is set. */
  qrSvgs: Record<string, string>;
  qrBase: string | null;
}) {
  const { rows, counts, query, page, pageCount, total } = overview;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [preview, setPreview] = useState<QrPreviewData | null>(null);
  const now = new Date();

  function previewOf(r: QrRow): QrPreviewData | null {
    const svg = qrSvgs[r.code];
    if (!svg || !qrBase) return null;
    return { code: r.code, shopName: r.shopName, shopId: r.shopId, url: `${qrBase}/q/${r.code}`, svg, inStock: r.status === "unassigned" };
  }

  // Any code that is not retired can go on a sticker sheet; only codes in stock can be deleted.
  // Only the rows on this page count, even if the selection outlives a page change.
  const pickable = rows.filter((r) => r.status !== "retired").map((r) => r.code);
  const chosen = rows.filter((r) => selected.has(r.code));
  const onlyStock = chosen.every((r) => r.status === "unassigned");
  const allSelected = pickable.length > 0 && pickable.every((c) => selected.has(c));

  function toggle(code: string) {
    setConfirmDelete(false);
    const next = new Set(selected);
    if (!next.delete(code)) next.add(code);
    setSelected(next);
  }

  function toggleAll() {
    setConfirmDelete(false);
    setSelected(allSelected ? new Set() : new Set(pickable));
  }

  function deleteSelected() {
    startDelete(async () => {
      try {
        const r = await deleteQrCodes(chosen.map((c) => c.code));
        notify(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
        if (r.ok) setSelected(new Set());
      } catch {
        notify({ ok: false, text: "You do not have permission to delete codes." });
      }
      setConfirmDelete(false);
      router.refresh();
    });
  }

  function go(change: Partial<QrListQuery>) {
    setOpen(null);
    setSelected(new Set());
    setConfirmDelete(false);
    startTransition(() => router.push(listHref(pathname, { ...query, page: 1, ...change })));
  }

  const options: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${counts.total}` },
    { id: "assigned", label: `Assigned ${counts.assigned}` },
    { id: "unassigned", label: `Unassigned ${counts.unassigned}` },
    { id: "retired", label: `Retired ${counts.retired}` },
  ];

  return (
    <Card className="flex-[3_1_560px] overflow-hidden p-0" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Segmented label="Filter by status" options={options} value={query.status} onChange={(status) => go({ status })} />
        <form
          role="search"
          className="w-full max-w-[260px]"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: search.trim() });
          }}
        >
          <TextField
            block
            hideLabel
            label="Search codes"
            type="search"
            placeholder="Search code or shop"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => {
              if (search.trim() !== query.q) go({ q: search.trim() });
            }}
          />
        </form>
      </div>

      {canEdit && chosen.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft bg-head px-4 py-2.5">
          <span className="font-bold">
            {chosen.length} selected
          </span>
          {confirmDelete ? (
            <>
              <span className="font-bold">
                Delete {chosen.length} {chosen.length === 1 ? "code" : "codes"} for good?
              </span>
              <Button variant="danger" disabled={deleting} onClick={deleteSelected}>
                {deleting ? "Deleting" : "Yes, delete"}
              </Button>
              <Button variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <DownloadButton
                variant="primary"
                href={`/qr/admin/print/stickers?codes=${chosen.map((c) => c.code).join(",")}`}
                aria-label={`Download an A4 sheet of ${chosen.length} stickers, 6 per page`}
              >
                Download sticker sheet ({chosen.length})
              </DownloadButton>
              <Button
                variant="danger"
                disabled={!onlyStock}
                title={onlyStock ? undefined : "Only unassigned codes can be deleted"}
                onClick={() => setConfirmDelete(true)}
              >
                Delete selected
              </Button>
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            </>
          )}
        </div>
      ) : null}

      <DataTable
        minWidth={640}
        aria-label="QR codes"
        head={
          <>
            {canEdit ? (
              <Th className="w-11 pl-4">
                <Check
                  label="Select all codes on this page that are not retired"
                  checked={allSelected}
                  disabled={pickable.length === 0}
                  onChange={toggleAll}
                />
              </Th>
            ) : null}
            <Th className={canEdit ? "" : "pl-4"}>QR</Th>
            <Th>Code</Th>
            <Th>Status</Th>
            <Th>Shop</Th>
            <Th>Last scan</Th>
            <Th className="pr-4">
              <span className="sr-only">Actions</span>
            </Th>
          </>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <Td colSpan={7} className="py-8 text-center text-muted">
              No codes match.
            </Td>
          </tr>
        ) : (
          rows.map((c) => (
            <CodeRow
              key={c.code}
              row={c}
              now={now}
              canEdit={canEdit}
              shops={shops}
              preview={previewOf(c)}
              onPreview={setPreview}
              selected={selected.has(c.code)}
              onSelect={() => toggle(c.code)}
              open={open === c.code}
              onToggle={() => {
                setOpen(open === c.code ? null : c.code);
              }}
              onDone={(m) => {
                notify(m);
                if (m.ok) setOpen(null);
                router.refresh();
              }}
            />
          ))
        )}
      </DataTable>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-muted">
        <span>
          {total} {total === 1 ? "code" : "codes"}, page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button disabled={page <= 1 || pending} onClick={() => go({ page: page - 1 })} className="disabled:cursor-not-allowed disabled:opacity-50">
            Previous
          </Button>
          <Button disabled={page >= pageCount || pending} onClick={() => go({ page: page + 1 })} className="disabled:cursor-not-allowed disabled:opacity-50">
            Next
          </Button>
        </div>
      </div>
      <QrPreviewDialog data={preview} onClose={() => setPreview(null)} />
    </Card>
  );
}

function CodeRow({
  row,
  now,
  canEdit,
  shops,
  preview,
  onPreview,
  selected,
  onSelect,
  open,
  onToggle,
  onDone,
}: {
  row: QrRow;
  now: Date;
  canEdit: boolean;
  shops: { id: string; name: string }[];
  preview: QrPreviewData | null;
  onPreview: (d: QrPreviewData) => void;
  selected: boolean;
  onSelect: () => void;
  open: boolean;
  onToggle: () => void;
  onDone: (m: { ok: boolean; text: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [shopId, setShopId] = useState("");
  const [confirmRetire, setConfirmRetire] = useState(false);
  const assigned = row.status === "assigned";
  // A shop that already has a code cannot take another, so it is not offered;
  // the shop this code is on is left out of its own move list.
  const choices = shops.filter((s) => s.id !== row.shopId);

  function run(action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    startTransition(async () => {
      try {
        const r = await action();
        onDone(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
        if (r.ok) {
          setShopId("");
          setConfirmRetire(false);
        }
      } catch {
        onDone({ ok: false, text: "You do not have permission to change QR codes." });
      }
    });
  }

  return (
    <>
      <tr>
        {canEdit ? (
          <Td className="w-11 pl-4">
            <Check
              label={`Select code ${row.code}`}
              title={row.status === "retired" ? "Retired codes are never printed again" : undefined}
              checked={selected}
              disabled={row.status === "retired"}
              onChange={onSelect}
            />
          </Td>
        ) : null}
        <Td className={canEdit ? "" : "pl-4"}>
          {preview ? <QrThumb data={preview} onOpen={() => onPreview(preview)} /> : <span className="text-muted">-</span>}
        </Td>
        <Td className="font-code text-[13px]">{row.code}</Td>
        <Td>
          <Chip tone={TONE[row.status]}>{LABEL[row.status]}</Chip>
        </Td>
        <Td className="font-semibold">
          {row.shopId ? (
            <Link href={`/qr/admin/shops/${row.shopId}`} className="text-ink underline">
              {row.shopName}
            </Link>
          ) : row.status === "retired" ? (
            "Retired, never reused"
          ) : (
            "In stock"
          )}
        </Td>
        <Td className="text-muted">{formatAgo(row.lastScan, now)}</Td>
        <Td className="pr-4 text-right">
          <div className="inline-flex flex-wrap justify-end gap-2">
            {assigned && row.shopId ? (
              <LinkButton href={`/qr/admin/shops/${row.shopId}?tab=standee`} aria-label={`Open the standee for ${row.code}`}>
                Standee
              </LinkButton>
            ) : null}
            {row.status !== "retired" ? (
              <DownloadButton href={`/qr/admin/print/code/${row.code}`} aria-label={`Download QR for ${row.code}`}>
                Download
              </DownloadButton>
            ) : null}
            {canEdit && row.status !== "retired" ? (
              <Button aria-expanded={open} aria-label={`${open ? "Close" : "Manage"} code ${row.code}`} onClick={onToggle}>
                {open ? "Close" : assigned ? "Manage" : "Assign"}
              </Button>
            ) : null}
          </div>
        </Td>
      </tr>
      {open ? (
        <tr>
          <Td colSpan={7} className="bg-head px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-[1_1_260px]">
                <SelectField
                  block
                  label={assigned ? "Move this code to" : "Assign this code to"}
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                >
                  <option value="">Choose a shop without a code</option>
                  {choices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Button
                variant="primary"
                disabled={!shopId || pending}
                className="disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => run(() => (assigned ? reassignQrCode(row.code, shopId) : assignQrCode(row.code, shopId)))}
              >
                {assigned ? "Move code" : "Assign code"}
              </Button>
              {confirmRetire ? (
                <>
                  <span className="font-bold">Retire for good?</span>
                  <Button variant="danger" disabled={pending} onClick={() => run(() => retireQrCode(row.code))}>
                    Yes, retire {row.code}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmRetire(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="danger" disabled={pending} onClick={() => setConfirmRetire(true)}>
                  Retire code
                </Button>
              )}
            </div>
            <p className="m-0 mt-2 text-[13px] text-muted">
              {assigned
                ? "Moving keeps the printed code working; it opens the new shop. A retired code is never used again."
                : "A shop can have one code. A retired code is never used again."}
            </p>
          </Td>
        </tr>
      ) : null}
    </>
  );
}

// A 44px tap area around the box; the visible label is for screen readers.
function Check({
  label,
  title,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  title?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label title={title} className="-m-3 flex h-11 w-11 cursor-pointer items-center justify-center has-[:disabled]:cursor-not-allowed">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-[18px] w-[18px] cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2"
      />
    </label>
  );
}
