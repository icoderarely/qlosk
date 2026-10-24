import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeShopPlan, markShopPaid, undoShopPaid } from "@/app/admin/billing/actions";
import { assignQrCode, reassignQrCode, retireQrCode } from "@/app/admin/qr/actions";
import { changeShopStatusAction } from "@/app/admin/shops/editor-actions";
import type { ShopPlanData } from "@/services/billing";
import type { DbShopStatus } from "@/services/shops";
import { Button, buttonClass, DownloadButton } from "../button";
import { Card } from "../card";
import { Chip } from "../chip";
import { TextField, FieldRow, SelectField } from "../form-field";
import { ICON_DOWNLOAD } from "../icons";
import { QrSample } from "../qr-sample";
import { PaymentChip } from "../status-chip";
import type { TabProps } from "./state";
import { notify } from "../notify";

export type QrChoices = {
  /** Codes in stock. */
  stock: string[];
  /** Shops that have no code yet. */
  shops: { id: string; name: string }[];
};

export type QrPlanInfo = {
  /** null until the shop is saved for the first time. */
  shopId: string | null;
  status: DbShopStatus;
  code: string | null;
  plan: { name: string; renewsOn: string; started: string } | null;
};

// The placeholder domain used throughout docs/design.
const DOMAIN = "yourdomain.in";

export function QrPlanTab({
  state,
  set,
  info,
  choices,
  billing,
  canEdit,
}: TabProps & { info: QrPlanInfo; choices: QrChoices; billing: ShopPlanData | null; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState("");
  const [confirm, setConfirm] = useState<"retire" | "archive" | null>(null);
  const [choosingPlan, setChoosingPlan] = useState(false);
  const [planPick, setPlanPick] = useState("");
  const [customMonths, setCustomMonths] = useState("");
  const [customRupees, setCustomRupees] = useState("");
  const [confirmingPay, setConfirmingPay] = useState(false);
  const [undoable, setUndoable] = useState(false);

  // Runs one server action, shows its answer, and reloads the page data.
  function run(action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    startTransition(async () => {
      try {
        const r = await action();
        notify(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
        if (r.ok) {
          setPick("");
          setConfirm(null);
          router.refresh();
        }
      } catch {
        notify({ ok: false, text: "You do not have permission to change this shop." });
      }
    });
  }

  const id = info.shopId;
  const status = info.status;
  const disabled = !canEdit || pending;

  return (
    <>
      <Card className="flex flex-wrap items-center gap-5 p-5">
        <QrSample />
        <div className="flex flex-[1_1_260px] flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <h2 className="m-0 text-base font-extrabold">QR code</h2>
            <Chip tone={info.code ? "green" : "neutral"}>
              {info.code ? "Assigned" : "Not assigned"}
            </Chip>
          </div>
          {info.code ? (
            <div>
              <span className="font-code text-lg">{info.code}</span>
              <div className="text-[13px] text-muted">
                {DOMAIN}/q/{info.code} opens {DOMAIN}/s/{state.slug || "your-shop"}
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-muted">
              Assign a code from stock to print this shop&apos;s standee.
            </div>
          )}
          {id === null ? (
            <div className="text-[13px] text-muted">Save the shop first, then assign a code.</div>
          ) : (
            <>
              {info.code ? (
                <div className="flex flex-wrap gap-2.5">
                  <DownloadButton variant="primary" icon={ICON_DOWNLOAD} href={`/admin/print/shop/${id}/a5`}>
                    A5 print file
                  </DownloadButton>
                  <DownloadButton href={`/admin/print/shop/${id}/card`}>4x6 card</DownloadButton>
                  <DownloadButton href={`/admin/print/shop/${id}/svg`}>QR as SVG</DownloadButton>
                </div>
              ) : null}
              {canEdit ? (
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="min-w-[200px] flex-[1_1_220px]">
                    <SelectField
                      block
                      label={info.code ? "Move this code to another shop" : "Assign a code from stock"}
                      value={pick}
                      onChange={(e) => setPick(e.target.value)}
                    >
                      <option value="">{info.code ? "Choose a shop without a code" : "Choose a code"}</option>
                      {info.code
                        ? choices.shops.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))
                        : choices.stock.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                    </SelectField>
                  </div>
                  <Button
                    variant="primary"
                    disabled={!pick || disabled}
                    className="disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() =>
                      run(() =>
                        info.code ? reassignQrCode(info.code, pick) : assignQrCode(pick, id),
                      )
                    }
                  >
                    {info.code ? "Move code" : "Assign code"}
                  </Button>
                  {info.code ? (
                    confirm === "retire" ? (
                      <>
                        <Button variant="danger" disabled={disabled} onClick={() => run(() => retireQrCode(info.code))}>
                          Yes, retire {info.code}
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirm(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button variant="danger" disabled={disabled} onClick={() => setConfirm("retire")}>
                        Retire code
                      </Button>
                    )
                  ) : null}
                </div>
              ) : null}
              {!info.code && canEdit && choices.stock.length === 0 ? (
                <div className="text-[13px] text-muted">No codes in stock. Generate a batch on the QR codes page.</div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3.5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-base font-extrabold">Plan</h2>
          {billing?.payment ? <PaymentChip status={billing.payment} /> : null}
        </div>
        <FieldRow>
          <PlanFact label="Plan" value={info.plan?.name ?? "No plan yet"} />
          <PlanFact label="Renews" value={info.plan?.renewsOn ?? "Not started"} />
          <PlanFact label="Started" value={info.plan?.started ?? "Not started"} />
        </FieldRow>
        {id === null || !billing ? (
          <div className="text-[13px] text-muted">Save the shop first, then choose a plan.</div>
        ) : choosingPlan ? (
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[13px] font-bold">Choose a plan</legend>
            {billing.options.map((o) => (
              <label
                key={o.id}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-field bg-white p-3 has-[:checked]:border-ink"
              >
                <input
                  type="radio"
                  name="plan"
                  value={o.id}
                  checked={planPick === o.id}
                  onChange={() => setPlanPick(o.id)}
                  className="mt-1 size-4"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-bold">
                    {o.name} <span className="font-normal">· {o.price}</span>
                    {o.bestValue ? (
                      <span className="ml-2 rounded-full bg-[#e3f3ea] px-2 py-0.5 text-xs font-bold text-[#1d6b45]">
                        Best value
                      </span>
                    ) : null}
                    {o.perMonth ? <span className="font-normal text-muted"> · {o.perMonth}</span> : null}
                    {o.saving ? <span className="font-bold text-[#1d6b45]"> · {o.saving}</span> : null}
                  </span>
                  {o.pitch ? <span className="text-[13px] text-muted">{o.pitch}</span> : null}
                </span>
              </label>
            ))}
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-field bg-white p-3 has-[:checked]:border-ink">
              <input
                type="radio"
                name="plan"
                value="custom"
                checked={planPick === "custom"}
                onChange={() => setPlanPick("custom")}
                className="mt-1 size-4"
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-bold">Custom</span>
                <span className="text-[13px] text-muted">Any number of months, with a price you set for this shop</span>
              </span>
            </label>
            {planPick === "custom" ? (
              <FieldRow>
                <TextField
                  label="Months"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={120}
                  placeholder="17"
                  value={customMonths}
                  onChange={(e) => setCustomMonths(e.target.value)}
                />
                <TextField
                  label="Price in rupees (optional)"
                  inputMode="decimal"
                  placeholder="3,499"
                  value={customRupees}
                  onChange={(e) => setCustomRupees(e.target.value)}
                />
              </FieldRow>
            ) : null}
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="primary"
                disabled={
                  disabled ||
                  !planPick ||
                  planPick === billing.planId ||
                  (planPick === "custom" && !(Number(customMonths) >= 1))
                }
                className="disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  run(async () => {
                    const r = await changeShopPlan(
                      id,
                      planPick === "custom"
                        ? { custom: { months: Number(customMonths), rupees: customRupees } }
                        : { planId: planPick },
                    );
                    if (r.ok) setChoosingPlan(false);
                    return r;
                  })
                }
              >
                Save plan
              </Button>
              <Button variant="ghost" onClick={() => setChoosingPlan(false)}>
                Cancel
              </Button>
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit ? (
              <Button
                disabled={disabled}
                onClick={() => {
                  setPlanPick(billing.custom ? "custom" : (billing.planId ?? ""));
                  setCustomMonths(billing.custom ? String(billing.custom.months) : "");
                  setCustomRupees(billing.custom?.rupees ?? "");
                  setChoosingPlan(true);
                }}
              >
                {billing.planId ? "Change plan" : "Choose plan"}
              </Button>
            ) : null}
            {billing.remindHref ? (
              <a
                href={billing.remindHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Send renewal reminder on WhatsApp (opens in a new tab)"
                className={buttonClass()}
              >
                Send renewal reminder
              </a>
            ) : (
              <Button disabled className="cursor-not-allowed opacity-50">
                Send renewal reminder
              </Button>
            )}
            {canEdit && billing.planId ? (
              confirmingPay ? (
                <>
                  <Button
                    variant="primary"
                    disabled={disabled}
                    onClick={() =>
                      run(async () => {
                        setConfirmingPay(false);
                        const r = await markShopPaid(id);
                        setUndoable(r.ok);
                        return r;
                      })
                    }
                  >
                    {billing.payment === "paid" ? `Extend to ${billing.renewsTo}` : `Confirm paid, until ${billing.renewsTo}`}
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmingPay(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {undoable ? (
                    <Button
                      disabled={disabled}
                      onClick={() =>
                        run(async () => {
                          setUndoable(false);
                          return undoShopPaid(id);
                        })
                      }
                    >
                      Undo
                    </Button>
                  ) : null}
                  <Button
                    disabled={disabled}
                    onClick={() => {
                      setUndoable(false);
                      setConfirmingPay(true);
                    }}
                  >
                    {billing.payment === "paid" ? "Renew early" : "Mark as paid"}
                  </Button>
                </>
              )
            ) : null}
          </div>
        )}
        {billing && !choosingPlan ? (
          <div className="text-[13px] text-muted">
            {billing.remindHref ? "" : `Reminder: ${billing.remindNote} `}
            {canEdit && !billing.planId ? "Mark as paid needs a plan." : ""}
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="m-0 text-base font-extrabold">Page address</h2>
        <FieldRow>
          <TextField
            label="Address"
            className="font-code text-[13px]"
            value={state.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </FieldRow>
        <p className="m-0 text-[13px] text-muted">
          If you change this, the old address keeps working and forwards to the new one. The printed
          QR never changes.
        </p>
        {id !== null && canEdit ? (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-line-soft pt-3.5">
            {status === "paused" ? (
              <Button disabled={disabled} onClick={() => run(async () => ({ ...(await changeShopStatusAction(id, "resume")), message: "Shop resumed." }))}>
                Resume this shop
              </Button>
            ) : status === "archived" ? (
              <Button disabled={disabled} onClick={() => run(async () => ({ ...(await changeShopStatusAction(id, "restore")), message: "Shop restored." }))}>
                Restore shop
              </Button>
            ) : (
              <>
                <Button disabled={disabled} onClick={() => run(async () => ({ ...(await changeShopStatusAction(id, "pause")), message: "Shop paused. Its public page is hidden." }))}>
                  Pause this shop
                </Button>
                {confirm === "archive" ? (
                  <>
                    <span className="font-bold">Archive this shop?</span>
                    <Button variant="danger" disabled={disabled} onClick={() => run(async () => ({ ...(await changeShopStatusAction(id, "archive")), message: "Shop archived. Its public page is hidden." }))}>
                      Yes, archive
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirm(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="danger" disabled={disabled} onClick={() => setConfirm("archive")}>
                    Archive shop
                  </Button>
                )}
              </>
            )}
            <span className="text-[13px] text-muted">
              Paused and archived shops are hidden from the public. You can undo it from Activity.
            </span>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function PlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-[1_1_140px]">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}
