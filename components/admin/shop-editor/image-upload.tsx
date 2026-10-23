"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { uploadShopImage } from "@/app/admin/shops/editor-actions";
import { Button } from "../button";
import { ICON_UPLOAD } from "../icons";

// One image picker for the logo or the cover. The file goes to the server,
// which checks it, re-encodes it and returns the stored URL.
export function ImageUpload({
  kind,
  label,
  shopId,
  value,
  onChange,
  empty,
  shape,
}: {
  kind: "logo" | "cover";
  label: string;
  shopId: string | null;
  value: string;
  onChange: (url: string) => void;
  /** What to draw while there is no image. */
  empty: React.ReactNode;
  shape: "round" | "wide";
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", kind);
      body.set("shopId", shopId ?? "");
      const result = await uploadShopImage(body);
      if (result.ok) onChange(result.url);
      else setError(result.error);
    } catch {
      setError("Could not upload the image. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const frame =
    shape === "round"
      ? "size-[72px] rounded-full"
      : "h-[72px] w-[120px] rounded-xl";

  return (
    <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3.5">
      <div className={`${frame} relative flex flex-none items-center justify-center overflow-hidden`}>
        {value ? (
          <Image src={value} alt={`${label} preview`} fill unoptimized sizes="120px" className="object-cover" />
        ) : (
          empty
        )}
      </div>
      <div className="min-w-0">
        <label htmlFor={inputId} className="font-bold">
          {label}
        </label>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Button icon={ICON_UPLOAD} disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading" : value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <Button variant="ghost" disabled={busy} onClick={() => onChange("")}>
              Remove
            </Button>
          ) : null}
        </div>
        <p role="alert" className={error ? "m-0 mt-1.5 text-[13px] font-bold text-chip-over-fg" : "sr-only"}>
          {error}
        </p>
        <p className="m-0 mt-1 text-xs text-muted">JPEG, PNG or WebP, up to 4 MB.</p>
      </div>
    </div>
  );
}
