import { useState } from "react";
import { Button } from "../button";
import { Card, CardHeading } from "../card";
import { FieldRow, TextField } from "../form-field";
import { ICON_EYE } from "../icons";
import { Switch } from "../switch";
import type { TabProps } from "./state";

// Password managers (1Password, LastPass, Bitwarden) fill these fields on their
// own, which the editor would count as an edit. These are the attributes they
// document for staying out.
const NO_AUTOFILL = {
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

export function OffersTab({ state, set }: TabProps) {
  const { offer, banner, wifi } = state;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <CardHeading
          title="Offer"
          description="A ticket the customer can show at the desk."
          action={
            <Switch
              checked={offer.enabled}
              onChange={(enabled) => set("offer", { ...offer, enabled })}
              label={`Offer ${offer.enabled ? "on" : "off"}`}
            />
          }
        />
        <FieldRow>
          <TextField
            label="Title"
            autoComplete="off"
            value={offer.title}
            onChange={(e) => set("offer", { ...offer, title: e.target.value })}
          />
          <TextField
            label="Code"
            autoComplete="off"
            className="font-code text-[13px]"
            value={offer.code}
            onChange={(e) => set("offer", { ...offer, code: e.target.value })}
          />
        </FieldRow>
        <FieldRow>
          <TextField
            label="Small print"
            autoComplete="off"
            value={offer.note}
            onChange={(e) => set("offer", { ...offer, note: e.target.value })}
          />
          <TextField
            label="Valid until"
            type="date"
            value={offer.validUntil}
            onChange={(e) => set("offer", { ...offer, validUntil: e.target.value })}
          />
        </FieldRow>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <CardHeading
          title="Festival banner"
          description="A short greeting shown above the buttons for a set period."
          action={
            <Switch
              checked={banner.enabled}
              onChange={(enabled) => set("banner", { ...banner, enabled })}
              label={`Banner ${banner.enabled ? "on" : "off"}`}
            />
          }
        />
        <FieldRow>
          <TextField
            label="Message"
            autoComplete="off"
            placeholder="[festival greeting]"
            value={banner.message}
            onChange={(e) => set("banner", { ...banner, message: e.target.value })}
          />
          <TextField
            label="Show from and to"
            placeholder="[start date] to [end date]"
            value={banner.period}
            onChange={(e) => set("banner", { ...banner, period: e.target.value })}
          />
        </FieldRow>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <CardHeading
          title="Wi-Fi"
          description="Use the guest network. Phones cannot join with one tap, so the page copies the password."
          action={
            <Switch
              checked={wifi.enabled}
              onChange={(enabled) => set("wifi", { ...wifi, enabled })}
              label={`Wi-Fi ${wifi.enabled ? "on" : "off"}`}
            />
          }
        />
        <FieldRow>
          <TextField
            label="Network name"
            placeholder="[guest network]"
            autoComplete="off"
            {...NO_AUTOFILL}
            value={wifi.network}
            onChange={(e) => set("wifi", { ...wifi, network: e.target.value })}
          />
          <div className="min-w-0 flex-[1_1_240px]">
            <div className="flex items-end gap-2">
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...NO_AUTOFILL}
                value={wifi.password}
                onChange={(e) => set("wifi", { ...wifi, password: e.target.value })}
              />
              <Button
                icon={ICON_EYE}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              />
            </div>
          </div>
        </FieldRow>
      </Card>
    </>
  );
}
