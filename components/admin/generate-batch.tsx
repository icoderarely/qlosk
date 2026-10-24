"use client";

import { useState, useTransition } from "react";
import { generateQrBatch } from "@/app/admin/qr/actions";
import { Button, buttonClass } from "./button";
import { Card } from "./card";
import { SelectField, TextField } from "./form-field";
import { Icon } from "./icon";
import { ICON_DOWNLOAD } from "./icons";
import { notify } from "./notify";

export function GenerateBatch({ canEdit }: { canEdit: boolean }) {
  const [count, setCount] = useState("5");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        const r = await generateQrBatch(Number(count));
        notify(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
      } catch {
        notify({ ok: false, text: "You do not have permission to make codes." });
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
      <Button variant="primary" disabled={!canEdit || pending} onClick={submit} className="disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Making codes" : "Generate codes"}
      </Button>
      {/* A plain GET form: the browser downloads the PDF the route sends back. */}
      <form
        action="/admin/print/sheet"
        method="get"
        className="flex flex-col gap-3 border-t border-line pt-3.5"
      >
        <SelectField label="Sticker size" name="size" defaultValue="card">
          <option value="card">4x6 card</option>
          <option value="a5">A5 standee</option>
          <option value="small">Small sticker</option>
        </SelectField>
        <button type="submit" className={buttonClass("secondary", "")}>
          <Icon d={ICON_DOWNLOAD} />
          Print sheet (PDF)
        </button>
      </form>
      <p className="m-0 text-[13px] text-muted">
        Codes avoid look-alike letters. Until a code is assigned, scanning it shows a friendly page
        that says it is not activated yet, with your WhatsApp contact.
      </p>
    </Card>
  );
}
