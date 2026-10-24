"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

// One message for every failure, so the form never says which half was wrong.
// A rate-limit reply (429) gets its own line, since waiting is the fix.
const WRONG = "Wrong username or password";
const TOO_MANY = "Too many attempts. Wait a minute and try again.";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Next.js keeps a page it navigated away from alive (hidden), state and DOM
  // included. Without this, logging out brings back a form stuck on "Signing
  // in…" with the old password still typed in.
  useLayoutEffect(() => {
    const form = formRef.current;
    return () => {
      form?.reset();
      setPending(false);
      setError(null);
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const { error: failure } = await authClient.signIn.username({
        username: String(form.get("username") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (failure) {
        setError(failure.status === 429 ? TOO_MANY : WRONG);
        setPending(false);
        return;
      }
      // Stay disabled until the page changes.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(WRONG);
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? (
        <p
          id="login-error"
          role="alert"
          className="m-0 rounded-[10px] bg-chip-over-bg px-3.5 py-2.5 text-[13px] font-semibold text-chip-over-fg"
        >
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="l-user" className="mb-1.5 block text-[13px] font-bold">
          Username
        </label>
        <input
          id="l-user"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          aria-describedby={error ? "login-error" : undefined}
          className="min-h-11 w-full rounded-[10px] border border-field bg-white px-3 text-ink disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="l-pass" className="mb-1.5 block text-[13px] font-bold">
          Password
        </label>
        <input
          id="l-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          aria-describedby={error ? "login-error" : undefined}
          className="min-h-11 w-full rounded-[10px] border border-field bg-white px-3 text-ink disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[10px] border border-accent bg-accent px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
