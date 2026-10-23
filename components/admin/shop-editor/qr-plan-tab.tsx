import { Button } from "../button";
import { Card } from "../card";
import { Chip } from "../chip";
import { TextField, FieldRow } from "../form-field";
import { ICON_DOWNLOAD } from "../icons";
import { QrSample } from "../qr-sample";
import type { TabProps } from "./state";

export type QrPlanInfo = {
  code: string | null;
  plan: { name: string; renewsOn: string; started: string } | null;
};

// The placeholder domain used throughout docs/design.
const DOMAIN = "yourdomain.in";

export function QrPlanTab({ state, set, info }: TabProps & { info: QrPlanInfo }) {
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
          {/* TODO(slice 5 and 6): assign or reassign a code; print files and SVG download */}
          <div className="flex flex-wrap gap-2.5">
            {info.code ? (
              <>
                <Button variant="primary" icon={ICON_DOWNLOAD}>
                  A5 print file
                </Button>
                <Button>4x6 card</Button>
                <Button>QR as SVG</Button>
                <Button>Reassign code</Button>
              </>
            ) : (
              <Button variant="primary">Assign a code</Button>
            )}
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
        {/* TODO: pause and archive (no slice owns these yet) */}
        <div className="flex flex-wrap gap-2.5 border-t border-line-soft pt-3.5">
          <Button>Pause this shop</Button>
          <Button variant="danger">Archive shop</Button>
        </div>
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
