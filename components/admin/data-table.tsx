import type { ComponentProps } from "react";

// Horizontal scroll wrapper plus the design's table. `minWidth` is in px.
export function DataTable({
  minWidth,
  head,
  children,
  "aria-label": ariaLabel,
}: {
  minWidth: number;
  head: React.ReactNode;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        aria-label={ariaLabel}
        className="w-full border-collapse text-left"
        style={{ minWidth }}
      >
        <thead>
          <tr className="bg-head">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ className = "", ...rest }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={`px-2 py-2.5 text-xs font-bold text-muted ${className}`}
      {...rest}
    />
  );
}

export function Td({ className = "", ...rest }: ComponentProps<"td">) {
  return <td className={`border-t border-line-soft px-2 py-3 align-middle ${className}`} {...rest} />;
}
