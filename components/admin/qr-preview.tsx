"use client";

import { useEffect, useRef } from "react";
import { Button, DownloadButton } from "./button";

export type QrPreviewData = { code: string; shopName: string | null; shopId: string | null; url: string; svg: string; inStock: boolean };

const dataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** The small QR in a table row. Opens the preview. */
export function QrThumb({ data, onOpen }: { data: QrPreviewData; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Show QR code ${data.code}`}
      className="-m-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-white p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUri(data.svg)} alt="" width={36} height={36} className="h-9 w-9" />
    </button>
  );
}

// A native <dialog>: the browser traps focus, closes on Esc and restores focus.
export function QrPreviewDialog({ data, onClose }: { data: QrPreviewData | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (data && !d.open) d.showModal();
    if (!data && d.open) d.close();
  }, [data]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={data ? `QR code ${data.code}` : "QR code"}
      className="m-auto w-[min(92vw,380px)] rounded-2xl border border-line bg-white p-0 text-ink backdrop:bg-black/40"
    >
      {data ? (
        <div className="flex flex-col items-center gap-3 p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUri(data.svg)}
            alt={`QR code ${data.code}`}
            width={280}
            height={280}
            className="h-auto w-full max-w-[280px] rounded-xl border border-line"
          />
          <div className="font-code text-lg font-bold">{data.code}</div>
          <div className="text-muted">{data.shopName ?? "Not assigned to a shop yet"}</div>
          <div className="break-all text-[13px] text-muted">{data.url}</div>
          <div className="flex flex-wrap justify-center gap-2">
            {data.shopId || data.inStock ? (
              <DownloadButton href={`/qr/admin/print/code/${data.code}`}>Download sticker (PNG)</DownloadButton>
            ) : null}
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
