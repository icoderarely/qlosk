"use client";

import { useState, useTransition } from "react";
import { savePlanPrices } from "@/app/qr/admin/billing/actions";
import { buttonClass } from "./button";
import { Card } from "./card";
import { TextField } from "./form-field";
import type { BillingData } from "@/services/billing";
import { notify } from "./notify";

export function PlanPricesForm({ prices, canEdit }: { prices: BillingData["prices"]; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(Object.fromEntries(prices.map((p) => [p.id, p.rupees])));

  return (
    <Card aria-label="Plan prices" className="flex flex-[1_1_320px] flex-col gap-3.5 p-5">
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await savePlanPrices(values);
            notify(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
          });
        }}
      >
        <h2 className="m-0 text-base font-extrabold">Plan prices</h2>
        {prices.length === 0 ? <p className="m-0 text-muted">No plans yet.</p> : null}
        {prices.map((p) => (
          <TextField
            key={p.id}
            block
            label={`${p.plan}, in rupees`}
            inputMode="decimal"
            placeholder="Not set"
            readOnly={!canEdit}
            value={values[p.id] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
          />
        ))}
        <p className="m-0 text-[13px] text-muted">
          After a plan ends, the page stays fully live for 15 more days, then shows only the shop name, a Call
          button and Directions.
        </p>
        {canEdit ? (
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Save prices"}
          </button>
        ) : (
          <p className="m-0 text-[13px] text-muted">Only an admin can change prices.</p>
        )}
      </form>
    </Card>
  );
}
