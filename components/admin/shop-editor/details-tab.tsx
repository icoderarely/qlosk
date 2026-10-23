import { Card, CardHeading } from "../card";
import { FieldRow, SelectField, TextField, TextareaField } from "../form-field";
import { initials } from "../../shop-page/links";
import type { ShopTypeOption } from "@/services/settings";
import { newLink } from "@/services/shop-editor";
import type { LinkType } from "../../shop-page/types";
import { ImageUpload } from "./image-upload";
import type { TabProps } from "./state";

const SECTION = "flex flex-col gap-4";

export function DetailsTab({
  state,
  set,
  shopTypes,
  shopId,
}: TabProps & { shopTypes: ShopTypeOption[]; shopId: string | null }) {
  const d = state.details;
  // The Google review and Instagram fields are the targets of those buttons, so
  // they read and write the Buttons tab's list instead of keeping a copy.
  const targetOf = (type: LinkType) => state.links.find((l) => l.type === type)?.target ?? "";
  const setTarget = (type: LinkType, target: string) => {
    const has = state.links.some((l) => l.type === type);
    if (has) {
      let done = false;
      set(
        "links",
        state.links.map((l) => {
          if (l.type !== type || done) return l;
          done = true;
          return { ...l, target };
        }),
      );
    } else if (target) {
      set("links", [...state.links, { ...newLink(type), target }]);
    }
  };
  const upd = (patch: Partial<typeof d>) => set("details", { ...d, ...patch });
  const typeLabels = shopTypes.map((t) => t.label);
  if (!typeLabels.includes(d.shopType)) typeLabels.push(d.shopType);

  return (
    <>
      <Card className={`p-5 ${SECTION}`}>
        <CardHeading title="Business" description="Shown at the top of the page." />
        <FieldRow>
          <TextField label="Shop name" value={d.name} onChange={(e) => upd({ name: e.target.value })} />
          <TextField label="Tagline" value={d.tagline} onChange={(e) => upd({ tagline: e.target.value })} />
        </FieldRow>
        <FieldRow>
          <SelectField label="Shop type" value={d.shopType} onChange={(e) => upd({ shopType: e.target.value })}>
            {typeLabels.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </SelectField>
          <TextField label="Area and city" value={d.areaCity} onChange={(e) => upd({ areaCity: e.target.value })} />
        </FieldRow>
        <TextField
          block
          label="Full address"
          placeholder="[street address]"
          value={d.address}
          onChange={(e) => upd({ address: e.target.value })}
        />
      </Card>

      <Card className={`p-5 ${SECTION}`}>
        <CardHeading title="Contact and links" description="These feed the buttons on the page." />
        <FieldRow>
          <TextField
            label="Phone number"
            type="tel"
            placeholder="[with STD code for landlines]"
            value={d.phone}
            onChange={(e) => upd({ phone: e.target.value })}
          />
          <TextField
            label="WhatsApp number"
            type="tel"
            placeholder="[mobile number]"
            value={d.whatsapp}
            onChange={(e) => upd({ whatsapp: e.target.value })}
          />
        </FieldRow>
        <TextareaField
          block
          label="WhatsApp message, pre-filled for the customer"
          value={d.waMessage}
          onChange={(e) => upd({ waMessage: e.target.value })}
        />
        <FieldRow>
          <TextField
            label="Google review link"
            type="url"
            placeholder="[from the Google Business profile]"
            value={targetOf("google_review")}
            onChange={(e) => setTarget("google_review", e.target.value)}
          />
          <TextField
            label="Instagram handle or link"
            placeholder="[@handle]"
            value={targetOf("instagram")}
            onChange={(e) => setTarget("instagram", e.target.value)}
          />
        </FieldRow>
        <p className="m-0 text-[13px] text-muted">
          The review button opens the Google review form for everyone. There is no filtering by
          rating and no rewards for reviews.
        </p>
      </Card>

      <Card className={`p-5 ${SECTION}`}>
        <CardHeading title="Logo and cover" />
        <FieldRow>
          <ImageUpload
            kind="logo"
            label="Logo"
            shopId={shopId}
            value={d.logoUrl}
            onChange={(logoUrl) => upd({ logoUrl })}
            shape="round"
            empty={
              <div
                aria-hidden="true"
                className="flex size-full items-center justify-center bg-accent text-2xl font-extrabold text-white"
              >
                {initials(d.name)}
              </div>
            }
          />
          <ImageUpload
            kind="cover"
            label="Cover photo"
            shopId={shopId}
            value={d.coverUrl}
            onChange={(coverUrl) => upd({ coverUrl })}
            shape="wide"
            empty={
              <div className="flex size-full items-center justify-center bg-line-soft text-xs font-semibold text-muted">
                No cover yet
              </div>
            }
          />
        </FieldRow>
      </Card>

      <Card className={`p-5 ${SECTION}`}>
        <CardHeading title="Owner and requests" description="Internal only. Never shown to customers." />
        <FieldRow>
          <TextField
            label="Owner name"
            placeholder="[name]"
            value={d.ownerName}
            onChange={(e) => upd({ ownerName: e.target.value })}
          />
          <TextField
            label="Owner WhatsApp"
            type="tel"
            placeholder="[number]"
            value={d.ownerWhatsapp}
            onChange={(e) => upd({ ownerWhatsapp: e.target.value })}
          />
        </FieldRow>
        <TextareaField
          block
          label="Requests and notes"
          placeholder="Paste what the owner asked for here, with the date."
          value={d.notes}
          onChange={(e) => upd({ notes: e.target.value })}
        />
      </Card>
    </>
  );
}
