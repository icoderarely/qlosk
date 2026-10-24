"use client";

import type { ShopPlanData } from "@/services/billing";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { publishShopPage, saveShopDraft } from "@/app/admin/shops/editor-actions";
import { Button, LinkButton } from "../button";
import { Chip } from "../chip";
import { ICON_ARROW_LEFT, ICON_EXTERNAL } from "../icons";
import { StatusChip } from "../status-chip";
import { TabBar, panelDomId, tabDomId } from "../tab-bar";
import type { ShopEditorData } from "@/services/shop-editor";
import type { LayoutId, ThemeId } from "../../shop-page/types";
import type { ShopTypeOption } from "@/services/settings";
import { ActivityTab } from "./activity-tab";
import { ButtonsTab } from "./buttons-tab";
import { DetailsTab } from "./details-tab";
import { LookTab } from "./look-tab";
import { OffersTab } from "./offers-tab";
import { Preview } from "./preview";
import { QrPlanTab, type QrChoices } from "./qr-plan-tab";
import type { EditorState, SetEditor } from "./state";

type TabId = "details" | "buttons" | "look" | "offers" | "qrplan" | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "buttons", label: "Buttons" },
  { id: "look", label: "Look" },
  { id: "offers", label: "Offers and Wi-Fi" },
  { id: "qrplan", label: "QR and plan" },
  { id: "activity", label: "Activity" },
];

const ID_PREFIX = "editor";

// Shop editor for /admin/shops/[id] and /admin/shops/new. Everything typed or
// picked lives in local state and feeds the real ShopPage preview. Save draft
// writes the draft page; Publish saves, then copies the draft to the published
// page.
export function ShopEditor({
  data,
  shopTypes,
  canEdit,
  enabledThemes,
  enabledLayouts,
  qrChoices,
  billing,
}: {
  data: ShopEditorData;
  shopTypes: ShopTypeOption[];
  canEdit: boolean;
  enabledThemes: ThemeId[];
  enabledLayouts: LayoutId[];
  qrChoices: QrChoices;
  billing: ShopPlanData | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shopId, setShopId] = useState(data.id);
  const [tab, setTab] = useState<TabId>(data.id === null ? "details" : "buttons");
  const [state, setState] = useState<EditorState>(data.values);
  const [saved, setSaved] = useState(() => JSON.stringify(data.values));
  const [hasUnpublished, setHasUnpublished] = useState(data.hasUnpublished);
  const [published, setPublished] = useState(data.published);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(state) !== saved;

  // The page data is reloaded after a save, an Undo or a status change. When it
  // changes and there are no unsaved edits, take it (an Undo changes the draft);
  // with unsaved edits, keep what is on screen.
  const serverJson = JSON.stringify(data.values);
  const [seenServer, setSeenServer] = useState(serverJson);
  if (seenServer !== serverJson) {
    setSeenServer(serverJson);
    setHasUnpublished(data.hasUnpublished);
    setPublished(data.published);
    if (!dirty) {
      setState(data.values);
      setSaved(serverJson);
    }
  }

  // Leaving with edits that were never saved loses them, so ask first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set: SetEditor = (key, value) => {
    setMessage(null);
    setState((s) => ({ ...s, [key]: value }));
  };
  const suggestion = shopTypes.find((t) => t.label === state.details.shopType) ?? null;
  const name = state.details.name.trim() || "New shop";

  function submit(kind: "save" | "publish") {
    setMessage(null);
    startTransition(async () => {
      try {
        const run = kind === "save" ? saveShopDraft : publishShopPage;
        const result = await run(shopId, state);
        if (!result.ok) {
          setMessage({ ok: false, text: result.error });
          return;
        }
        // Take back what the server cleaned up (slug, button links).
        const next = { ...state, slug: result.slug, links: result.links };
        setState(next);
        setSaved(JSON.stringify(next));
        setHasUnpublished(result.hasUnpublished);
        setPublished(result.published);
        setMessage({ ok: true, text: result.message });
        if (shopId === null) {
          setShopId(result.id);
          router.replace(`/admin/shops/${result.id}`);
        } else {
          router.refresh();
        }
      } catch {
        setMessage({ ok: false, text: "You do not have permission to change shops." });
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <LinkButton
            href="/admin/shops"
            variant="ghost"
            icon={ICON_ARROW_LEFT}
            className="self-start px-0 text-menu"
          >
            All shops
          </LinkButton>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.01em]">{name}</h1>
            <StatusChip status={data.status} />
            {dirty ? <Chip tone="blue">Unsaved edits</Chip> : null}
            {!dirty && hasUnpublished ? <Chip tone="amber">Unpublished changes</Chip> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {published ? (
            <LinkButton
              href={`/s/${state.slug}`}
              target="_blank"
              rel="noreferrer"
              icon={ICON_EXTERNAL}
            >
              Open live page
            </LinkButton>
          ) : null}
          {canEdit ? (
            <>
              <Button disabled={pending || !dirty} onClick={() => submit("save")} className="disabled:cursor-not-allowed disabled:opacity-50">
                Save draft
              </Button>
              <Button
                variant="primary"
                disabled={pending || (!dirty && !hasUnpublished && published)}
                onClick={() => submit("publish")}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Working" : "Publish changes"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div
        role={message && !message.ok ? "alert" : "status"}
        className={message ? `font-bold ${message.ok ? "" : "text-chip-over-fg"}` : "sr-only"}
      >
        {message?.text}
      </div>
      {!canEdit ? (
        <p className="m-0 text-[13px] text-muted">You have view-only access, so changes are not saved.</p>
      ) : null}

      <TabBar
        tabs={TABS}
        value={tab}
        onChange={setTab}
        label="Shop sections"
        idPrefix={ID_PREFIX}
      />

      <div className="flex flex-wrap items-start gap-5">
        <fieldset
          disabled={!canEdit}
          className="m-0 min-w-0 flex-[3_1_520px] border-0 p-0"
        >
          <div
            role="tabpanel"
            id={panelDomId(ID_PREFIX, tab)}
            aria-labelledby={tabDomId(ID_PREFIX, tab)}
            className="flex min-w-0 flex-col gap-4"
          >
            {tab === "details" ? (
              <DetailsTab state={state} set={set} shopTypes={shopTypes} shopId={shopId} />
            ) : null}
            {tab === "buttons" ? <ButtonsTab state={state} set={set} /> : null}
            {tab === "look" ? (
              <LookTab
                state={state}
                set={set}
                suggestion={suggestion}
                enabledThemes={enabledThemes}
                enabledLayouts={enabledLayouts}
              />
            ) : null}
            {tab === "offers" ? <OffersTab state={state} set={set} /> : null}
            {tab === "qrplan" ? (
              (
              <QrPlanTab
                state={state}
                set={set}
                info={{ shopId, status: data.status, code: data.code, plan: data.plan }}
                choices={qrChoices}
                billing={billing}
                canEdit={canEdit}
              />
            )
            ) : null}
            {tab === "activity" ? (
              <ActivityTab shopId={shopId} changes={data.changes} traffic={data.traffic} canEdit={canEdit} />
            ) : null}
          </div>
        </fieldset>

        <Preview state={state} />
      </div>
    </>
  );
}
