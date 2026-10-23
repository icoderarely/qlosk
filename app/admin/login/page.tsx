import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/admin/icon";
import { ICON_SHIELD } from "@/components/admin/nav";
import { getCurrentAdmin } from "@/lib/admin-guard";
import { BRAND_NAME } from "@/lib/brand";
import { signInWithGoogle } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-[14px] border border-line bg-white p-8">
        <div className="flex items-center gap-2.5">
          <div className="size-[34px] rounded-[10px] bg-accent" />
          <div className="text-lg font-extrabold">{BRAND_NAME}</div>
        </div>
        <div>
          <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.01em]">
            Sign in to admin
          </h1>
          <p className="mt-1.5 text-muted">Use your Google account to continue.</p>
        </div>
        <Suspense fallback={<SignInForm />}>
          <SignInState searchParams={searchParams} />
        </Suspense>
        <p className="m-0 text-[13px] text-muted">
          Only approved team members can sign in. If your email is not on the
          list, ask the owner to add it in Settings.
        </p>
      </div>
    </main>
  );
}

async function SignInState({
  searchParams,
}: {
  searchParams: PageProps<"/admin/login">["searchParams"];
}) {
  const { error } = await searchParams;
  // Only redirect when the person is on the allowlist. A valid session for a
  // removed email must stay here, or /admin and this page would loop.
  if (await getCurrentAdmin()) redirect("/admin");
  return <SignInForm error={typeof error === "string" ? error : undefined} />;
}

function SignInForm({ error }: { error?: string }) {
  return (
    <form action={signInWithGoogle} className="flex flex-col gap-3">
      {error ? (
        <p
          role="alert"
          className="m-0 rounded-[10px] bg-chip-over-bg px-3.5 py-2.5 text-[13px] font-semibold text-chip-over-fg"
        >
          {error === "AccessDenied"
            ? "That Google account is not on the approved list. Try another account, or ask the owner to add you."
            : "Sign-in did not work. Please try again."}
        </p>
      ) : null}
      <button
        type="submit"
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-accent bg-accent px-4 font-bold text-white"
      >
        <Icon d={ICON_SHIELD} />
        Continue with Google
      </button>
    </form>
  );
}
