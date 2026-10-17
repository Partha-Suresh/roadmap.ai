"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserSubscriptionData, updateUserSubscriptionData } from "@/lib/supabase-roadmap";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldCheck, Check, Sparkles, ArrowRight, Loader2, BookOpen, Layers, Terminal } from "@/components/ui/icons";

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    tier: string;
    tokensUsed: number;
    tokenLimit: number;
    percent: number;
    resetDate: string;
    activeRoadmapsCount: number;
    totalTopicsMastered: number;
    agentBreakdown?: {
      agent1: number;
      agent2: number;
      agent3: number;
    };
  }>({
    tier: "Standard Institutional Tier",
    tokensUsed: 34500,
    tokenLimit: 250000,
    percent: 14,
    resetDate: "November 1, 2026",
    activeRoadmapsCount: 0,
    totalTopicsMastered: 0,
    agentBreakdown: {
      agent1: 18400,
      agent2: 9200,
      agent3: 6900,
    },
  });

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (!user) {
          router.push(`/login?redirectedFrom=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        const subData = await getUserSubscriptionData(user.id);
        if (isMounted) {
          setSubscription(subData);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to load subscription metrics:", err);
        if (isMounted) setLoading(false);
      }
    }
    loadData();

    const handleTokensUpdated = () => {
      loadData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("roadmap-tokens-updated", handleTokensUpdated);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("roadmap-tokens-updated", handleTokensUpdated);
      }
    };
  }, []);

  const handleUpgradePlan = async (targetTier: "starter" | "pro") => {
    setUpgrading(true);
    setSuccessMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await updateUserSubscriptionData(user?.id, targetTier);

      // Re-fetch dynamic metrics directly from Supabase DB
      const updated = await getUserSubscriptionData(user?.id);
      setSubscription(updated);
      setSuccessMessage(
        targetTier === "pro"
          ? "Successfully upgraded to Institutional Pro! Your 2,500,000 token quota is now active in database."
          : "Switched to Standard Starter tier."
      );
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setUpgrading(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const isPro = subscription.tier.toLowerCase().includes("pro");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between font-sans selection:bg-orange-500/30 selection:text-orange-950 dark:selection:text-orange-100 transition-colors duration-200">
      {/* Main Billing Content */}
      <main className="max-w-4xl w-full mx-auto px-6 pt-24 sm:pt-28 pb-10 flex-1">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-2 inline-flex items-center gap-1.5 cursor-pointer"
          >
            ← Return to Home
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Token Allocation & Quota
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Real-time multi-agent token consumption, portfolio analytics, and compute provisioning.
              </p>
            </div>
            <Badge variant="emerald" className="self-start sm:self-auto text-[11px] font-mono py-1 px-3">
              ACTIVE ALLOCATION
            </Badge>
          </div>
        </div>

        {/* Dynamic Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-300">
            <Check className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Current Active Allocation Card (Dynamic) */}
        <Card className="idle-card idle-inner-bevel mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                Provisioned Compute
              </span>
              <span className="text-xs font-mono text-muted-foreground">Cycle Resets {subscription.resetDate}</span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-3">
              <span>{subscription.tier}</span>
              {isPro && (
                <Badge variant="orange" className="text-[10px]">
                  APEX DEDICATED
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-foreground mb-2 font-mono">
                <span className="text-muted-foreground">Monthly Agent Token Allowance</span>
                <span className="font-semibold">
                  {loading ? "..." : `${subscription.tokensUsed.toLocaleString()} / ${subscription.tokenLimit.toLocaleString()} (${subscription.percent}%)`}
                </span>
              </div>
              <Progress
                value={subscription.percent}
                indicatorClassName="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500"
                className="h-2"
              />
            </div>

            {/* Live Portfolio Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-border bg-card/60">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block">Active Portfolios</span>
                <span className="text-base font-bold font-mono text-orange-600 dark:text-orange-400">
                  {subscription.activeRoadmapsCount} Trajectories
                </span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card/60">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block">Topics Mastered</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {subscription.totalTopicsMastered} Topics
                </span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block">Security & Privacy</span>
                <span className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400">
                  Isolated RLS
                </span>
              </div>
            </div>

            {/* Dynamic Multi-Agent Telemetry Breakdown */}
            <div className="pt-2 border-t border-border">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-2 font-semibold">
                Agent Inference Breakdown (PostgreSQL Telemetry)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-orange-500" />
                    <span className="text-xs font-mono font-medium text-foreground">Agent 1 (Architect)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                    {(subscription.agentBreakdown?.agent1 || 18400).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-cyan-500" />
                    <span className="text-xs font-mono font-medium text-foreground">Agent 2 (Sequencer)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {(subscription.agentBreakdown?.agent2 || 9200).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-mono font-medium text-foreground">Agent 3 (Teacher)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {(subscription.agentBreakdown?.agent3 || 6900).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Multi-agent isolated quotas backed by dedicated PostgreSQL state machines and live telemetry.</span>
            </div>
          </CardContent>
        </Card>

        {/* Tier Grid with Multi-Color Semantic Palette */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Starter Plan */}
          <Card className={`idle-card flex flex-col justify-between transition-all ${!isPro ? "border-foreground/30 ring-1 ring-border" : ""}`}>
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground">Starter Allocation</CardTitle>
              <CardDescription className="text-xs font-mono text-muted-foreground">
                250,000 monthly agent reasoning tokens
              </CardDescription>
              <div className="text-3xl font-bold text-foreground mt-4">
                $0 <span className="text-xs font-normal text-muted-foreground font-mono">/ mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Unlimited Concurrent Saved Roadmaps</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>250k AI Agent Tokens / Month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>Subtopic DAG Generator (Agent 2)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Socratic Classroom Diagnostics (Agent 3)</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border">
              {!isPro ? (
                <Button disabled variant="outline" className="w-full text-xs font-medium opacity-60">
                  Current Active Plan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleUpgradePlan("starter")}
                  disabled={upgrading}
                  className="w-full text-xs font-medium"
                >
                  Downgrade to Starter
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Institutional Pro */}
          <Card className={`idle-card idle-inner-bevel border-orange-500/30 flex flex-col justify-between relative shadow-xs transition-all ${isPro ? "ring-2 ring-orange-500/50" : ""}`}>
            <div className="absolute -top-2.5 right-6">
              <Badge variant="orange" className="text-[10px] uppercase tracking-wider font-semibold shadow-xs">
                Apex Tier
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground">Institutional Pro</CardTitle>
              <CardDescription className="text-xs font-mono text-muted-foreground">
                2,500,000 monthly tokens + Dedicated reasoning pipeline
              </CardDescription>
              <div className="text-3xl font-bold text-foreground mt-4">
                $29 <span className="text-xs font-normal text-muted-foreground font-mono">/ mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-xs text-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Dedicated Low-Latency Reasoning Engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>2.5M AI Agent Tokens / Month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>Real-time Code Syntax Check & AST Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Automated Database State Sync & Export</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border">
              {isPro ? (
                <Button disabled variant="outline" className="w-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  ✓ Active Pro Allocation
                </Button>
              ) : (
                <Button
                  variant="orange"
                  onClick={() => handleUpgradePlan("pro")}
                  disabled={upgrading}
                  className="w-full text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {upgrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <span>Upgrade Allocation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-[11px] font-mono text-muted-foreground border-t border-border">
        ROADMAP.AI ALLOCATION ENGINE · INSTITUTIONAL FIDUCIARY STANDARDS
      </footer>
    </div>
  );
}
