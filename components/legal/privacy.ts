import { BRAND_NAME, LEGAL_ENTITY } from "@/lib/brand";
import type { LegalDoc } from "./types";

export const PRIVACY: LegalDoc = {
  slug: "privacy",
  title: "Privacy policy",
  short: "Privacy",
  intro: `${LEGAL_ENTITY} runs ${BRAND_NAME}. This page explains what we collect, why we collect it and what you can ask us to do with it. We follow India's Digital Personal Data Protection Act, 2023.`,
  sections: [
    {
      title: "Shop owners: what we collect",
      blocks: [
        "When you ask us to set up a page, we collect what you send us on WhatsApp or by email:",
        [
          "your name and phone or WhatsApp number",
          "your shop name, type, area, address and opening details",
          "your logo, cover photo and offer text",
          "the links you want on the page, such as Instagram, Google review, Maps and Wi-Fi",
        ],
        "We use this to build and update your page, print your standee, send your monthly report, remind you before your plan ends and answer your questions. We do not use it for anything else.",
        "We do not take card, bank or UPI details through our website. Payment details are shared with you on WhatsApp after you approve your preview, and we keep a record of the amount, date and payment reference only.",
      ],
    },
    {
      title: "Your customers: what a scan records",
      blocks: [
        "When someone scans your QR code or taps a button on your page, we record only this:",
        [
          "that a scan or tap happened, with the date and time",
          "which QR code and which button",
          "a rough device type, such as Android, iPhone or desktop",
          "a one-way hash of the visitor's IP address, used to spot bots and repeat taps",
        ],
        "We never store raw IP addresses. The hash is made with a secret salt that changes every day, so it cannot be traced back to a person and cannot be compared from one day to the next.",
        "We do not ask your customers for a name, number or email, and we do not build profiles of individuals. We have no way of knowing who a visitor is.",
        "Traffic that looks automated, such as link-preview crawlers, is marked with a reason and kept, not deleted, so the numbers we report to you stay honest.",
      ],
    },
    {
      title: "Cookies",
      blocks: [
        "Shop pages and QR links set no cookies and carry no advertising or tracking scripts. There is no cookie banner on them because there is nothing to consent to.",
        "Our own team signs in to an admin area, which uses a sign-in cookie to keep the session. Shop owners and customers do not sign in, so they receive no sign-in cookie.",
      ],
    },
    {
      title: "Information you put on your page",
      blocks: [
        "Whatever you publish on your page is public to anyone who scans your code. That includes your phone number, address and any Wi-Fi name and password you ask us to show. Please share only what you are happy for customers to see, and tell us if you want something removed.",
      ],
    },
    {
      title: "Who we share data with",
      blocks: [
        "We share data only with the services that help us run the product:",
        [
          "hosting and our database provider, which store the pages and statistics",
          "image and file storage for logos and photos",
          "WhatsApp, when we message you or you message us",
          "our printer, who receives your shop name and QR artwork to make your standee",
        ],
        "They may use the data only to provide that service to us. We do not sell personal data and we do not use it for advertising. We may disclose information if a law or a court requires it.",
      ],
    },
    {
      title: "How long we keep it",
      blocks: [
        [
          "Owner details: while your plan is active, and afterwards for as long as tax rules, a dispute or your renewal reasonably need.",
          "Raw scan and tap records: 13 months, then deleted.",
          "Daily totals (counts only, with no hashes): kept as your shop's history so your reports can show trends.",
        ],
        "If you ask us to close your page permanently, we delete your shop details and files. We keep the QR code number itself, retired, so that it can never be given to another shop.",
      ],
    },
    {
      title: "Your rights",
      blocks: [
        "You can ask us to show you the personal data we hold about you, correct it, give you a copy, or erase it. You can also withdraw any consent you gave us. Message us and we will act on it within a reasonable time, normally within 15 days.",
        "Because we do not know who individual scanners are, we cannot look up or delete a single customer's visits. The data is anonymous by design.",
      ],
    },
    {
      title: "Security",
      blocks: [
        "Data sits with reputable cloud providers over encrypted connections. Admin access is limited to our team, requires sign-in and is recorded in a change log. No system is perfectly secure. If a breach affects you, we will tell you and the authorities as the law requires.",
      ],
    },
    {
      title: "Children",
      blocks: [`${BRAND_NAME} is for businesses. We do not knowingly collect personal data from children.`],
    },
    {
      title: "Grievances and contact",
      blocks: ["For privacy questions or complaints, use the contact details at the bottom of this page. Tell us your shop name and what you need, and we will reply within 7 days."],
    },
    {
      title: "Changes",
      blocks: ["If we change this policy we will update the date at the top. For changes that matter to you, we will also tell you on WhatsApp."],
    },
  ],
};
