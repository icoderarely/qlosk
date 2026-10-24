import { SAMPLES, SHOP_TYPE_IDS, type ShopTypeId } from "@/components/playground/samples";
import { LAYOUT_IDS, THEME_IDS, type LayoutId, type ThemeId } from "@/components/shop-page/types";
import type { SettingsData } from "@/services/settings";

export type Suggestions = Partial<Record<ShopTypeId, { theme: ThemeId; layout: LayoutId }>>;

/** What the playground may offer, from Settings: switched-on themes and layouts, and the suggested look per shop type. */
export function playgroundOptions(settings: Pick<SettingsData, "enabledThemes" | "enabledLayouts" | "shopTypes">) {
  const themes = THEME_IDS.filter((t) => settings.enabledThemes[t]);
  const layouts = LAYOUT_IDS.filter((l) => settings.enabledLayouts[l]);
  const suggestions: Suggestions = {};
  for (const id of SHOP_TYPE_IDS) {
    const s = settings.shopTypes.find((t) => t.label === SAMPLES[id].settingsType)?.suggested;
    if (s) suggestions[id] = s;
  }
  return { themes, layouts, suggestions };
}
