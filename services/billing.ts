// Plans and billing reads for the admin. Fake data for now (see services/shops.ts).
import { BILLING, type MockBilling } from "../lib/mock/billing.ts";

export type BillingData = MockBilling;

export async function getBilling(): Promise<BillingData> {
  return BILLING;
}
