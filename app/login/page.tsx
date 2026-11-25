"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, ShieldCheck, Loader2 } from "@/components/ui/icons";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/workspace";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.push(redirectedFrom);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectedFrom=${encodeURIComponent(redirectedFrom)}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Google authentication failed.");
      setOauthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between font-sans selection:bg-orange-500/30 selection:text-orange-950 dark:selection:text-orange-100 transition-colors duration-200">
      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 pt-24 sm:pt-28 pb-12">
        <div className="w-full max-w-md">
          <Card className="idle-card idle-inner-bevel">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="orange" className="text-[10px] tracking-wider uppercase">
                  Terminal Access
                </Badge>
                <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Secure Session</span>
                </div>
              </div>
              <CardTitle className="text-xl font-bold tracking-tight mt-2 text-foreground">
                Sign In to Continue
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Authenticate your identity to access studio trajectories and the Socratic engine.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Google OAuth Button */}
              <Button
                variant="outline"
                type="button"
                disabled={oauthLoading || loading}
                onClick={handleGoogleLogin}
                className="w-full h-10 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all"
              >
                {oauthLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono">
                  <span className="bg-card px-2 text-muted-foreground">or authorization credentials</span>
                </div>
              </div>

              {/* Password Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Account Email
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Secret Key
                  </label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-10 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  variant="orange"
                  disabled={loading}
                  className="w-full h-10 text-xs font-semibold mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Terminal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="pt-2 pb-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Unregistered?</span>
              <Link href={`/signup${redirectedFrom ? `?redirectedFrom=${encodeURIComponent(redirectedFrom)}` : ""}`} className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">
                Register Trajectory →
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-[11px] font-mono text-muted-foreground">
        © {new Date().getFullYear()} DAARI
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="size-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
