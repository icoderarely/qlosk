import type { ComponentProps } from "react";

// White panel with the design's border and radius. Pass padding or layout
// classes through className; p-5 is the default.
export function Card({
  className = "p-5",
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      className={`box-border min-w-0 rounded-[14px] border border-line bg-white ${className}`}
      {...rest}
    />
  );
}

// Heading with an optional one-line description and an optional control at the right.
export function CardHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const text = (
    <div>
      <h2 className="m-0 text-base font-extrabold">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      ) : null}
    </div>
  );
  if (!action) return text;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {text}
      {action}
    </div>
  );
}
