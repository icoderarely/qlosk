"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/actions";
import { BRAND_NAME } from "@/lib/brand";
import { Icon } from "./icon";
import {
  ICON_COLLAPSE,
  ICON_EXPAND,
  ICON_LOGOUT,
  NAV_ITEMS,
  isActive,
} from "./nav";

export type ShellUser = { name: string | null; email: string };

const NAV_ON =
  "bg-[color-mix(in_srgb,var(--color-accent)_12%,white)] text-accent font-bold";
const NAV_OFF = "text-menu font-semibold hover:bg-ground";

export function AdminShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const displayName = user.name ?? "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh items-stretch">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-[10px] focus:bg-white focus:px-4 focus:py-3 focus:font-bold"
      >
        Skip to content
      </a>

      {open ? (
        <nav
          aria-label="Main"
          className="sticky top-0 flex h-dvh w-[232px] flex-none flex-col gap-1.5 border-r border-line bg-white px-3.5 py-[22px]"
        >
          <div className="flex items-center justify-between gap-2 pb-[18px] pl-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="size-[30px] flex-none rounded-[9px] bg-accent" />
              <div className="whitespace-nowrap text-base font-extrabold">
                {BRAND_NAME}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
              aria-expanded="true"
              className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl text-menu hover:bg-ground"
            >
              <Icon d={ICON_COLLAPSE} />
            </button>
          </div>

          {NAV_ITEMS.map((item) => {
            const on = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 ${on ? NAV_ON : NAV_OFF}`}
              >
                <Icon d={item.icon} />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-3.5">
            <div className="flex items-center gap-2.5 px-3">
              <div
                aria-hidden="true"
                className="flex size-[34px] flex-none items-center justify-center rounded-full bg-line-soft font-extrabold text-menu"
              >
                {initial}
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold">{displayName}</div>
                <div className="truncate text-xs text-muted">{user.email}</div>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-11 w-full cursor-pointer items-center justify-start gap-2 rounded-[10px] border border-field bg-white px-4 font-bold text-ink"
              >
                <Icon d={ICON_LOGOUT} />
                Log out
              </button>
            </form>
          </div>
        </nav>
      ) : (
        <nav
          aria-label="Main"
          className="sticky top-0 flex h-dvh w-[76px] flex-none flex-col items-center gap-2 border-r border-line bg-white py-5"
        >
          <div
            role="img"
            aria-label={BRAND_NAME}
            className="size-[34px] rounded-[10px] bg-accent"
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Expand sidebar"
            aria-expanded="false"
            className="mb-2 mt-1 flex size-12 cursor-pointer items-center justify-center rounded-xl text-menu hover:bg-ground"
          >
            <Icon d={ICON_EXPAND} />
          </button>

          {NAV_ITEMS.map((item) => {
            const on = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={on ? "page" : undefined}
                className={`flex size-12 items-center justify-center rounded-xl ${on ? NAV_ON : NAV_OFF}`}
              >
                <Icon d={item.icon} size={20} />
              </Link>
            );
          })}

          <div className="mt-auto flex flex-col items-center gap-2 pt-3.5">
            <div
              role="img"
              aria-label={`Signed in as ${displayName}`}
              className="flex size-9 items-center justify-center rounded-full bg-line-soft font-extrabold text-menu"
            >
              {initial}
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                className="flex size-12 cursor-pointer items-center justify-center rounded-xl text-menu hover:bg-ground"
              >
                <Icon d={ICON_LOGOUT} size={20} />
              </button>
            </form>
          </div>
        </nav>
      )}

      <main
        id="main"
        className="flex min-w-0 flex-1 flex-col gap-[22px] px-8 pb-10 pt-7"
      >
        {children}
      </main>
    </div>
  );
}
