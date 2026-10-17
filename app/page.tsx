"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getUserRoadmaps,
  saveRoadmapToSupabase,
  deleteRoadmap,
  RoadmapSummary,
} from "@/lib/supabase-roadmap";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  Trash2,
  Plus,
  Terminal,
  Sparkles,
} from "@/components/ui/icons";
import {
  ShinyText,
  TrueFocus,
  AnimatedCounter,
  SpotlightCard,
  TiltedCard,
  StarBorder,
  ClickSpark,
  Magnet,
  ThreadsBackground,
} from "@/components/react-bits";
import { VelocityMarquee } from "@/components/velocity-marquee";
import { HorizontalAgentShowcase } from "@/components/horizontal-agent-showcase";
import { StickyProductStack } from "@/components/sticky-product-stack";
import { ConsensysOffsetCta } from "@/components/consensys-offset-cta";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { showTelemetryToast } from "@/components/ui/telemetry-toast";
import { TelemetryConfirmDialog } from "@/components/ui/telemetry-confirm-dialog";
import { usePageTransition } from "@/components/page-transition";
import { useLenis } from "@/components/smooth-scroll";

export default function LandingPage() {
  const router = useRouter();
  const { transitionTo } = usePageTransition();
  const lenis = useLenis();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Roadmaps state
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);
  const [activeTab, setActiveTab] = useState<"on-track" | "off-track">("on-track");

  // Trajectory Architect Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("Distributed Systems & Consensus Engines");
  const [totalDaysInput, setTotalDaysInput] = useState(14);
  const [dailyHoursInput, setDailyHoursInput] = useState(2.5);
  const [skillLevelInput, setSkillLevelInput] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom Deletion Confirmation Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState<RoadmapSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Initial user & roadmaps load
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoadingRoadmaps(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        setCurrentUser(user);

        const loaded = await getUserRoadmaps(user ? user.id : "guest");
        if (!isMounted) return;
        setRoadmaps(loaded);
      } catch (err) {
        console.warn("Notice loading user roadmaps:", err);
      } finally {
        if (isMounted) setIsLoadingRoadmaps(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Handle direct hash navigation e.g. /#portfolio or incoming navigation from another route
  useEffect(() => {
    const handleHashScroll = () => {
      if (typeof window !== "undefined" && window.location.hash === "#portfolio") {
        setTimeout(() => {
          const el = document.getElementById("portfolio");
          if (el) {
            if (lenis) {
              lenis.scrollTo(el, { offset: -60, duration: 1.2 });
            } else {
              el.scrollIntoView({ behavior: "smooth" });
            }
          }
        }, 150);
      }
    };

    handleHashScroll();
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, [lenis]);

  // Listen for navbar Deploy button click
  useEffect(() => {
    const handleOpenModal = () => {
      if (!currentUser) {
        transitionTo("/login?redirectedFrom=" + encodeURIComponent("/"));
      } else {
        setIsModalOpen(true);
      }
    };
    window.addEventListener("open-deploy-modal", handleOpenModal);
    return () => window.removeEventListener("open-deploy-modal", handleOpenModal);
  }, [currentUser, transitionTo]);

  // Handle roadmap creation
  const handleDeployTrajectory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsModalOpen(false);
      showTelemetryToast({
        type: "warning",
        title: "AUTHENTICATION REQUIRED",
        message: "Please sign in to deploy and persist autonomous trajectories.",
      });
      transitionTo("/login?redirectedFrom=" + encodeURIComponent("/"));
      return;
    }
    if (!domainInput.trim()) return;

    setIsGenerating(true);
    showTelemetryToast({
      type: "info",
      title: "SYNTHESIS INITIALIZED",
      message: `Deploying 3-agent pipeline for "${domainInput.trim()}"...`,
    });

    try {
      const result = await saveRoadmapToSupabase(
        currentUser.id,
        domainInput.trim(),
        totalDaysInput,
        dailyHoursInput,
        skillLevelInput
      );
      setIsModalOpen(false);
      showTelemetryToast({
        type: "success",
        title: "TRAJECTORY DEPLOYED",
        message: "Deterministic DAG successfully compiled. Entering cockpit...",
      });
      transitionTo(`/workspace?id=${result.roadmap.id}`);
    } catch (err: any) {
      console.error("Trajectory creation failed:", err);
      showTelemetryToast({
        type: "error",
        title: "SYNTHESIS FAILED",
        message: err.message || "Failed to compile curriculum trajectory.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Open custom confirmation modal for roadmap delete
  const requestDeleteRoadmap = (roadmap: RoadmapSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoadmapToDelete(roadmap);
    setConfirmDialogOpen(true);
  };

  // Execute confirmed roadmap delete
  const handleConfirmDelete = async () => {
    if (!roadmapToDelete) return;
    const id = roadmapToDelete.id;
    const title = roadmapToDelete.title;
    setDeletingId(id);

    try {
      const success = await deleteRoadmap(id);
      if (success) {
        setRoadmaps((prev) => prev.filter((r) => r.id !== id));
        showTelemetryToast({
          type: "success",
          title: "TRAJECTORY PURGED",
          message: `Curriculum "${title}" purged from Supabase cloud.`,
        });
      } else {
        showTelemetryToast({
          type: "error",
          title: "PURGE FAILED",
          message: "Unable to delete trajectory from database.",
        });
      }
    } catch (err: any) {
      showTelemetryToast({
        type: "error",
        title: "PURGE ERROR",
        message: err.message || "Database deletion failed.",
      });
    } finally {
      setDeletingId(null);
      setConfirmDialogOpen(false);
      setRoadmapToDelete(null);
    }
  };

  // Pre-fill modal with conviction tracks
  const handleQuickLaunch = (domain: string, days: number, hours: number) => {
    if (!currentUser) {
      transitionTo("/login?redirectedFrom=" + encodeURIComponent("/"));
      return;
    }
    setDomainInput(domain);
    setTotalDaysInput(days);
    setDailyHoursInput(hours);
    setIsModalOpen(true);
  };

  // Aggregated Stats
  const totalDaysSum = roadmaps.reduce((acc, r) => acc + (r.total_days || 0), 0);
  const avgHours =
    roadmaps.length > 0
      ? (
          roadmaps.reduce((acc, r) => acc + (r.daily_hours_commitment || 2), 0) /
          roadmaps.length
        ).toFixed(1)
      : "2.0";

  return (
    <ClickSpark
      sparkColor="#f97316"
      sparkCount={12}
      sparkRadius={36}
      duration={400}
      className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden selection:bg-[#d4f934] selection:text-[#08090b] transition-colors duration-200"
    >
      {/* Subtle Atmospheric Diffused Lighting Pools (Subdued & Clean) */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-orange-500/8 via-transparent to-transparent blur-[160px] rounded-full z-0 opacity-60 dark:opacity-80" />
      <div className="pointer-events-none fixed top-1/3 -left-48 w-[450px] h-[450px] bg-white/[0.02] blur-[160px] rounded-full z-0 opacity-40 dark:opacity-60" />
      <div className="pointer-events-none fixed top-2/3 -right-48 w-[500px] h-[500px] bg-orange-500/5 blur-[160px] rounded-full z-0 opacity-40 dark:opacity-60" />

      {/* Cybernetic Dot Grid Background */}
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-25 dark:opacity-20 z-0" />

      {/* Ambient Flowing Threads */}
      <ThreadsBackground color="rgba(249, 115, 22, 0.06)" amplitude={24} distance={0.35} className="opacity-25 dark:opacity-30" />

      {/* =========================================================================
          SECTION 0: THE HERO COCKPIT (Editorial Asymmetrical Layout)
          ========================================================================= */}
      <section id="cockpit" className="pt-28 sm:pt-36 pb-20 max-w-[1340px] mx-auto px-6 sm:px-10 relative z-10 min-h-[92vh] flex flex-col justify-between">
        {/* Top Header Row with Smooth Hero Visual Anchor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-black font-display tracking-[-0.03em] text-foreground leading-[1.02]">
              Master Any Field.
              <span className="block mt-2 text-muted-foreground tracking-[-0.03em] font-semibold text-3xl sm:text-5xl md:text-5xl xl:text-6xl font-display">
                Zero Hallucinations<span className="text-orange-500">.</span>
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl font-body leading-relaxed font-normal">
              A deterministic multi-agent pedagogical engine that partitions any discipline into day-budgeted milestones, interactive Socratic verification, and verifiable proof sketches.
            </p>
          </div>

          {/* Right Column: Smooth Architectural Sculpture (No nested cards, badges, or AI clutter) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center group select-none">
              {/* Soft Ambient Diffused Backlight */}
              <div className="absolute inset-6 bg-gradient-to-tr from-orange-500/15 via-white/5 to-transparent blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" />

              {/* Seamless Masked Glass Sculpture */}
              <div className="relative w-full h-full overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]">
                <img
                  src="/images/hero-glass-matrix.png"
                  alt="Architectural Topological Sculpture"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                />
              </div>
            </div>
          </div>
        </div>

        {/* In-Cockpit Pit-Wall Trajectory Launcher Console (No Box Outline) */}
        <div className="mt-12 lg:mt-16 relative z-10">
          <div className="p-4 sm:p-6 rounded-2xl relative overflow-hidden">

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-foreground font-semibold">
                  PIT-WALL TRAJECTORY IGNITER
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
                AUTONOMOUS GEMINI PIPELINE
              </span>
            </div>

            <form onSubmit={handleDeployTrajectory} className="space-y-4">
              <div className="flex flex-col md:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="ENTER DOMAIN (e.g. Vulkan Swapchains, Quantum Algorithms, BGMI Tactical Pacing)..."
                    className="w-full h-13 px-4 rounded-xl bg-background dark:bg-black/60 border border-input dark:border-white/15 text-sm sm:text-base font-mono text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline">
                    DOMAIN INVARIANT
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <CustomDropdown<number>
                    value={totalDaysInput}
                    onChange={setTotalDaysInput}
                    accentColor="lime"
                    triggerClassName="h-13 min-w-[155px]"
                    options={[
                      { value: 7, label: "7 Days Sprint", sublabel: "High-density burst" },
                      { value: 14, label: "14 Days Masterclass", sublabel: "Core engineering rigor" },
                      { value: 21, label: "21 Days Deep Dive", sublabel: "Advanced synthesis" },
                      { value: 30, label: "30 Days Comprehensive", sublabel: "Exhaustive mastery" },
                    ]}
                  />

                  <CustomDropdown<number>
                    value={dailyHoursInput}
                    onChange={setDailyHoursInput}
                    accentColor="lime"
                    triggerClassName="h-13 min-w-[135px]"
                    options={[
                      { value: 1.5, label: "1.5 hrs/day", sublabel: "Focused pacing" },
                      { value: 2.5, label: "2.5 hrs/day", sublabel: "Target baseline" },
                      { value: 4.0, label: "4.0 hrs/day", sublabel: "Immersion velocity" },
                    ]}
                  />

                  <StarBorder as="div" color="#f97316" speed="3.5s" className="h-13">
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="h-13 px-6 sm:px-8 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(249,115,22,0.4)] active:scale-95 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="size-4 animate-spin text-black" />
                          <span>SYNTHESIZING...</span>
                        </>
                      ) : (
                        <>
                          <span>IGNITE TRAJECTORY</span>
                          <ArrowRight className="size-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </StarBorder>
                </div>
              </div>

              {/* Quick Launch Pre-set Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono text-muted-foreground">
                <span className="uppercase tracking-widest text-foreground/50">CONVICTION TRACKS:</span>
                <button
                  type="button"
                  onClick={() => {
                    setDomainInput("BGMI Tactical Frame Pacing & Latency Telemetry");
                    setTotalDaysInput(7);
                    setDailyHoursInput(2.0);
                  }}
                  className="px-2.5 py-1 rounded bg-muted dark:bg-white/5 hover:bg-muted/80 dark:hover:bg-white/10 text-foreground hover:text-orange-500 transition-colors border border-border dark:border-white/10"
                >
                  BGMI Tactical Latency
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDomainInput("Distributed Systems & Raft Consensus");
                    setTotalDaysInput(14);
                    setDailyHoursInput(2.5);
                  }}
                  className="px-2.5 py-1 rounded bg-muted dark:bg-white/5 hover:bg-muted/80 dark:hover:bg-white/10 text-foreground hover:text-orange-500 transition-colors border border-border dark:border-white/10"
                >
                  Distributed Consensus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDomainInput("Classical Guitar Biomechanics & Bach Polyphony");
                    setTotalDaysInput(7);
                    setDailyHoursInput(2.0);
                  }}
                  className="px-2.5 py-1 rounded bg-muted dark:bg-white/5 hover:bg-muted/80 dark:hover:bg-white/10 text-foreground hover:text-orange-500 transition-colors border border-border dark:border-white/10"
                >
                  Bach Voice Leading
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDomainInput("Quantum State Tomography & Hilbert Spaces");
                    setTotalDaysInput(21);
                    setDailyHoursInput(3.0);
                  }}
                  className="px-2.5 py-1 rounded bg-muted dark:bg-white/5 hover:bg-muted/80 dark:hover:bg-white/10 text-foreground hover:text-orange-500 transition-colors border border-border dark:border-white/10"
                >
                  Quantum Mechanics
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 1: DUAL VELOCITY MARQUEE BELTS (Accelerates with Lenis Scroll)
          ========================================================================= */}
      <section className="py-2 border-y border-border dark:border-white/10 bg-muted/40 dark:bg-black/40 backdrop-blur-md relative z-10">
        <VelocityMarquee
          baseSpeed={1.0}
          direction="left"
          items={[
            "01 ARCHITECT",
            "02 STRUCTURE",
            "03 SOCRATIC",
            "FIRST PRINCIPLES",
            "ZERO SPECULATIVE FILLER",
            "MINUTE-BUDGETED DAGs",
            "HIGH-VELOCITY COGNITION",
          ]}
        />
        <div className="h-[1px] bg-border dark:bg-white/5 w-full" />
        <VelocityMarquee
          baseSpeed={1.0}
          direction="right"
          items={[
            "DETERMINISTIC PEDAGOGY",
            "120HZ SCROLL VELOCITY",
            "REPRODUCIBLE MASTERY",
            "SUB-MILLISECOND RIGOR",
            "TACTICAL MERMAID TOPOLOGY",
            "DOMAIN NATIVE DRILLS",
          ]}
        />
      </section>

      {/* =========================================================================
          SECTION 2: THE IMPACT MANIFESTO (Editorial Spread & Stat Matrix)
          ========================================================================= */}
      <section className="py-28 sm:py-36 max-w-[1240px] mx-auto px-6 sm:px-10 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-muted dark:bg-white/5 border border-border dark:border-white/10">
            <span className="size-1.5 rounded-full bg-orange-500" />
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground font-semibold">
              PEDAGOGICAL FIDUCIARY MANIFESTO
            </span>
          </div>

          <blockquote className="text-3xl sm:text-5xl md:text-6xl font-normal font-serif tracking-tight text-foreground leading-[1.1] italic">
            “Redefining limits. Stripping away the fluff. Enforcing first-principles mastery in every single session.”
          </blockquote>

          <p className="mt-8 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed">
            Most online platforms deliver speculative course outlines or generic summaries. Roadmap.ai deploys a deterministic 3-agent pit wall that calculates your exact cognitive budget, maps prerequisite DAGs, and verifies understanding through domain-native Socratic dialogue.
          </p>
        </div>

        {/* Architectural Photo Strip */}
        <div className="mt-14 relative w-full h-56 sm:h-80 rounded-3xl overflow-hidden border border-border dark:border-white/10 group shadow-2xl bg-black">
          <img
            src="/images/manifesto-architecture.png"
            alt="Brutalist architectural concrete and obsidian glass junction"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 ease-out brightness-90 dark:brightness-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-background/20" />
          <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-orange-500" />
              <span className="uppercase tracking-widest text-[10px] text-foreground font-semibold">
                ARCHITECTURAL INVARIANT // DETERMINISTIC RIGOR
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
              HASSELBLAD MEDIUM FORMAT • MONOCHROME
            </span>
          </div>
        </div>

        {/* 4-Cell Telemetry Gauges with AnimatedCounter */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-border dark:bg-white/10 rounded-2xl border border-border dark:border-white/10 overflow-hidden shadow-lg dark:shadow-2xl backdrop-blur-md">
          <div className="p-6 sm:p-8 bg-card dark:bg-[#07080a] flex flex-col justify-between">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              ENROLLED PORTFOLIOS
            </span>
            <div className="mt-4">
              <span className="text-3xl sm:text-5xl font-black text-foreground font-mono">
                {isLoadingRoadmaps ? "..." : <AnimatedCounter value={roadmaps.length} duration={900} />}
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-mono ml-2 font-semibold uppercase">ACTIVE</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-card dark:bg-[#07080a] flex flex-col justify-between">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              CURRICULUM DAYS
            </span>
            <div className="mt-4">
              <span className="text-3xl sm:text-5xl font-black text-foreground font-mono">
                {isLoadingRoadmaps ? "..." : <AnimatedCounter value={totalDaysSum} duration={1100} />}
              </span>
              <span className="text-xs text-muted-foreground font-mono ml-2 font-semibold uppercase">PACED</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-card dark:bg-[#07080a] flex flex-col justify-between">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              TIME BUDGET
            </span>
            <div className="mt-4">
              <span className="text-3xl sm:text-5xl font-black text-foreground font-mono">
                {isLoadingRoadmaps ? (
                  "..."
                ) : (
                  <AnimatedCounter value={parseFloat(avgHours) || 2.0} decimals={1} duration={1000} />
                )}
              </span>
              <span className="text-xs text-muted-foreground font-mono ml-2 font-semibold uppercase">HRS/DAY</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-card dark:bg-[#07080a] flex flex-col justify-between">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              VERIFICATION RIGOR
            </span>
            <div className="mt-4">
              <span className="text-3xl sm:text-5xl font-black text-foreground font-mono">
                <AnimatedCounter value={100} suffix="%" duration={1200} />
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono ml-2 font-semibold uppercase">PROOF</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2.5: CONSENSYS STICKY PRODUCT STACK (Dynamic Agent Pipeline)
          ========================================================================= */}
      <StickyProductStack
        onSelectTrack={handleQuickLaunch}
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* =========================================================================
          SECTION 3: THE 3-AGENT MACHINE SHOWCASE (LN4 Helmets / Machine Equivalent)
          ========================================================================= */}
      <section id="agents" className="relative z-10 border-t border-border dark:border-white/10 bg-muted/20 dark:bg-black/30">
        <HorizontalAgentShowcase />
      </section>

      {/* =========================================================================
          SECTION 4: CURRICULA & TRAJECTORIES MATRIX
          ========================================================================= */}
      <section id="portfolio" className="py-24 max-w-[1340px] mx-auto px-6 sm:px-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border dark:border-white/10 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                CURRICULA REPERTOIRE
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-foreground uppercase font-display">
              Curricula & Trajectories<span className="text-orange-500">.</span>
            </h2>
          </div>

          <Button
            variant="orange"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="font-mono text-xs uppercase tracking-wider font-bold h-10 px-5"
          >
            <Plus className="size-3.5 mr-2" />
            Deploy New Trajectory
          </Button>
        </div>

        {/* Curricula Cards Grid (Strictly Level Heights & Border Glow) */}
        <div>
          {isLoadingRoadmaps ? (
            <div className="py-24 text-center rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 p-12">
              <Loader2 className="size-8 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-xs font-mono text-muted-foreground tracking-wider">
                TELEMETRY SYNC: Querying Supabase PostgreSQL...
              </p>
            </div>
          ) : roadmaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {roadmaps.map((r) => {
                const progress = r.progress_percentage || 0;
                const handleOpenTrajectory = () => {
                  if (!currentUser) {
                    transitionTo(`/login?redirectedFrom=${encodeURIComponent(`/workspace?id=${r.id}`)}`);
                  } else {
                    transitionTo(`/workspace?id=${r.id}`);
                  }
                };

                const coverImage = (() => {
                  const arch = (r.domain_archetype || "").toLowerCase();
                  const title = (r.title || "").toLowerCase();
                  if (arch.includes("esport") || title.includes("bgmi") || title.includes("game")) return "/images/track-esports.png";
                  if (arch.includes("system") || title.includes("distributed") || title.includes("consensus")) return "/images/track-distributed.png";
                  if (arch.includes("music") || title.includes("guitar") || title.includes("bach")) return "/images/track-polyphony.png";
                  return "/images/hero-glass-matrix.png";
                })();

                return (
                  <div
                    key={r.id}
                    onClick={handleOpenTrajectory}
                    className="cursor-pointer group block w-full h-full"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenTrajectory();
                      }
                    }}
                  >
                    <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                      <div className="rounded-2xl bg-card dark:bg-[#090b0e] border border-border dark:border-white/10 group-hover:border-orange-500/80 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.22)] flex flex-col justify-between h-full min-h-[440px] shadow-sm dark:shadow-xl transition-all duration-300 p-0 overflow-hidden">
                        {/* 16:9 Cover Image */}
                        <div className="relative w-full h-44 shrink-0 overflow-hidden bg-black/80">
                          <img
                            src={coverImage}
                            alt={r.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card dark:from-[#090b0e] via-black/25 to-transparent" />
                          
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/20 font-bold">
                              {r.domain_archetype?.replace("_", " ") || "DISCIPLINE"}
                            </span>
                            {currentUser && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteRoadmap(r, e);
                                }}
                                disabled={deletingId === r.id}
                                className="text-xs text-white/80 hover:text-red-400 p-1.5 rounded bg-black/60 backdrop-blur-md border border-white/15 hover:bg-red-500/20 transition-colors cursor-pointer relative z-20"
                                title="Delete trajectory"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-foreground group-hover:text-orange-500 transition-colors line-clamp-2 h-14 font-display">
                              {r.title}
                            </h3>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 font-mono">
                              <span>{r.total_days} Days</span>
                              <span>•</span>
                              <span>{r.daily_hours_commitment} hrs/day</span>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-border dark:border-white/10">
                            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
                              <span>Curriculum Velocity</span>
                              <span className="text-orange-500 font-semibold">{progress}%</span>
                            </div>
                            <Progress
                              value={progress}
                              indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-300"
                              className="mb-4 h-1.5 bg-muted dark:bg-white/10"
                            />

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {r.completed_topics_count || 0} topics mastered
                              </span>
                              <div className="text-xs font-bold text-foreground group-hover:text-orange-500 flex items-center gap-1 font-mono uppercase tracking-wider">
                                <span>Launch Studio</span>
                                <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                );
              })}

              {/* Quick Deploy New Card */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="rounded-2xl bg-card/60 dark:bg-white/[0.015] hover:bg-card dark:hover:bg-white/[0.04] border border-dashed border-border dark:border-white/20 hover:border-orange-500/80 hover:shadow-[0_0_24px_rgba(249,115,22,0.18)] flex flex-col items-center justify-center text-center cursor-pointer min-h-[440px] h-full p-8 group transition-all"
              >
                <div className="size-14 rounded-full border border-border dark:border-white/20 group-hover:border-orange-500 group-hover:bg-orange-500 flex items-center justify-center text-muted-foreground group-hover:text-white transition-all mb-4">
                  <Plus className="size-6" />
                </div>
                <h4 className="text-base font-mono font-bold uppercase tracking-wider text-foreground group-hover:text-orange-500 font-display">
                  Deploy New Trajectory
                </h4>
                <p className="text-xs font-mono text-muted-foreground mt-2 max-w-[240px]">
                  Deconstruct any complex subject through the multi-agent pit-wall.
                </p>
              </div>
            </div>
          ) : (
            /* Curated Starter Trajectories (Level Heights & Border Glow) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Track 01 */}
              <div
                onClick={() => handleQuickLaunch("BGMI Tactical Frame Pacing & Latency Telemetry", 7, 2.0)}
                className="cursor-pointer group block w-full h-full"
                role="button"
                tabIndex={0}
              >
                <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                  <div className="rounded-2xl bg-card dark:bg-[#090b0e] border border-border dark:border-white/10 group-hover:border-orange-500/80 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.22)] flex flex-col justify-between h-full min-h-[440px] shadow-sm dark:shadow-xl transition-all duration-300 p-0 overflow-hidden">
                    <div className="relative w-full h-44 shrink-0 overflow-hidden bg-black/80">
                      <img
                        src="/images/track-esports.png"
                        alt="BGMI Tactical Frame Pacing"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card dark:from-[#090b0e] via-black/25 to-transparent" />
                      <div className="absolute top-3.5 left-4">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/20 font-bold">
                          COMPETITIVE ESPORTS & GAMING
                        </span>
                      </div>
                      <div className="absolute top-3.5 right-4 text-xs font-mono font-bold text-white/50">
                        01
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground uppercase group-hover:text-orange-500 transition-colors font-display line-clamp-2 h-14">
                          BGMI Tactical Frame Pacing & Latency Telemetry
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed line-clamp-2">
                          Sub-millisecond touch-to-photon latency, Vulkan swapchain extensions, thread isolation, and Pochinki high-density combat profiling.
                        </p>
                        <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
                          <div>• 7 Days Paced Duration</div>
                          <div>• 2.0 Hours Daily Budget</div>
                          <div>• 21 Specialized Combat Drills</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border dark:border-white/10 w-full py-2.5 px-4 rounded-xl border border-border dark:border-white/20 group-hover:border-foreground text-foreground group-hover:bg-foreground group-hover:text-background font-mono text-xs uppercase tracking-wider flex items-center justify-between transition-all">
                        <span>Deploy Track</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </TiltedCard>
              </div>

              {/* Track 02 */}
              <div
                onClick={() => handleQuickLaunch("Distributed Systems & Raft Consensus", 14, 2.5)}
                className="cursor-pointer group block w-full h-full"
                role="button"
                tabIndex={0}
              >
                <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                  <div className="rounded-2xl bg-card dark:bg-[#090b0e] border border-border dark:border-white/10 group-hover:border-orange-500/80 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.22)] flex flex-col justify-between h-full min-h-[440px] shadow-sm dark:shadow-xl transition-all duration-300 p-0 overflow-hidden">
                    <div className="relative w-full h-44 shrink-0 overflow-hidden bg-black/80">
                      <img
                        src="/images/track-distributed.png"
                        alt="Distributed Systems & Raft Invariants"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card dark:from-[#090b0e] via-black/25 to-transparent" />
                      <div className="absolute top-3.5 left-4">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/20 font-bold">
                          DISTRIBUTED SYSTEMS
                        </span>
                      </div>
                      <div className="absolute top-3.5 right-4 text-xs font-mono font-bold text-white/50">
                        02
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground uppercase group-hover:text-orange-500 transition-colors font-display line-clamp-2 h-14">
                          Consensus Engines & Raft Invariants
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed line-clamp-2">
                          Leader election state machines, Multi-Paxos quorums, LSM-Tree write-ahead logs, and Jepsen chaos verification.
                        </p>
                        <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
                          <div>• 14 Days Paced Duration</div>
                          <div>• 2.5 Hours Daily Budget</div>
                          <div>• 42 Topological Topic Nodes</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border dark:border-white/10 w-full py-2.5 px-4 rounded-xl border border-border dark:border-white/20 group-hover:border-foreground text-foreground group-hover:bg-foreground group-hover:text-background font-mono text-xs uppercase tracking-wider flex items-center justify-between transition-all">
                        <span>Deploy Track</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </TiltedCard>
              </div>

              {/* Track 03 */}
              <div
                onClick={() => handleQuickLaunch("Classical Guitar Biomechanics & Bach Polyphony", 7, 2.0)}
                className="cursor-pointer group block w-full h-full"
                role="button"
                tabIndex={0}
              >
                <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                  <div className="rounded-2xl bg-card dark:bg-[#090b0e] border border-border dark:border-white/10 group-hover:border-orange-500/80 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.22)] flex flex-col justify-between h-full min-h-[440px] shadow-sm dark:shadow-xl transition-all duration-300 p-0 overflow-hidden">
                    <div className="relative w-full h-44 shrink-0 overflow-hidden bg-black/80">
                      <img
                        src="/images/track-polyphony.png"
                        alt="Classical Guitar & Bach Polyphony"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card dark:from-[#090b0e] via-black/25 to-transparent" />
                      <div className="absolute top-3.5 left-4">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/20 font-bold">
                          ACOUSTICS & ERGONOMICS
                        </span>
                      </div>
                      <div className="absolute top-3.5 right-4 text-xs font-mono font-bold text-white/50">
                        03
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground uppercase group-hover:text-orange-500 transition-colors font-display line-clamp-2 h-14">
                          Classical Guitar & Bach Polyphony
                        </h3>
                        <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed line-clamp-2">
                          Right-hand nail mechanics, voice leading analysis, Bach 2-part inventions, and microtonal counterpoint.
                        </p>
                        <div className="mt-4 space-y-1 text-xs text-muted-foreground font-mono">
                          <div>• 7 Days Paced Duration</div>
                          <div>• 2.0 Hours Daily Budget</div>
                          <div>• 21 Ergonomic Drills</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border dark:border-white/10 w-full py-2.5 px-4 rounded-xl border border-border dark:border-white/20 group-hover:border-foreground text-foreground group-hover:bg-foreground group-hover:text-background font-mono text-xs uppercase tracking-wider flex items-center justify-between transition-all">
                        <span>Deploy Track</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </TiltedCard>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: MACHINE INVARIANTS & FIDUCIARY CONSOLE
          ========================================================================= */}
      <section className="py-24 max-w-[1340px] mx-auto px-6 sm:px-10 relative z-10 border-t border-border dark:border-white/10">
        <div className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              CORE SYSTEM INVARIANTS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.03em] text-foreground uppercase">
            Architectural Guarantees<span className="text-lime-600 dark:text-[#d4f934]">.</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-2 leading-relaxed">
            Zero hallucinated tangents. Every lesson is anchored in mathematical time budgeting and verifiable diagnostics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
          <div className="p-6 rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">01 / DECOMPOSITION</span>
              <h4 className="text-sm font-bold text-foreground mt-2 uppercase font-display">First-Principles Partitioning</h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Agent 01 breaks any domain down into chronological daily milestones without speculative tangents.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border dark:border-white/10 text-[10px] text-muted-foreground uppercase">
              AGENT 01 ARCHITECT
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold text-lime-700 dark:text-[#d4f934]">02 / TIME-BUDGET</span>
              <h4 className="text-sm font-bold text-foreground mt-2 uppercase font-display">Minute-Allocated DAGs</h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Agent 02 calculates minute budgets for foundational drills, applications, and edge cases.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border dark:border-white/10 text-[10px] text-muted-foreground uppercase">
              AGENT 02 STRUCTURE
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">03 / SOCRATIC</span>
              <h4 className="text-sm font-bold text-foreground mt-2 uppercase font-display">Diagnostic Verification</h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Agent 03 tests comprehension via counter-example interrogations rather than trivial multiple-choice quiz questions.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border dark:border-white/10 text-[10px] text-muted-foreground uppercase">
              AGENT 03 TEACHER
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">04 / PERSISTENCE</span>
              <h4 className="text-sm font-bold text-foreground mt-2 uppercase font-display">PostgreSQL Isolation</h4>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Supabase schema with compound B-tree indexing and Row Level Security guarantees isolated multi-tenant learning state.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border dark:border-white/10 text-[10px] text-muted-foreground uppercase">
              SUPABASE CLOUD
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5.5: CONSENSYS LARGE OFFSET CTA STATEMENT & TERMINAL CONSOLE
          ========================================================================= */}
      <ConsensysOffsetCta
        onOpenModal={() => setIsModalOpen(true)}
        onSelectTrack={handleQuickLaunch}
      />

      {/* =========================================================================
          SECTION 6: SYNDICATE PARTNERS & RESEARCH STACK (Lando Collabs Equivalent)
          ========================================================================= */}
      <section className="py-14 border-t border-border dark:border-white/10 bg-muted/40 dark:bg-black/60 relative z-10">
        <div className="max-w-[1340px] mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono text-muted-foreground">
          <span className="tracking-widest uppercase text-foreground/50">RESEARCH & ENGINE STACK:</span>
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-muted-foreground tracking-wider">
            <span className="hover:text-foreground transition-colors">NEXT.JS 15 TURBOPACK</span>
            <span className="hover:text-foreground transition-colors">SUPABASE POSTGRESQL</span>
            <span className="hover:text-foreground transition-colors">LENIS 120HZ ENGINE</span>
            <span className="hover:text-foreground transition-colors">GOOGLE GEMINI 2.5</span>
            <span className="hover:text-foreground transition-colors">TAILWIND CSS</span>
            <span className="hover:text-foreground transition-colors">FRAMER MOTION</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: RACE-SPEC FOOTER (Lando Norris Minimalist Editorial Layout)
          ========================================================================= */}
      <footer className="border-t border-border dark:border-white/10 py-16 px-6 sm:px-12 max-w-[1340px] mx-auto relative z-10 text-xs font-mono text-muted-foreground">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]" />
              <span className="text-sm font-black text-foreground uppercase tracking-tight font-sans">
                ROADMAP<span className="text-orange-500">.AI</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Autonomous Pedagogical Syndicate. Deterministic 3-agent learning engine engineered for high-velocity cognitive mastery.
            </p>
          </div>

          <div>
            <div className="text-foreground uppercase font-bold tracking-widest text-[11px] mb-3">
              NAVIGATION
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#cockpit" className="hover:text-foreground transition-colors">Cockpit</a></li>
              <li><a href="#agents" className="hover:text-foreground transition-colors">Multi-Agent Syndicate</a></li>
              <li><a href="#portfolio" className="hover:text-foreground transition-colors">Curricula Matrix</a></li>
              <li><Link href="/billing" className="hover:text-foreground transition-colors">Token Quotas</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-foreground uppercase font-bold tracking-widest text-[11px] mb-3">
              TELEMETRY
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li><span>ENGINE: v3.4 [ARMED]</span></li>
              <li><span>DATABASE: SUPABASE OK</span></li>
              <li><span>SCROLL: 120HZ LENIS</span></li>
              <li><span className="text-orange-600 dark:text-orange-400">LATENCY: DETERMINISTIC</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
          <div>
            © {new Date().getFullYear()} ROADMAP.AI SYNDICATE. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-6">
            <span>TERMS</span>
            <span>PRIVACY</span>
            <span className="text-lime-700 dark:text-[#d4f934]">DETERMINISTIC COGNITION</span>
          </div>
        </div>
      </footer>

      {/* Trajectory Architect Modal using Shadcn Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card dark:bg-[#090b0e] border border-border dark:border-white/15 text-foreground font-mono sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                AUTONOMOUS CURRICULUM ARCHITECT
              </span>
            </div>
            <DialogTitle className="text-xl font-bold font-sans text-foreground uppercase">
              Deploy Learning Trajectory
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure your domain, duration, and daily time commitment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeployTrajectory} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                Field of Study / Syllabus Context
              </label>
              <Input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. Distributed Consensus, Classical Guitar, BGMI Combat..."
                className="bg-background dark:bg-black/60 border-input dark:border-white/20 text-foreground font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Duration (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={totalDaysInput}
                  onChange={(e) => setTotalDaysInput(Number(e.target.value))}
                  className="bg-background dark:bg-black/60 border-input dark:border-white/20 text-foreground font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Daily Commitment (Hours)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={dailyHoursInput}
                  onChange={(e) => setDailyHoursInput(Number(e.target.value))}
                  className="bg-background dark:bg-black/60 border-input dark:border-white/20 text-foreground font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                Skill Level
              </label>
              <CustomDropdown<string>
                value={skillLevelInput}
                onChange={(v) => setSkillLevelInput(v as any)}
                accentColor="orange"
                className="w-full"
                triggerClassName="w-full h-10 px-3.5"
                menuClassName="w-full"
                options={[
                  { value: "beginner", label: "Beginner", sublabel: "Foundational Rigor & Core Invariants" },
                  { value: "intermediate", label: "Intermediate", sublabel: "Applied Engineering & Real-world Drills" },
                  { value: "advanced", label: "Advanced", sublabel: "Production Mastery & Edge Case Verification" },
                ]}
              />
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="orange"
                disabled={isGenerating}
                className="font-mono text-xs uppercase tracking-wider font-bold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Trajectory</span>
                    <ArrowRight className="size-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bespoke Telemetry Confirm Dialog */}
      <TelemetryConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="PURGE CURRICULUM TRAJECTORY"
        description={
          roadmapToDelete
            ? `Are you sure you want to permanently delete "${roadmapToDelete.title}"? All associated topic DAG nodes, telemetry milestones, and Socratic history will be expunged from Supabase PostgreSQL.`
            : "Are you sure you want to delete this trajectory?"
        }
        confirmText="PURGE FROM SUPABASE"
        cancelText="ABORT"
        variant="danger"
        isLoading={deletingId !== null}
        onConfirm={handleConfirmDelete}
      />
    </ClickSpark>
  );
}
