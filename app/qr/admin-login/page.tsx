import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrandTile } from "@/components/brand-mark";
import { BRAND_NAME } from "@/lib/brand";
import { getCurrentUser } from "@/lib/require-role";
import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-[14px] border border-line bg-white p-8">
        <Link
          href="/qr"
          aria-label={`${BRAND_NAME} home`}
          className="flex min-h-11 w-fit items-center gap-2.5 text-inherit no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <BrandTile className="size-[34px]" />
          <span className="text-lg font-extrabold">{BRAND_NAME}</span>
        </Link>
        <div>
          <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.01em]">
            Sign in to admin
          </h1>
          <p className="mt-1.5 text-muted">Enter your username and password.</p>
        </div>
        <Suspense fallback={<LoginForm />}>
          <RedirectIfSignedIn />
        </Suspense>
        <p className="m-0 text-[13px] text-muted">
          Accounts are created by the owner. There is no public sign-up.
        </p>
      </div>
    </main>
  );
}

// Only people with a role are sent on to /admin. A session without a role
// stays here, or /admin and this page would redirect to each other forever.
async function RedirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/qr/admin");
  return <LoginForm />;
}
