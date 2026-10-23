// Settings reads for the admin. Fake data for now (see services/shops.ts).
import {
  SETTINGS,
  SHOP_TYPE_OPTIONS,
  type MockSettings,
  type ShopTypeOption,
} from "../lib/mock/settings.ts";

export type { ShopTypeOption };
export type SettingsData = MockSettings & { shopTypes: ShopTypeOption[] };

export async function getSettings(): Promise<SettingsData> {
  return { ...SETTINGS, shopTypes: SHOP_TYPE_OPTIONS };
}

// Shop types with their suggested look. The editor and Settings both read it.
export async function getShopTypes(): Promise<ShopTypeOption[]> {
  return SHOP_TYPE_OPTIONS;
}
