import { BRAND_NAME } from "@/lib/brand";

// The qlosk logo (same artwork as assets/images/qlosk.svg and app/icon.svg).
// It is a full-colour tile with its own background, so callers only set the size.
export function BrandMark({ className = "size-5", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <rect width="48" height="48" rx="14" fill="#FBF1B5" />
      <rect x="9" y="9" width="26" height="26" rx="9" fill="none" stroke="#0D1F1B" strokeWidth="6" />
      <rect x="18" y="18" width="8" height="8" rx="2" fill="#0D1F1B" />
      <rect x="28.5" y="28.5" width="12" height="12" rx="3.2" fill="#0D1F1B" stroke="#FBF1B5" strokeWidth="3" />
    </svg>
  );
}

/** The logo at a given size, for the admin screens. */
export function BrandTile({ className = "size-[30px]" }: { className?: string }) {
  return <BrandMark className={`flex-none ${className}`} title={BRAND_NAME} />;
}
