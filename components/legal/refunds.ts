import type { LegalDoc } from "./types";

export const REFUNDS: LegalDoc = {
  slug: "refunds",
  title: "Refund and cancellation policy",
  short: "Refunds",
  intro: "We want you to be happy with your page. This is when you can cancel and what you get back.",
  sections: [
    {
      title: "Before you pay",
      blocks: ["You see your finished preview before any payment. If it is not right, tell us what to change. If you decide not to go ahead, you owe nothing."],
    },
    {
      title: "Cancelling before work starts",
      blocks: ["If you have paid but we have not yet started building your page, you can cancel for any reason and we will refund the full amount."],
    },
    {
      title: "After work has started",
      blocks: [
        "Once we have started building your page or ordered your standee, we cannot refund the setup work already done. If you are unhappy with the result, tell us and we will fix it.",
        "If we cannot fix a genuine fault in the service, we will refund the unused part of your plan.",
      ],
    },
    {
      title: "Monthly plan",
      blocks: ["Cancel before the next month begins and you will not be charged again. The month you have already paid for is not refunded, and your page stays live until it ends."],
    },
    {
      title: "6-month and yearly plans",
      blocks: [
        "If you cancel after your page is live, it keeps running until the end of the period you paid for. We do not refund the remaining months, unless the section above applies or the law requires it.",
      ],
    },
    {
      title: "Printed standees",
      blocks: [
        "Standees are made to order with your details. If yours arrives damaged or wrong, message us within 7 days with a photo and we will replace it at no cost. We cannot refund a standee that was printed correctly from the details you approved.",
      ],
    },
    {
      title: "How refunds are paid",
      blocks: ["Approved refunds go back to the account or UPI ID you paid from, usually within 7 working days of approval. Your bank may take a little longer to show it."],
    },
    {
      title: "Payment problems",
      blocks: ["If you were charged twice, or money left your account but we have no record of it, message us with a screenshot of the payment. We will check and return any duplicate or unmatched amount in full."],
    },
    {
      title: "How to ask",
      blocks: ["Message us on WhatsApp or email us with your shop name and the payment reference. Our contact details are at the bottom of this page."],
    },
  ],
};
