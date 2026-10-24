import { BRAND_NAME } from "@/lib/brand";

// Placeholder logo until the real one arrives. Replace the contents of this file
// (or swap the <svg> for an <Image>) and every place that shows our mark updates:
// the admin sidebar, the sign-in page and the shop page header.
// The glyph draws in currentColor; the caller sets the size and the colours.
export function BrandMark({ className = "size-5", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <path d="M12 21v-8M12 13L6.5 8.5M12 13l5.5-4.5M12 13V4" />
      <circle cx="12" cy="3.5" r="1.5" fill="currentColor" />
      <circle cx="5.5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="18.5" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** The mark in our accent square, for the admin screens. */
export function BrandTile({ className = "size-[30px] rounded-[9px]" }: { className?: string }) {
  return (
    <span className={`flex flex-none items-center justify-center bg-accent text-white ${className}`} role="img" aria-label={BRAND_NAME}>
      <BrandMark className="size-[60%]" />
    </span>
  );
}
