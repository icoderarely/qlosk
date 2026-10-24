// The shop's real QR (the same drawing every printed file uses, with the Q mark in
// the middle), or the same picture of a sample code until the shop has one. The SVG
// string is made on the server by services/qr-art.ts.
export function QrSample({ svg }: { svg: string | null }) {
  if (!svg) return null;
  return (
    <div
      aria-hidden="true"
      className="size-[132px] flex-none overflow-hidden rounded-xl border border-line bg-white p-2 [&>svg]:block [&>svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
