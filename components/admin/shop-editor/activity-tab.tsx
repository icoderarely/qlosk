import { Button } from "../button";
import { Card } from "../card";
import { FieldRow } from "../form-field";
import { formatNumber } from "../format";
import type { MockChange, MockTraffic } from "@/lib/mock/shops";

function count(n: number | null): string {
  return n === null ? "—" : formatNumber(n);
}

export function ActivityTab({
  changes,
  traffic,
}: {
  changes: MockChange[];
  traffic: MockTraffic;
}) {
  return (
    <>
      <Card>
        <h2 className="m-0 mb-1.5 text-base font-extrabold">Recent changes</h2>
        {changes.length === 0 ? (
          <p className="m-0 border-t border-line-soft py-3 text-muted">No changes yet.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {/* TODO(slice 4): Undo, View and Mark done read the change_log */}
            {changes.map((c) => (
              <li key={c.what} className="flex items-center gap-3 border-t border-line-soft py-3">
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
                <Button aria-label={`${c.action}: ${c.what}`}>{c.action}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3.5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="m-0 text-base font-extrabold">Traffic, last 30 days</h2>
          <span className="text-[13px] text-muted">Last scan {traffic.lastScan.toLowerCase()}</span>
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
