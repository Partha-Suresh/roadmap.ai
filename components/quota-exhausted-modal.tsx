"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, AlertTriangle, Sparkles } from "@/components/ui/icons";
import { usePageTransition } from "@/components/page-transition";
import { createClient } from "@/lib/supabase/client";
import { getUserSubscriptionData } from "@/lib/supabase-roadmap";

export interface QuotaExhaustedModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  tokensUsed?: number;
  tokenLimit?: number;
  resetDate?: string;
  tier?: string;
}

export function QuotaExhaustedModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  tokensUsed: propsTokensUsed,
  tokenLimit: propsTokenLimit,
  resetDate: propsResetDate,
  tier: propsTier,
}: QuotaExhaustedModalProps) {
  const router = useRouter();
  const { transitionTo } = usePageTransition();
  const [internalOpen, setInternalOpen] = useState(false);
  const [quotaDetails, setQuotaDetails] = useState({
    tokensUsed: propsTokensUsed ?? 250000,
    tokenLimit: propsTokenLimit ?? 250000,
    resetDate: propsResetDate ?? "Next Billing Cycle",
    tier: propsTier ?? "Starter Allocation",
  });

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  // Pre-load quota details on mount without opening modal unprompted
  useEffect(() => {
    let isMounted = true;
    async function checkQuotaOnMount() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          const subData = await getUserSubscriptionData(user.id);
          if (subData && isMounted) {
            setQuotaDetails({
              tokensUsed: subData.tokensUsed,
              tokenLimit: subData.tokenLimit,
              resetDate: subData.resetDate,
              tier: subData.tier,
            });
          }
        }
      } catch {
        // non-fatal
      }
    }

    checkQuotaOnMount();
    return () => { isMounted = false; };
  }, []);

  // Listen for real-time quota exceeded events across the app
  useEffect(() => {
    const handleQuotaExceeded = (e: CustomEvent) => {
      const detail = e.detail || {};
      setQuotaDetails({
        tokensUsed: detail.currentUsed ?? detail.tokensUsed ?? 250000,
        tokenLimit: detail.maxLimit ?? detail.tokenLimit ?? 250000,
        resetDate: detail.resetDate ?? "Next Billing Cycle",
        tier: detail.tier ?? "Starter Allocation",
      });
      setInternalOpen(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("roadmap-token-quota-exceeded" as any, handleQuotaExceeded);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("roadmap-token-quota-exceeded" as any, handleQuotaExceeded);
      }
    };
  }, []);

  const handleUpgradeClick = () => {
    setOpen(false);
    transitionTo("/billing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="bg-[#090b0e] border border-orange-500/30 text-white font-mono sm:max-w-lg overflow-hidden relative shadow-[0_24px_60px_rgba(0,0,0,0.92)] p-0">
        {/* Dynamic Warning Laser Accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500 shadow-[0_0_12px_rgba(249,115,22,0.9)]" />

        <div className="p-6 sm:p-7 space-y-5">
          <DialogHeader className="p-0 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange-400">
                COMPUTATION QUOTA DEPLETED
              </span>
              <Badge variant="orange" className="text-[10px] font-mono py-0.5 px-2">
                100% UTILIZED
              </Badge>
            </div>

            <DialogTitle className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2 pt-1">
              <AlertTriangle className="size-5 text-orange-500 shrink-0" />
              <span>Reasoning Token Budget Reached</span>
            </DialogTitle>

            <DialogDescription className="text-xs font-mono text-zinc-400 leading-relaxed pt-1">
              You have exhausted all allocated AI reasoning tokens for your current billing cycle. Further agent generation (curriculum synthesis, DAG subtopics, and Socratic evaluation) is suspended until cycle rollover or quota upgrade.
            </DialogDescription>
          </DialogHeader>

          {/* Allocation Usage Telemetry Card */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Monthly Usage</span>
              <span className="font-bold text-orange-400">
                {quotaDetails.tokensUsed.toLocaleString()} / {quotaDetails.tokenLimit.toLocaleString()} Tokens
              </span>
            </div>

            <Progress
              value={100}
              className="h-2 bg-white/10"
              indicatorClassName="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500"
            />

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] border-t border-white/5">
              <div>
                <span className="text-zinc-500 block">Current Tier</span>
                <span className="text-zinc-300 font-semibold">{quotaDetails.tier}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 block">Automatic Reset Date</span>
                <span className="text-zinc-300 font-semibold">{quotaDetails.resetDate}</span>
              </div>
            </div>
          </div>

          {/* Pro Tier Benefit Callout */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
            <Sparkles className="size-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-zinc-300">
              <strong className="text-emerald-400">Institutional Pro</strong> provides <span className="text-white font-bold">2,500,000 monthly tokens</span> with dedicated low-latency multi-agent execution pipelines and AST validation.
            </div>
          </div>

          <DialogFooter className="p-0 flex flex-col-reverse sm:flex-row items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white border-white/15 hover:bg-white/5 cursor-pointer"
            >
              Dismiss
            </Button>
            <Link
              href="/billing"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto sm:flex-1 h-10 px-5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs font-mono uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_22px_rgba(249,115,22,0.4)] border border-orange-300/30 transition-all active:scale-95 select-none"
            >
              <span>Upgrade Allocation</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
