"use client";

import { useState, useTransition } from "react";
import { reviewUnusualTraffic } from "@/app/admin/reports/actions";
import { Button } from "./button";
import { Card } from "./card";
import { Chip } from "./chip";
import type { Unusual } from "@/services/stats";

// One card per shop with held scans. Count them puts the scans back into the
// numbers; Mark as bots keeps them flagged. Both keep the events. A viewer
// sees the card but no buttons.
export function SpikeReviewCard({ item, total, canEdit }: { item: Unusual; total: number; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function decide(decision: "count" | "mark_bots") {
    setMessage(null);
    startTransition(async () => {
      const result = await reviewUnusualTraffic(item.shopId, decision);
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
    });
  }

  return (
    <Card className="flex flex-col gap-2.5 border-review-line bg-review-bg p-5">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="m-0 text-base font-extrabold">Unusual traffic</h2>
        <Chip tone="amber">{total} to review</Chip>
      </div>
      <div className="font-bold">{item.shop}</div>
      <p className="m-0 text-[13px] text-muted">{item.detail}</p>
      {canEdit ? (
        <div className="flex flex-wrap gap-2.5">
          <Button disabled={pending} onClick={() => decide("count")} aria-label={`Count them: ${item.shop}`}>
            Count them
          </Button>
          <Button disabled={pending} onClick={() => decide("mark_bots")} aria-label={`Mark as bots: ${item.shop}`}>
            Mark as bots
          </Button>
        </div>
      ) : (
        <p className="m-0 text-[13px] text-muted">Only an admin can decide.</p>
      )}
      <p role="status" className={`m-0 text-[13px] font-semibold ${message?.ok === false ? "text-chip-over-fg" : "text-chip-live-fg"}`}>
        {message?.text}
      </p>
    </Card>
  );
}
