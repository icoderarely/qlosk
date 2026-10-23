"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { SelectField } from "./form-field";
import { RANGES, type Range } from "@/services/stats";

// Overview and Reports share one range, kept in the URL (?range=7|30|90) so a
// copied link opens the same numbers. 30 is the default and is left out.
export function RangePicker({ value }: { value: Range }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <SelectField
      block
      hideLabel
      label="Date range"
      value={value}
      disabled={pending}
      className="font-bold"
      onChange={(e) => {
        const next = Number(e.target.value);
        startTransition(() => router.push(next === 30 ? pathname : `${pathname}?range=${next}`));
      }}
    >
      {RANGES.map((r) => (
        <option key={r} value={r}>
          Last {r} days
        </option>
      ))}
    </SelectField>
  );
}
