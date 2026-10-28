"use client";

import { useState, useTransition } from "react";
import {
  addTeamAccount,
  changeTeamRole,
  removeTeamAccount,
  resetTeamPassword,
} from "@/app/qr/admin/settings/actions";
import { Button, buttonClass } from "./button";
import { Card, CardHeading } from "./card";
import { Chip } from "./chip";
import { SelectField, TextField } from "./form-field";
import { ICON_PLUS } from "./icons";
import type { TeamMember } from "@/services/team";
import { notify } from "./notify";

type Open = { kind: "add" } | { kind: "reset" | "remove"; id: string } | null;

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-2.5">{children}</div>;
}

// Team accounts. Everyone with a role can see the list; only the owner gets the
// controls. Removing an account takes effect on its next request.
export function TeamAccounts({ members, canManage }: { members: TeamMember[]; canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<Open>(null);

  function run(action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, close = true) {
    startTransition(async () => {
      const result = await action();
      notify(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
      if (result.ok && close) setOpen(null);
    });
  }

  return (
    <Card aria-label="Team accounts" className="flex flex-col gap-2 p-5">
      <CardHeading
        title="Team accounts"
        description="Accounts that can sign in. Only the owner can add or remove them."
        action={
          canManage ? (
            <Button icon={ICON_PLUS} aria-expanded={open?.kind === "add"} onClick={() => setOpen(open?.kind === "add" ? null : { kind: "add" })}>
              Add account
            </Button>
          ) : null
        }
      />

      {open?.kind === "add" ? (
        <form
          className="flex flex-col gap-3.5 rounded-xl bg-ground p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            run(async () => {
              const result = await addTeamAccount({
                username: data.get("username"),
                password: data.get("password"),
                role: data.get("role"),
              });
              if (result.ok) form.reset();
              return result;
            });
          }}
        >
          <div className="flex flex-wrap gap-4">
            <TextField label="Username" name="username" required autoComplete="off" autoCapitalize="none" spellCheck={false} />
            <TextField label="Temporary password (12 or more characters)" name="password" type="password" required autoComplete="new-password" />
            <SelectField label="Role" name="role" defaultValue="viewer">
              <option value="viewer">Viewer: can look, cannot change</option>
              <option value="admin">Admin: can change shops and settings</option>
            </SelectField>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" disabled={pending} className={buttonClass("primary")}>
              {pending ? "Adding…" : "Add account"}
            </button>
            <Button onClick={() => setOpen(null)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <ul className="m-0 list-none p-0">
        {members.map((m) => (
          <li key={m.id}>
            <Row>
              <span className="font-semibold">{m.username}</span>
              <div className="flex flex-wrap items-center gap-2">
                {m.role === "owner" || !canManage ? (
                  <Chip tone={m.role === "owner" ? "green" : m.role === "admin" ? "blue" : "neutral"}>
                    {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Viewer"}
                  </Chip>
                ) : (
                  <SelectField
                    block
                    hideLabel
                    label={`Role for ${m.username}`}
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => run(() => changeTeamRole(m.id, e.target.value), false)}
                  >
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </SelectField>
                )}
                {canManage ? (
                  <Button disabled={pending} aria-expanded={open?.kind === "reset" && open.id === m.id} onClick={() => setOpen({ kind: "reset", id: m.id })} aria-label={`Reset password for ${m.username}`}>
                    Reset password
                  </Button>
                ) : null}
                {canManage && m.role !== "owner" ? (
                  <Button variant="danger" disabled={pending} aria-expanded={open?.kind === "remove" && open.id === m.id} onClick={() => setOpen({ kind: "remove", id: m.id })} aria-label={`Remove ${m.username}`}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </Row>
            {open?.kind === "reset" && open.id === m.id ? (
              <form
                className="mb-2 flex flex-wrap items-end gap-2.5 rounded-xl bg-ground p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const password = new FormData(form).get("password");
                  run(async () => {
                    const result = await resetTeamPassword(m.id, password);
                    if (result.ok) form.reset();
                    return result;
                  });
                }}
              >
                <div className="min-w-0 flex-[1_1_260px]">
                  <TextField block label={`New password for ${m.username} (12 or more characters)`} name="password" type="password" required autoComplete="new-password" />
                </div>
                <button type="submit" disabled={pending} className={buttonClass("primary")}>
                  Set password
                </button>
                <Button onClick={() => setOpen(null)}>Cancel</Button>
              </form>
            ) : null}
            {open?.kind === "remove" && open.id === m.id ? (
              <div className="mb-2 flex flex-wrap items-center gap-2.5 rounded-xl bg-ground p-4">
                <span className="font-semibold">Remove {m.username}? They are signed out at once and cannot sign in again.</span>
                <Button variant="danger" disabled={pending} onClick={() => run(() => removeTeamAccount(m.id))}>
                  Yes, remove
                </Button>
                <Button onClick={() => setOpen(null)}>Cancel</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
