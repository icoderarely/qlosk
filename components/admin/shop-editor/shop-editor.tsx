"use client";

import type { ShopPlanData } from "@/services/billing";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { changeShopStatusAction, publishShopPage, saveShopDraft } from "@/app/admin/shops/editor-actions";
import { saveStandee } from "@/app/admin/shops/standee-actions";
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
import { notify } from "../notify";
import { Preview } from "./preview";
import { QrPlanTab, type QrChoices } from "./qr-plan-tab";
import type { EditorState, SetEditor } from "./state";
import { StandeePreviewCard, StandeeTab, type StandeeQr } from "./standee-tab";

import type { TabId } from "./tabs";

export type { TabId };

const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "buttons", label: "Buttons" },
  { id: "look", label: "Look" },
  { id: "offers", label: "Offers and Wi-Fi" },
  { id: "standee", label: "Standee" },
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
  standeeQr,
  initialTab,
}: {
  data: ShopEditorData;
  shopTypes: ShopTypeOption[];
  canEdit: boolean;
  enabledThemes: ThemeId[];
  enabledLayouts: LayoutId[];
  qrChoices: QrChoices;
  billing: ShopPlanData | null;
  /** The shop's QR as drawn on the standee (or why there is none). */
  standeeQr: StandeeQr;
  /** From ?tab= on the address, such as the QR codes list opening the Standee tab. */
  initialTab?: TabId;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shopId, setShopId] = useState(data.id);
  const [tab, setTab] = useState<TabId>(data.id === null ? "details" : (initialTab ?? "buttons"));
  const [state, setState] = useState<EditorState>(data.values);
  const [saved, setSaved] = useState(() => JSON.stringify(data.values));
  const [hasUnpublished, setHasUnpublished] = useState(data.hasUnpublished);
  const [published, setPublished] = useState(data.published);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(state) !== saved;

  // The standee's choices are saved on the shop itself, apart from the draft page.
  const [standee, setStandee] = useState(data.standee);
  const [standeeSaved, setStandeeSaved] = useState(() => JSON.stringify(data.standee));
  const [savingStandee, startSavingStandee] = useTransition();
  const standeeDirty = JSON.stringify(standee) !== standeeSaved;

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
  const serverStandee = JSON.stringify(data.standee);
  const [seenStandee, setSeenStandee] = useState(serverStandee);
  if (seenStandee !== serverStandee) {
    setSeenStandee(serverStandee);
    if (!standeeDirty) {
      setStandee(data.standee);
      setStandeeSaved(serverStandee);
    }
  }

  // Leaving with edits that were never saved loses them, so ask first.
  const unsaved = dirty || standeeDirty;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const set: SetEditor = (key, value) => {
    setMessage(null);
    setState((s) => ({ ...s, [key]: value }));
  };
  const suggestion = shopTypes.find((t) => t.label === state.details.shopType) ?? null;
  const name = state.details.name.trim() || "New shop";

  function saveStandeeChoices() {
    if (shopId === null) return;
    startSavingStandee(async () => {
      try {
        const result = await saveStandee(shopId, standee);
        notify(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
        if (result.ok) {
          setStandeeSaved(JSON.stringify(standee));
          router.refresh();
        }
      } catch {
        notify({ ok: false, text: "You do not have permission to change shops." });
      }
    });
  }

  // Go live / Take offline. Both act on the saved shop, not on unsaved edits.
  const [changingStatus, startStatusChange] = useTransition();
  function changeStatus(op: "golive" | "resume" | "pause") {
    if (shopId === null) return;
    startStatusChange(async () => {
      try {
        const result = await changeShopStatusAction(shopId, op);
        notify(
          result.ok
            ? { ok: true, text: op === "pause" ? "Shop is offline. Its public page and QR are not reachable." : "Shop is live." }
            : { ok: false, text: result.error },
        );
        if (result.ok) router.refresh();
      } catch {
        notify({ ok: false, text: "You do not have permission to change shops." });
      }
    });
  }
  const offline = data.status === "paused";
  const canGoLive = offline || data.status === "building" || data.status === "preview";
  const canTakeOffline = data.status === "live" || data.status === "quiet" || data.status === "expired";

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
          {canEdit && shopId !== null && canGoLive ? (
            <Button
              disabled={pending || changingStatus || (!offline && !published)}
              onClick={() => changeStatus(offline ? "resume" : "golive")}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go live
            </Button>
          ) : null}
          {canEdit && shopId !== null && canTakeOffline ? (
            <Button disabled={pending || changingStatus} onClick={() => changeStatus("pause")}>
              Take offline
            </Button>
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
            {tab === "standee" ? (
              shopId === null ? (
                <p className="m-0 text-[13px] text-muted">Save the shop first, then assign a QR code to design its standee.</p>
              ) : (
                <StandeeTab
                  state={state}
                  set={set}
                  choices={standee}
                  setChoices={setStandee}
                  code={data.code}
                  dirty={standeeDirty}
                  saving={savingStandee}
                  onSave={saveStandeeChoices}
                  canEdit={canEdit}
                />
              )
            ) : null}
            {tab === "qrplan" ? (
              <QrPlanTab
                state={state}
                set={set}
                info={{ shopId, status: data.status, code: data.code, plan: data.plan }}
                choices={qrChoices}
                billing={billing}
                canEdit={canEdit}
                onOpenStandee={() => setTab("standee")}
                qrSvg={standeeQr.svg}
              />
            ) : null}
            {tab === "activity" ? (
              <ActivityTab shopId={shopId} changes={data.changes} traffic={data.traffic} canEdit={canEdit} />
            ) : null}
          </div>
        </fieldset>

        {tab === "standee" && shopId !== null ? (
          <StandeePreviewCard state={state} set={set} choices={standee} qr={standeeQr} shopId={shopId} canDownload={canEdit} />
        ) : (
          <Preview state={state} />
        )}
      </div>
    </>
  );
}
