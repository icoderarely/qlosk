// Onboarding board reads for the admin. Fake data for now (see services/shops.ts).
import {
  ONBOARDING_COLUMNS,
  ONBOARDING_TODAY,
  type OnboardingColumn,
} from "../lib/mock/onboarding.ts";

export type OnboardingData = { today: string[]; columns: OnboardingColumn[] };

export async function getOnboarding(): Promise<OnboardingData> {
  return { today: ONBOARDING_TODAY, columns: ONBOARDING_COLUMNS };
}
