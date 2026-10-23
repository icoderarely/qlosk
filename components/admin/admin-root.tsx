import { JetBrains_Mono, Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500"],
});

// Fonts, colours and focus styles shared by /admin and /admin-login.
export function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${manrope.variable} ${jetbrains.variable} admin-root min-h-dvh bg-ground font-admin text-[14px] leading-[1.45] text-ink`}
    >
      {children}
    </div>
  );
}
