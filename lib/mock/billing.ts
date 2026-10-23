// Fake plans and renewals, from docs/design/AdminApp.dc.html.
import type { PaymentStatus, PlanName } from "./shops.ts";

export type MockBilling = {
  planCounts: { plan: PlanName; shops: number }[];
  due: { inDays: number; count: number; overdue: number };
  renewals: {
    shop: string;
    plan: PlanName;
    date: string;
    payment: PaymentStatus;
    action: "Remind" | "Call" | "View";
  }[];
  /** Prices are set in admin, not in code. Empty until the owner types them. */
  prices: { plan: PlanName; label: string; rupees: string }[];
};

export const BILLING: MockBilling = {
  planCounts: [
    { plan: "Monthly", shops: 14 },
    { plan: "Yearly", shops: 22 },
    { plan: "5 years", shops: 6 },
  ],
  due: { inDays: 14, count: 6, overdue: 1 },
  renewals: [
    { shop: "Kaveri Sweets", plan: "Monthly", date: "28 Oct", payment: "due_soon", action: "Remind" },
    { shop: "Bright Minds Classes", plan: "Monthly", date: "5 Nov", payment: "due_soon", action: "Remind" },
    { shop: "Green Leaf Bakery", plan: "Monthly", date: "19 Oct", payment: "overdue", action: "Call" },
    { shop: "Dr. Mehta Dental", plan: "Yearly", date: "2 Jan", payment: "paid", action: "View" },
    { shop: "Noor Boutique", plan: "Yearly", date: "19 Feb", payment: "paid", action: "View" },
    { shop: "Iron House Gym", plan: "5 years", date: "Aug 2031", payment: "paid", action: "View" },
  ],
  prices: [
    { plan: "Monthly", label: "Monthly", rupees: "" },
    { plan: "Yearly", label: "Yearly", rupees: "" },
    { plan: "5 years", label: "5 years", rupees: "" },
  ],
};
