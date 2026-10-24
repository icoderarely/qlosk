"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { undoShopChange } from "@/app/admin/shops/editor-actions";
import { Button } from "../button";
import { Card } from "../card";
import { FieldRow } from "../form-field";
import { formatNumber } from "../format";
import type { ChangeRow, Traffic } from "@/services/shop-editor";
import { notify } from "../notify";

function count(n: number | null): string {
  return n === null ? "—" : formatNumber(n);
}

export function ActivityTab({
  shopId,
  changes,
  traffic,
  canEdit,
}: {
  shopId: string | null;
  changes: ChangeRow[];
  traffic: Traffic;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function undo(changeId: string) {
    if (!shopId) return;
    startTransition(async () => {
      try {
        const r = await undoShopChange(shopId, changeId);
        notify(r.ok ? { ok: true, text: "Change undone." } : { ok: false, text: r.error });
        if (r.ok) router.refresh();
      } catch {
        notify({ ok: false, text: "You do not have permission to undo changes." });
      }
    });
  }

  return (
    <>
      <Card>
        <h2 className="m-0 mb-1.5 text-base font-extrabold">Recent changes</h2>
        {changes.length === 0 ? (
          <p className="m-0 border-t border-line-soft py-3 text-muted">No changes yet.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {changes.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-t border-line-soft py-3">
                <span
                  aria-hidden="true"
                  className="size-2.5 flex-none self-start rounded-full bg-accent mt-1.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.what}</div>
                  <div className="text-[13px] text-muted">
                    {c.who} · {c.when}
                  </div>
                </div>
                {canEdit && c.canUndo ? (
                  <Button disabled={pending} aria-label={`Undo: ${c.what}`} onClick={() => undo(c.id)} className="disabled:cursor-not-allowed disabled:opacity-50">
                    Undo
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3.5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 text-base font-extrabold">Traffic, last 30 days</h2>
          <span className="text-[13px] text-muted">Last scan: {traffic.lastScan}</span>
        </div>
        <FieldRow>
          <Fact label="Counted scans" value={count(traffic.scans)} />
          <Fact label="Button taps" value={count(traffic.taps)} />
          <Fact label="Filtered as bots" value={count(traffic.bots)} />
        </FieldRow>
        <p className="m-0 text-[13px] text-muted">
          Filtered traffic is kept for review but left out of the owner&apos;s report.
        </p>
      </Card>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-[1_1_140px]">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="text-[26px] font-extrabold">{value}</div>
    </div>
  );
}
