"use client";

import { useState, useTransition } from "react";
import { generateQrBatch } from "@/app/admin/qr/actions";
import { Button } from "./button";
import { Card } from "./card";
import { TextField } from "./form-field";

export function GenerateBatch({ canEdit }: { canEdit: boolean }) {
  const [count, setCount] = useState("50");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function submit() {
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await generateQrBatch(Number(count));
        setMessage(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
      } catch {
        setMessage({ ok: false, text: "You do not have permission to make codes." });
      }
    });
  }

  return (
    <Card id="generate-batch" aria-label="Generate a batch" className="flex flex-[1_1_320px] flex-col gap-3.5 p-5">
      <h2 className="m-0 text-base font-extrabold">Generate a batch</h2>
      <TextField
        block
        label="How many codes"
        type="number"
        min={1}
        max={500}
        value={count}
        onChange={(e) => setCount(e.target.value)}
        disabled={!canEdit}
      />
      {/* TODO(slice 6): sticker size, and download the batch as a PDF */}
      <Button variant="primary" disabled={!canEdit || pending} onClick={submit} className="disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Making codes" : "Generate codes"}
      </Button>
      <div role="status" className={message ? "font-bold" : "sr-only"}>
        {message ? <span className={message.ok ? "" : "text-chip-over-fg"}>{message.text}</span> : null}
      </div>
      <p className="m-0 text-[13px] text-muted">
        Codes avoid look-alike letters. Until a code is assigned, scanning it shows a friendly page
        that says it is not activated yet, with your WhatsApp contact.
      </p>
    </Card>
  );
}
