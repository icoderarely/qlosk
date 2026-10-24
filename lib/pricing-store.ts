import type { PricingStore } from "@/services/plans";
import { getDb } from "./db";

// The plans table behind the landing page pricing cards.
export function createPricingStore(db = getDb()): PricingStore {
  return {
    async standardPlans() {
      const plans = await db.plan.findMany({ where: { isCustom: false } });
      return plans.map((p) => ({
        id: p.id,
        months: p.months,
        pricePaise: p.pricePaise,
        compareAtPaise: p.compareAtPaise,
      }));
    },
  };
}
