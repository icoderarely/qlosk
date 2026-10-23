export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="max-w-sm">
        <h1 className="m-0 text-2xl font-extrabold text-neutral-900">This page is not available</h1>
        <p className="mt-3 text-neutral-700">
          The address may have been typed wrong, or the shop has not published its page yet.
        </p>
      </div>
    </main>
  );
}
