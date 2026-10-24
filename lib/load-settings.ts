import { getDb } from "./db";
import { createSettingsStore } from "./settings-store";
import { getSettings, getShopTypes } from "@/services/settings";

// Shortcuts for pages: the settings table behind the settings service.
export const loadSettings = () => getSettings(createSettingsStore(getDb()));
export const loadShopTypes = () => getShopTypes(createSettingsStore(getDb()));
