"use client";

import { useState, useTransition } from "react";
import { markShopPaid } from "@/app/admin/billing/actions";
import { Button, buttonClass } from "./button";
import { Card } from "./card";
import { DataTable, Td, Th } from "./data-table";
import { PaymentChip } from "./status-chip";
import type { RenewalRow } from "@/services/billing";
import { notify } from "./notify";

// Mark as paid renews the plan, so it asks first: the first click turns the
// button into "Confirm paid", a second click does it, Cancel backs out.
export function RenewalsTable({ rows, canEdit }: { rows: RenewalRow[]; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  function pay(row: RenewalRow) {
    setConfirming(null);
    startTransition(async () => {
      const result = await markShopPaid(row.shopId);
      notify(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
    });
  }

  return (
    <Card aria-label="Renewals" className="flex-[2_1_560px] overflow-hidden p-0">
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="m-0 text-base font-extrabold">Renewals</h2>
      </div>
      {rows.length === 0 ? <p className="m-0 px-5 py-4 text-muted">No shops on a plan yet.</p> : null}
      {rows.length > 0 ? (
        <DataTable
          minWidth={720}
          head={
            <>
              <Th className="pl-5">Shop</Th>
              <Th>Plan</Th>
              <Th>Renews or ends</Th>
              <Th>Payment</Th>
              <Th className="pr-5">
                <span className="sr-only">Actions</span>
              </Th>
            </>
          }
        >
          {rows.map((r) => (
            <tr key={r.shopId}>
              <Td className="pl-5 font-bold">{r.shop}</Td>
              <Td>{r.plan}</Td>
              <Td>{r.date}</Td>
              <Td>
                <PaymentChip status={r.payment} />
              </Td>
              <Td className="pr-5">
                <div className="flex flex-wrap justify-end gap-2">
                  {r.remindHref ? (
                    <a
                      href={r.remindHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Remind ${r.shop} on WhatsApp (opens in a new tab)`}
                      className={buttonClass()}
                    >
                      Remind
                    </a>
                  ) : null}
                  {r.callHref && r.payment !== "paid" ? (
                    <a href={r.callHref} aria-label={`Call ${r.shop}`} className={buttonClass()}>
                      Call
                    </a>
                  ) : null}
                  {canEdit && confirming === r.shopId ? (
                    <>
                      <Button variant="primary" disabled={pending} onClick={() => pay(r)} aria-label={`Confirm ${r.shop} is paid`}>
                        Confirm paid
                      </Button>
                      <Button disabled={pending} onClick={() => setConfirming(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : canEdit ? (
                    <Button disabled={pending} onClick={() => setConfirming(r.shopId)} aria-label={`Mark ${r.shop} as paid`}>
                      Mark as paid
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </Card>
  );
}
