import { BRAND_NAME, LEGAL_CITY, LEGAL_ENTITY } from "@/lib/brand";
import type { LegalDoc } from "./types";

export const TERMS: LegalDoc = {
  slug: "terms",
  title: "Terms of service",
  short: "Terms",
  intro: `These terms are the agreement between you and ${LEGAL_ENTITY} ("${BRAND_NAME}", "we") for the ${BRAND_NAME} shop page and QR service. By approving your preview or paying for a plan, you accept them.`,
  sections: [
    {
      title: "What we provide",
      blocks: [
        "We build and host a mobile page for your shop with the buttons you choose, such as Call, WhatsApp, Google review, Instagram, Wi-Fi, Maps and your latest offer. We give you one QR code that opens that page, and we send you a monthly report of scans and taps.",
        "The 6-month and yearly plans include a printed standee. The monthly plan includes a print-ready file that you print yourself.",
        "Your customers scan the code with their phone camera. They need no app and no account.",
      ],
    },
    {
      title: "Who can use it",
      blocks: [
        "You must own a business or be authorised to act for its owner, and you must be 18 or older. You confirm that the details you give us are true and that you have the right to use your shop name, logo, photos and links.",
      ],
    },
    {
      title: "Plans and payment",
      blocks: [
        "Plans run for one month, six months or one year from the day your page goes live. The price we quote you before you pay is the price for that whole period. Prices are in Indian rupees and include GST where it applies. We give you a receipt or invoice for every payment.",
        "You see your preview before you pay. We share payment details on WhatsApp once you approve it. We do not ask for card or bank details on this website.",
        "We remind you on WhatsApp before your plan ends. If it ends, your page stays fully live for 15 more days. After that it shows only your shop name, a Call button and Directions until you renew. Your QR code is never changed or given to anyone else.",
      ],
    },
    {
      title: "Your content",
      blocks: [
        "You keep ownership of everything you give us. You let us store, resize and display it for as long as needed to run your page and print your standee.",
        "Your page must not contain anything unlawful, misleading, abusive or that infringes someone else's rights, and must not link to such material. If it does, we may pause the page, and we will tell you why.",
      ],
    },
    {
      title: "Our brand and the QR code",
      blocks: [
        `The ${BRAND_NAME} name, logo, page designs and software belong to us. Your shop page and standee carry a small "Powered by ${BRAND_NAME}" credit, which you may not remove. The QR code number stays ours to issue, and it always points to your page while your plan is active.`,
      ],
    },
    {
      title: "Google reviews",
      blocks: [
        "The review button is a plain link to your Google review form, shown to every visitor. Google does not allow rewards for reviews or asking only happy customers to review. You agree not to do either on or around your page.",
        "We do not build rating pop-ups, review gating, incentives or written reviews, and we may remove a button that is being used that way.",
      ],
    },
    {
      title: "Wi-Fi, numbers and other details you publish",
      blocks: [
        "Anything on your page, including a Wi-Fi password, is visible to anyone who scans your code. You decide what to show, and you are responsible for keeping it up to date. Please do not publish a password to a network that carries private or sensitive devices.",
      ],
    },
    {
      title: "Changes to your page",
      blocks: [
        "Message us to change your number, offer, banner, buttons or look. We make reasonable changes during your plan at no extra charge. The printed code stays exactly the same.",
      ],
    },
    {
      title: "Availability",
      blocks: [
        "We work to keep your page available, but we cannot promise it will never be interrupted. Customers need a phone and an internet connection. Third-party apps such as WhatsApp, Google Maps and UPI apps can behave differently on different phones, and we do not control them.",
      ],
    },
    {
      title: "Ending the service",
      blocks: [
        "You can stop at any time by messaging us. How refunds work is set out in our Refund and cancellation policy. We may end the service to you if you seriously or repeatedly break these terms, and we will tell you first unless the breach is severe.",
        "If we ever close the service, we will give you notice in advance and help you point your printed code at a link of your choice.",
      ],
    },
    {
      title: "Limits on our liability",
      blocks: [
        "As far as the law allows, we are not liable for lost profit, lost customers or any indirect loss caused by using, or being unable to use, the service. Our total liability for any claim is limited to the amount you paid for your current plan period.",
      ],
    },
    {
      title: "Law and disputes",
      blocks: [
        `These terms are governed by the laws of India. ${LEGAL_CITY ? `Courts in ${LEGAL_CITY}` : "The courts of India"} have jurisdiction, subject to any rights you have under consumer protection law. Please message us first. Most problems are solved quickly.`,
      ],
    },
    {
      title: "Changes to these terms",
      blocks: ["We may update these terms. If a change materially affects you, we will tell you on WhatsApp before it applies. The date at the top shows the latest version."],
    },
  ],
};
