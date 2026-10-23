"use client";

import { useState } from "react";
import { Button, LinkButton } from "../button";
import { Chip } from "../chip";
import { ICON_ARROW_LEFT, ICON_EXTERNAL } from "../icons";
import { StatusChip } from "../status-chip";
import { TabBar, panelDomId, tabDomId } from "../tab-bar";
import type { ShopEditorData } from "@/services/shops";
import type { ShopTypeOption } from "@/services/settings";
import { ActivityTab } from "./activity-tab";
import { ButtonsTab } from "./buttons-tab";
import { DetailsTab } from "./details-tab";
import { LookTab } from "./look-tab";
import { OffersTab } from "./offers-tab";
import { Preview } from "./preview";
import { QrPlanTab } from "./qr-plan-tab";
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
// picked lives in local state and feeds the real ShopPage preview. Nothing is
// saved: the buttons in the header carry TODOs for slice 4.
export function ShopEditor({
  data,
  shopTypes,
}: {
  data: ShopEditorData;
  shopTypes: ShopTypeOption[];
}) {
  const isNew = data.id === null;
  const [tab, setTab] = useState<TabId>(isNew ? "details" : "look");
  const [state, setState] = useState<EditorState>({
    details: data.details,
    slug: data.slug,
    links: data.links,
    look: data.look,
    buttonColor: null,
    language: "English",
    offer: data.offer,
    banner: data.banner,
    wifi: data.wifi,
  });

  const set: SetEditor = (key, value) => setState((s) => ({ ...s, [key]: value }));
  const suggestion = shopTypes.find((t) => t.label === state.details.shopType) ?? null;

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
            <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.01em]">
              {data.details.name || "New shop"}
            </h1>
            <StatusChip status={data.status} />
            <Chip tone="amber">Unpublished changes</Chip>
          </div>
        </div>
        {/* TODO(slice 4): open the live page, save the draft, publish */}
        <div className="flex flex-wrap gap-2.5">
          <Button icon={ICON_EXTERNAL}>Open live page</Button>
          <Button>Save draft</Button>
          <Button variant="primary">Publish changes</Button>
        </div>
      </div>

      <TabBar
        tabs={TABS}
        value={tab}
        onChange={setTab}
        label="Shop sections"
        idPrefix={ID_PREFIX}
      />

      <div className="flex flex-wrap items-start gap-5">
        <div
          role="tabpanel"
          id={panelDomId(ID_PREFIX, tab)}
          aria-labelledby={tabDomId(ID_PREFIX, tab)}
          className="flex min-w-0 flex-[3_1_520px] flex-col gap-4"
        >
          {tab === "details" ? (
            <DetailsTab state={state} set={set} shopTypes={shopTypes} />
          ) : null}
          {tab === "buttons" ? <ButtonsTab state={state} set={set} /> : null}
          {tab === "look" ? <LookTab state={state} set={set} suggestion={suggestion} /> : null}
          {tab === "offers" ? <OffersTab state={state} set={set} /> : null}
          {tab === "qrplan" ? (
            <QrPlanTab
              state={state}
              set={set}
              info={{
                code: data.code,
                plan: data.plan,
                renewsOn: data.renewsOn,
                payment: data.payment,
              }}
            />
          ) : null}
          {tab === "activity" ? (
            <ActivityTab changes={data.changes} traffic={data.traffic} />
          ) : null}
        </div>

        <Preview state={state} />
      </div>
    </>
  );
}
