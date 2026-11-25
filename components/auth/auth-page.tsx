"use client";

import React, { Suspense, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/auth-redirect";
import { PENDING_PATH_KEY, type PathPreset } from "@/components/create-roadmap-dialog";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Sign in",
    submit: "Sign in",
    busy: "Signing in",
    switchText: "New to Daari?",
    switchLink: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    submit: "Create account",
    busy: "Creating your account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/login",
  },
} as const;

/** Says what went wrong and what to do about it */
function explain(err: unknown): string {
  const { code, message = "", name = "" } = (err ?? {}) as { code?: string; message?: string; name?: string };
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match. Check both and try again.";
    case "email_not_confirmed":
      return "Confirm your email first. The link is in the message we sent when you signed up.";
    case "user_already_exists":
    case "email_exists":
      return "There is already an account with this email. Sign in instead.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many tries. Wait a minute, then try again.";
  }
  if (name === "AuthRetryableFetchError" || /fetch|network/i.test(message)) {
    return "Daari can't be reached right now. Check your connection and try again.";
  }
  return message || "Something went wrong. Please try again.";
}

const noSubscription = () => () => {};

/** What the visitor typed on the home page before being asked to sign in */
function usePendingPath(): PathPreset | null {
  const raw = useSyncExternalStore(
    noSubscription,
    () => {
      try {
        return sessionStorage.getItem(PENDING_PATH_KEY);
      } catch {
        return null;
      }
    },
    () => null
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function AuthContent({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("redirectedFrom");
  const target = safeRedirect(requested);
  const pending = usePendingPath();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_callback_failed"
      ? "That sign-in link didn't work. It may have expired, so please try again."
      : null
  );

  const callbackUrl = () => `${window.location.origin}/auth/callback?redirectedFrom=${encodeURIComponent(target)}`;
  const switchHref = `${copy.switchHref}${requested ? `?redirectedFrom=${encodeURIComponent(target)}` : ""}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy("form");
    setError(null);
    const { auth } = createClient();

    try {
      if (mode === "login") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: callbackUrl() },
        });
        if (error) throw error;
        // Supabase answers "success" for a known email, but without any identity
        if (data.user?.identities?.length === 0) throw { code: "user_already_exists" };
        if (!data.session) {
          setCheckInbox(true);
          setBusy(null);
          return;
        }
      }
      // Stays busy until the next page takes over
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(explain(err));
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy("google");
    setError(null);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(explain(err));
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans transition-colors duration-200">
      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center items-center gap-16 px-6 pb-16 pt-40 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-24 lg:pt-32">
        <PathSoFar mode={mode} pending={pending} />

        <div className="w-full max-w-md lg:max-w-none">
          {checkInbox ? (
            <div role="status">
              <h1 className="text-3xl font-bold tracking-tight [word-spacing:0.12em]">Check your email</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                We sent a link to <span className="font-semibold text-foreground">{email}</span>. Open it to finish creating
                your account.
              </p>
              <button
                type="button"
                onClick={() => setCheckInbox(false)}
                className="mt-6 text-sm font-semibold underline underline-offset-4 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight [word-spacing:0.12em]">{copy.title}</h1>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy !== null}
                className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card text-base font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-60 cursor-pointer disabled:cursor-default"
              >
                {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or with email
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">Your name</span>
                    <Input
                      name="name"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 bg-card! text-base!"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Email</span>
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-card! text-base!"
                  />
                </label>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={mode === "signup" ? 6 : undefined}
                      aria-describedby={mode === "signup" ? "password-help" : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-card! pr-20! text-base!"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-1 right-1 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p id="password-help" className="mt-1.5 text-sm text-muted-foreground">
                      At least 6 characters.
                    </p>
                  )}
                </div>

                <div aria-live="polite">
                  {error && (
                    <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm leading-relaxed text-rose-700 dark:text-rose-300">
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy !== null}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-base font-semibold text-black transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-70 cursor-pointer disabled:cursor-default"
                >
                  {busy === "form" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {copy.busy}
                    </>
                  ) : (
                    <>
                      {copy.submit}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                {copy.switchText}{" "}
                <Link
                  href={switchHref}
                  className="font-semibold text-foreground underline underline-offset-4 hover:text-orange-600 dark:hover:text-orange-400"
                >
                  {copy.switchLink}
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** Signing in, drawn as one stop on the way */
function PathSoFar({ mode, pending }: { mode: Mode; pending: PathPreset | null }) {
  const here = mode === "login" ? "Sign in" : "Create your account";
  const plan = pending?.subject
    ? {
        label: pending.subject,
        note: pending.days ? `${pending.days} days, ${pending.hours ?? 2} hours a day. Kept for you.` : "Kept for you.",
      }
    : null;

  const stops: Array<{ label: string; note: string; state: "done" | "here" | "next" }> = [
    ...(plan ? [{ ...plan, state: "done" as const }] : []),
    { label: here, note: "You are here", state: "here" },
    ...(mode === "login" && !plan
      ? [{ label: "Pick up where you stopped", note: "Your paths are in the Studio", state: "next" as const }]
      : [{ label: plan ? "See the whole way" : "Say where you want to get to", note: plan ? "Daari lays out the days" : "Any subject, at any pace", state: "next" as const }]),
    { label: "Take one topic at a time", note: "And prove it to yourself", state: "next" },
  ];

  return (
    <ol aria-label="Your path so far" className="hidden lg:block">
      {stops.map((stop, i) => (
        <li key={stop.label} aria-current={stop.state === "here" ? "step" : undefined} className="relative pb-14 pl-12 last:pb-0">
          {i < stops.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute -bottom-2 left-[11px] top-2 w-0.5",
                stop.state === "done" ? "bg-saffron" : "bg-foreground/15"
              )}
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-1 top-1.5 size-4 rounded-full border-[3px] bg-background",
              stop.state === "done" && "border-saffron bg-saffron",
              stop.state === "here" && "border-saffron shadow-[0_0_0_6px_color-mix(in_oklab,var(--saffron)_22%,transparent)]",
              stop.state === "next" && "border-foreground/25"
            )}
          />
          <p
            className={cn(
              "break-words text-2xl font-bold leading-snug tracking-tight",
              stop.state === "next" ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {stop.label}
          </p>
          <p className="mt-1 text-base text-muted-foreground">{stop.note}</p>
        </li>
      ))}
    </ol>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function AuthPage({ mode }: { mode: Mode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-7 animate-spin text-orange-500" />
        </div>
      }
    >
      <AuthContent mode={mode} />
    </Suspense>
  );
}
