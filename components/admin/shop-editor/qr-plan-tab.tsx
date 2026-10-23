import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignQrCode, reassignQrCode, retireQrCode } from "@/app/admin/qr/actions";
import { changeShopStatusAction } from "@/app/admin/shops/editor-actions";
import type { DbShopStatus } from "@/services/shops";
import { Button } from "../button";
import { Card } from "../card";
import { Chip } from "../chip";
import { TextField, FieldRow, SelectField } from "../form-field";
import { ICON_DOWNLOAD } from "../icons";
import { QrSample } from "../qr-sample";
import type { TabProps } from "./state";

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
  canEdit,
}: TabProps & { info: QrPlanInfo; choices: QrChoices; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState("");
  const [confirm, setConfirm] = useState<"retire" | "archive" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Runs one server action, shows its answer, and reloads the page data.
  function run(action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await action();
        setMessage(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
        if (r.ok) {
          setPick("");
          setConfirm(null);
          router.refresh();
        }
      } catch {
        setMessage({ ok: false, text: "You do not have permission to change this shop." });
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
              {/* TODO(slice 6): print files and SVG download */}
              {info.code ? (
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="primary" icon={ICON_DOWNLOAD}>
                    A5 print file
                  </Button>
                  <Button>4x6 card</Button>
                  <Button>QR as SVG</Button>
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
          <div role="status" className={message ? "text-[13px] font-bold" : "sr-only"}>
            {message ? <span className={message.ok ? "" : "text-chip-over-fg"}>{message.text}</span> : null}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3.5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-base font-extrabold">Plan</h2>
          {/* TODO(slice 9): payment status chip */}
        </div>
        <FieldRow>
          <PlanFact label="Plan" value={info.plan?.name ?? "No plan yet"} />
          <PlanFact label="Renews" value={info.plan?.renewsOn ?? "Not started"} />
          <PlanFact label="Started" value={info.plan?.started ?? "Not started"} />
        </FieldRow>
        {/* TODO(slice 9): change plan, send reminder, mark as paid */}
        <div className="flex flex-wrap gap-2.5">
          <Button>Change plan</Button>
          <Button>Send renewal reminder</Button>
          <Button>Mark as paid</Button>
        </div>
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
