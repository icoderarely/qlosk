// Icon paths come from docs/design/AdminApp.dc.html (24px grid, 2px stroke).
export type NavItem = { href: string; label: string; icon: string };

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/qr/admin",
    label: "Overview",
    icon: "M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z",
  },
  {
    href: "/qr/admin/shops",
    label: "Shops",
    icon: "M4 9l1.5-5h13L20 9 M4 9v11h16V9 M9 20v-6h6v6",
  },
  {
    href: "/qr/admin/qr",
    label: "QR codes",
    icon: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3h-3z M20 14v.01 M14 20h3 M20 17v4",
  },
  {
    href: "/qr/admin/onboarding",
    label: "Onboarding",
    icon: "M9 6h11 M9 12h11 M9 18h11 M4 6l1 1 2-2 M4 12l1 1 2-2 M4 18l1 1 2-2",
  },
  {
    href: "/qr/admin/reports",
    label: "Reports",
    icon: "M5 20v-8 M12 20V5 M19 20v-12",
  },
  {
    href: "/qr/admin/billing",
    label: "Plans and billing",
    icon: "M3 5h18v14H3z M3 10h18",
  },
  {
    href: "/qr/admin/settings",
    label: "Settings",
    icon: "M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2",
  },
];

export const ICON_COLLAPSE = "M11 17l-5-5 5-5M18 17l-5-5 5-5";
export const ICON_EXPAND = "M13 17l5-5-5-5M6 17l5-5-5-5";
export const ICON_LOGOUT =
  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";
export const ICON_SHIELD = "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4";

// Overview is exact-match; the rest also match their sub-routes.
export function isActive(pathname: string, href: string): boolean {
  if (href === "/qr/admin") return pathname === "/qr/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
