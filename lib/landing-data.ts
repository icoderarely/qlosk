import { cacheLife } from "next/cache";
import { WHATSAPP_NUMBER } from "@/lib/brand";
import { LAYOUT_IDS, THEME_IDS } from "@/components/shop-page/types";
import { landingPlans, type PricingCard } from "@/services/plans";
import { DEFAULT_SHOP_TYPES } from "@/services/settings";
import { loadSettings } from "./load-settings";
import { createPricingStore } from "./pricing-store";
import { playgroundOptions } from "./playground-options";

export type LandingData = ReturnType<typeof playgroundOptions> & {
  /** Digits with country code, or "" until it is set in Settings. */
  whatsappNumber: string;
  plans: PricingCard[];
};

// Everything the landing page reads from the database, cached for a minute so
// the page is served as static HTML and a price change in admin shows up soon.
// If the database cannot be reached the page still renders, without prices.
export async function loadLandingData(): Promise<LandingData> {
  "use cache";
  cacheLife("minutes");
  try {
    const [settings, plans] = await Promise.all([loadSettings(), landingPlans(createPricingStore())]);
    return { ...playgroundOptions(settings), whatsappNumber: WHATSAPP_NUMBER, plans };
  } catch (error) {
    console.error("Landing page data could not be loaded", error);
    const all = <K extends string>(ids: readonly K[]) => Object.fromEntries(ids.map((id) => [id, true])) as Record<K, boolean>;
    const options = playgroundOptions({
      enabledThemes: all(THEME_IDS),
      enabledLayouts: all(LAYOUT_IDS),
      shopTypes: DEFAULT_SHOP_TYPES,
    });
    return { ...options, whatsappNumber: WHATSAPP_NUMBER, plans: [] };
  }
}
