import { requireRole } from "@/lib/require-role";

// Stand-in for pages that arrive in later slices of docs/spec.md section 9.
export async function PlaceholderPage({ title }: { title: string }) {
  await requireRole("viewer");
  return (
    <div>
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.01em]">
        {title}
      </h1>
      <p className="mt-1 text-muted">Coming in a later slice.</p>
    </div>
  );
}
