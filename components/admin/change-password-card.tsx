"use client";

import { useTransition } from "react";
import { changeMyPassword } from "@/app/qr/admin/settings/actions";
import { buttonClass } from "./button";
import { Card, CardHeading } from "./card";
import { TextField } from "./form-field";
import { notify } from "./notify";

// Every account can change its own password. A new account starts with a
// temporary one from the owner, so this is the first thing to do after signing in.
export function ChangePasswordCard() {
  const [pending, startTransition] = useTransition();

  return (
    <Card aria-label="Your password" className="flex flex-col gap-3.5 p-5">
      <CardHeading title="Your password" description="Other devices where you are signed in are signed out." />
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          startTransition(async () => {
            const result = await changeMyPassword(data.get("current"), data.get("next"));
            if (result.ok) form.reset();
            notify(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
          });
        }}
      >
        <div className="flex flex-wrap gap-4">
          <TextField label="Current password" name="current" type="password" required autoComplete="current-password" />
          <TextField label="New password (12 or more characters)" name="next" type="password" required autoComplete="new-password" />
        </div>
        <div>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </Card>
  );
}
