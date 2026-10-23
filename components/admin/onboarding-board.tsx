"use client";

import { useRef, useState, useTransition } from "react";
import { addLead, moveShopStage } from "@/app/admin/onboarding/actions";
import { ActionLink } from "./action-link";
import { Button, buttonClass } from "./button";
import { Card } from "./card";
import { Chip } from "./chip";
import { TextField, TextareaField } from "./form-field";
import { ICON_PLUS } from "./icons";
import { PageHeader } from "./page-header";
import { ONBOARDING_STAGES, STAGE_INFO, type BoardCard, type OnboardingData } from "@/services/onboarding";

type Notice = { ok: boolean; text: string } | null;

// Cards move with a button menu, never by dragging, so the board works with a
// keyboard and a screen reader. The menu is a disclosure: a button that shows a
// list of buttons, closed again with Escape.
function MoveMenu({
  card,
  stage,
  onMove,
  disabled,
}: {
  card: BoardCard;
  stage: string;
  onMove: (stage: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = `move-${card.id}`;

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <Button
        ref={trigger}
        variant="ghost"
        className="w-full border-field"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Move ${card.name} to another column`}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        Move to…
      </Button>
      {open ? (
        <ul id={id} className="m-0 mt-1 flex list-none flex-col gap-1 rounded-[10px] border border-line bg-white p-1.5">
          {ONBOARDING_STAGES.filter((s) => s !== stage).map((s) => (
            <li key={s}>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  onMove(s);
                }}
              >
                {STAGE_INFO[s].title}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NewLeadForm({ onDone }: { onDone: (notice: Notice) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card aria-label="New lead" className="p-5">
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          setError(null);
          startTransition(async () => {
            const result = await addLead({
              name: data.get("name"),
              shopType: data.get("shopType"),
              whatsapp: data.get("whatsapp"),
              note: data.get("note"),
            });
            if (result.ok) {
              form.reset();
              onDone({ ok: true, text: "Lead added to the Lead column." });
            } else {
              setError(result.error);
            }
          });
        }}
      >
        <h2 className="m-0 text-base font-extrabold">New lead</h2>
        <div className="flex flex-wrap gap-4">
          <TextField label="Shop name" name="name" required maxLength={120} autoComplete="off" />
          <TextField label="Type of shop" name="shopType" placeholder="Salon, cafe, clinic" maxLength={60} />
          <TextField label="Owner's WhatsApp" name="whatsapp" inputMode="tel" placeholder="98200 12345" maxLength={30} />
        </div>
        <TextareaField label="Note (internal)" name="note" placeholder="How did they find us? What did they ask for?" maxLength={500} />
        <p role="alert" className="m-0 text-[13px] font-semibold text-chip-over-fg">
          {error}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Adding…" : "Add lead"}
          </button>
          <Button onClick={() => onDone(null)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export function OnboardingBoard({ data, canEdit }: { data: OnboardingData; canEdit: boolean }) {
  const { today, columns } = data;
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  function move(card: BoardCard, stage: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await moveShopStage(card.id, stage);
      setNotice(
        result.ok
          ? { ok: true, text: `${card.name} moved to ${STAGE_INFO[stage as keyof typeof STAGE_INFO].title}.` }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <>
      <PageHeader
        title="Onboarding"
        subtitle="From first message to a live standee, one board for every shop."
        actions={
          canEdit ? (
            <Button variant="primary" icon={ICON_PLUS} aria-expanded={adding} onClick={() => setAdding(!adding)}>
              New lead
            </Button>
          ) : null
        }
      />

      {adding && canEdit ? (
        <NewLeadForm
          onDone={(n) => {
            setAdding(false);
            setNotice(n);
          }}
        />
      ) : null}

      <p role="status" className={`m-0 min-h-5 text-[13px] font-semibold ${notice?.ok === false ? "text-chip-over-fg" : "text-chip-live-fg"}`}>
        {notice?.text}
      </p>

      <Card aria-label="Today" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
        <h2 className="m-0 text-[15px] font-extrabold">Today</h2>
        <div className="flex flex-[1_1_400px] flex-wrap gap-2.5">
          {today.length === 0 ? <span className="text-muted">Nothing waiting today.</span> : null}
          {today.map((task) => (
            <ActionLink key={task.label} href={task.href} external={task.external} className="rounded-full">
              {task.label}
            </ActionLink>
          ))}
        </div>
        <span className="text-[13px] text-muted">
          {today.length} {today.length === 1 ? "task" : "tasks"}
        </span>
      </Card>

      <div className="flex flex-wrap items-start gap-3.5">
        {columns.map((col) => (
          <section
            key={col.stage}
            aria-label={col.title}
            className="flex min-w-0 flex-[1_1_190px] flex-col gap-2.5 rounded-[14px] bg-column p-3"
          >
            <div className="px-1 pt-0.5 pb-1">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-sm font-extrabold">{col.title}</h2>
                <span className="min-w-6 rounded-full bg-white px-2 py-px text-center text-xs font-bold text-menu">
                  {col.cards.length}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">{col.hint}</div>
            </div>
            {col.cards.length === 0 ? <p className="m-0 px-1 text-xs text-muted">Empty.</p> : null}
            {col.cards.map((card) => (
              <article key={card.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3.5">
                <div>
                  <div className="font-bold">{card.name}</div>
                  <div className="text-xs text-muted">{card.sub}</div>
                </div>
                <div>
                  <Chip tone={card.tone}>{card.tag}</Chip>
                </div>
                <ActionLink
                  href={card.action.href}
                  external={card.action.external}
                  variant={card.primary ? "primary" : "secondary"}
                  label={`${card.action.label}: ${card.name}`}
                >
                  {card.action.label}
                </ActionLink>
                {canEdit ? <MoveMenu card={card} stage={col.stage} disabled={pending} onMove={(s) => move(card, s)} /> : null}
              </article>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
