import { useState, useTransition } from "react";
import { lookupQuickSetup } from "@/app/admin/shops/quick-setup-actions";
import { applySuggestions, type FieldKey, type SuggestedField } from "@/services/quick-setup";
import { Button } from "../button";
import { Card, CardHeading } from "../card";
import { TextareaField } from "../form-field";
import { notify } from "../notify";
import type { EditorState, TabProps } from "./state";

const LINK_TYPE: Partial<Record<FieldKey, "maps" | "google_review" | "website" | "instagram">> = {
  maps: "maps",
  review: "google_review",
  website: "website",
  instagram: "instagram",
};

// What the editor holds now for a suggested field, so a filled one is not ticked by default.
function currentValue(state: EditorState, key: FieldKey): string {
  const d = state.details;
  const type = LINK_TYPE[key];
  if (type) return state.links.find((l) => l.type === type)?.target ?? "";
  if (key === "name") return d.name;
  if (key === "address") return d.address;
  if (key === "phone") return d.phone;
  if (key === "whatsapp") return d.whatsapp;
  return d.waMessage;
}

type Review = { fields: SuggestedField[]; ticked: Set<FieldKey>; placeFound: boolean; unknown: string[]; note: string | null };

// Paste links, look the business up, tick what to use. Applying only fills the
// editor; Save draft or Publish stores it like any other edit.
export function QuickSetupTab({ state, set }: TabProps) {
  const [text, setText] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function lookup() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await lookupQuickSetup({ text, currentName: state.details.name });
        if (!result.ok) {
          setReview(null);
          setError(result.error);
          return;
        }
        setReview({
          fields: result.fields,
          ticked: new Set(result.fields.filter((f) => !currentValue(state, f.key).trim()).map((f) => f.key)),
          placeFound: result.placeFound,
          unknown: result.unknown,
          note: result.note,
        });
      } catch {
        setError("You do not have permission to change shops.");
      }
    });
  }

  function toggle(key: FieldKey) {
    if (!review) return;
    const ticked = new Set(review.ticked);
    if (!ticked.delete(key)) ticked.add(key);
    setReview({ ...review, ticked });
  }

  function apply() {
    if (!review) return;
    const chosen = review.fields.filter((f) => review.ticked.has(f.key));
    const next = applySuggestions(state, chosen);
    set("details", next.details);
    set("links", next.links);
    notify({ ok: true, text: `Filled ${chosen.length} ${chosen.length === 1 ? "field" : "fields"}. Check them, add the logo, then save.` });
    setReview(null);
    setText("");
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <CardHeading
          title="Quick setup"
          description="Paste a Google share or Maps link, plus an Instagram link or website if you have them. Add the logo yourself in Details."
        />
        <TextareaField
          block
          label="Links"
          placeholder={"https://share.google/...\nhttps://instagram.com/..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div>
          <Button variant="primary" disabled={pending || !text.trim()} onClick={lookup} className="disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "Looking up" : "Fetch details"}
          </Button>
        </div>
        <div role={error ? "alert" : "status"} className={error ? "font-bold text-chip-over-fg" : "sr-only"}>
          {error}
        </div>
      </Card>

      {review ? (
        <Card className="flex flex-col gap-3 p-5">
          <CardHeading
            title="Review what we found"
            description={
              review.placeFound
                ? "Check the shop name and address match the right branch before applying."
                : (review.note ?? "Only the links you pasted are shown.")
            }
          />
          {review.fields.length === 0 ? <p className="m-0 text-[13px] text-muted">Nothing to apply.</p> : null}
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {review.fields.map((f) => {
              const have = currentValue(state, f.key).trim();
              return (
                <li key={f.key}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 flex-none cursor-pointer accent-accent"
                      checked={review.ticked.has(f.key)}
                      onChange={() => toggle(f.key)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold">{f.label}</span>
                      <span className="block break-words text-[13px]">{f.value}</span>
                      {have && have !== f.value ? (
                        <span className="block break-words text-xs text-muted">Replaces: {have}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {review.unknown.length ? (
            <p className="m-0 text-[13px] text-muted">Ignored: {review.unknown.join(", ")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2.5">
            <Button variant="primary" disabled={review.ticked.size === 0} onClick={apply} className="disabled:cursor-not-allowed disabled:opacity-50">
              Apply to shop
            </Button>
            <Button onClick={() => setReview(null)}>Discard</Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
