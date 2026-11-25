"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getUserRoadmaps,
  saveRoadmapToSupabase,
  RoadmapSummary,
} from "@/lib/supabase-roadmap";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Plus,
} from "@/components/ui/icons";
import {
  AnimatedCounter,
  TiltedCard,
} from "@/components/react-bits";
import { HorizontalAgentShowcase } from "@/components/horizontal-agent-showcase";
import { SiteOpeningAnimation } from "@/components/site-opening-animation";
import { SiteFooter } from "@/components/site-footer";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { showTelemetryToast } from "@/components/ui/telemetry-toast";
import { usePageTransition } from "@/components/page-transition";
import { useLenis } from "@/components/smooth-scroll";
import {
  isInternalNavigation,
  clearInternalNavigationFlag,
} from "@/lib/navigation-tracker";

export default function LandingPage() {
  const router = useRouter();
  const { transitionTo } = usePageTransition();
  const lenis = useLenis();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Animation states - only play on initial visit or refresh, NEVER on internal route hop back to home
  const [animationActive, setAnimationActive] = useState(() => !isInternalNavigation());
  const [pageRevealed, setPageRevealed] = useState(() => isInternalNavigation());
  const [animationDone, setAnimationDone] = useState(() => isInternalNavigation());

  // Roadmaps state
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);

  // Trajectory Architect Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("Distributed Systems & Consensus Engines");
  const [totalDaysInput, setTotalDaysInput] = useState(14);
  const [dailyHoursInput, setDailyHoursInput] = useState(2.5);
  const [skillLevelInput, setSkillLevelInput] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Initial user & roadmaps load with live auth listener
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Guarantee that after 2.5 seconds, the loading spinner is dismissed no matter what
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoadingRoadmaps(false);
      }
    }, 2500);

    async function loadData(targetUser?: any) {
      setIsLoadingRoadmaps(true);
      try {
        let user = targetUser;
        if (user === undefined) {
          const { data: authData } = await supabase.auth.getUser();
          user = authData?.user ?? null;
        }
        if (!isMounted) return;
        setCurrentUser(user);

        const loaded = await getUserRoadmaps(user ? user.id : "guest");
        if (!isMounted) return;
        setRoadmaps(loaded);
      } catch (err) {
        console.warn("Notice loading user roadmaps:", err);
      } finally {
        clearTimeout(safetyTimer);
        setIsLoadingRoadmaps(false);
      }
    }

    loadData();

    // Listen to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setCurrentUser(null);
        setIsLoadingRoadmaps(true);
        try {
          const guestRoadmaps = await getUserRoadmaps("guest");
          if (isMounted) {
            setRoadmaps(guestRoadmaps);
          }
        } finally {
          setIsLoadingRoadmaps(false);
        }
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        loadData(session?.user);
      }
    });

    // Listen to custom global auth events (dispatched from navbar logout immediately)
    const handleCustomAuthChange = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!isMounted) return;
      if (customEvent.detail?.event === "SIGNED_OUT") {
        setCurrentUser(null);
        setIsLoadingRoadmaps(true);
        try {
          const guestRoadmaps = await getUserRoadmaps("guest");
          if (isMounted) {
            setRoadmaps(guestRoadmaps);
          }
        } finally {
          setIsLoadingRoadmaps(false);
        }
      } else if (customEvent.detail?.session?.user) {
        loadData(customEvent.detail.session.user);
      } else {
        loadData();
      }
    };

    window.addEventListener("roadmap-auth-state-changed", handleCustomAuthChange);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
      window.removeEventListener("roadmap-auth-state-changed", handleCustomAuthChange);
    };
  }, []);

  // 2. Lock scroll to top & prevent browser jump on refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Disable browser native scroll restoration on refresh
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      // If it's a fresh load or browser refresh (not internal route hop), enforce top scroll
      if (!isInternalNavigation()) {
        window.scrollTo(0, 0);
        if (lenis) {
          lenis.scrollTo(0, { immediate: true });
        }

        // If page has a hash anchor on reload (e.g. user refreshed on /#portfolio),
        // clear it immediately so it doesn't jump down past the hero!
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      // If returning via internal navigation, guarantee intro animation is skipped
      if (isInternalNavigation()) {
        setAnimationActive(false);
        setPageRevealed(true);
        setAnimationDone(true);
        const timer = setTimeout(() => {
          clearInternalNavigationFlag();
        }, 600);
        return () => clearTimeout(timer);
      }
    }

    const handleReplay = () => {
      setAnimationActive(true);
      setPageRevealed(false);
      setAnimationDone(false);
      window.scrollTo(0, 0);
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      }
    };

    window.addEventListener("roadmap-replay-site-intro", handleReplay);
    return () => window.removeEventListener("roadmap-replay-site-intro", handleReplay);
  }, [lenis]);

  // 3. Handle direct hash navigation e.g. clicking Curricula in the navbar AFTER animation is complete
  useEffect(() => {
    if (animationActive) return;

    const handleHashScroll = (smooth = true) => {
      if (typeof window === "undefined") return;
      const currentHash = window.location.hash.replace("#", "");

      if (currentHash === "portfolio") {
        const el = document.getElementById("portfolio");
        if (el) {
          if (lenis) {
            lenis.scrollTo(el, { offset: -60, duration: smooth ? 1.0 : 0 });
          } else {
            el.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
          }
        }
      }
    };

    const onHashChange = () => handleHashScroll(true);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [animationActive, lenis]);

  // 4. Listen for navbar Deploy button click
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
      const isQuota =
        err?.name === "TokenQuotaExceededError" ||
        err?.message?.toLowerCase().includes("token budget exhausted") ||
        err?.message?.toLowerCase().includes("quota");

      if (isQuota) {
        setIsModalOpen(false);
      }

      showTelemetryToast({
        type: "error",
        title: isQuota ? "ALLOCATION EXHAUSTED" : "SYNTHESIS FAILED",
        message: err.message || "Failed to compile curriculum trajectory.",
      });
    } finally {
      setIsGenerating(false);
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
    <main className="relative min-h-screen w-full bg-background text-foreground font-sans overflow-x-hidden selection:bg-[#d4f934] selection:text-[#08090b]">
      {/* Preload hero images for zero-latency reveal (high-res 2750px) */}
      <link rel="preload" as="image" href="/images/hero-cockpit-dark.png?v=hires-2750" />
      <link rel="preload" as="image" href="/images/hero-cockpit-light.png?v=hires-2750" />

      {/* Opening Intro Animation:
          1. Scales/blurs into center
          2. Glides smoothly to top center
          3. Exact 0.5s blank screen pause
          4. Triggers onRevealStart() -> Page blurs into focus
      */}
      {animationActive && (
        <SiteOpeningAnimation
          onRevealStart={() => {
            setPageRevealed(true);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("roadmap-reveal-start"));
            }
          }}
          onComplete={() => {
            setPageRevealed(true);
            setAnimationDone(true);
          }}
        />
      )}

      {/* Full-screen Content Container: Blurs into focus when the intro ends */}
      <div
        key="hero-content-wrapper"
        className={`w-full flex flex-col ${
          animationDone ? "" : `intro-reveal ${pageRevealed ? "is-revealed" : ""}`
        }`}
      >
        {/* =========================================================================
            SECTION 1: FULL SCREEN HERO PICTURE
            ========================================================================= */}
        <section
          id="cockpit"
          aria-label="Mastery Cockpit"
          className="relative w-full h-screen min-h-screen overflow-hidden select-none bg-background shrink-0"
        >
          {/* Dark Mode Cockpit Picture (Softened opacity for atmospheric integration) */}
          <img
            src="/images/hero-cockpit-dark.png?v=hires-2750"
            alt="Daari Late-Night Mastery Cockpit"
            className="w-full h-full object-cover object-center hidden dark:block select-none pointer-events-none opacity-75 sm:opacity-80"
            loading="eager"
            decoding="sync"
          />

          {/* Light Mode Cockpit Picture (Softened opacity for atmospheric integration) */}
          <img
            src="/images/hero-cockpit-light.png?v=hires-2750"
            alt="Daari Daybreak Study Cockpit"
            className="w-full h-full object-cover object-center block dark:hidden select-none pointer-events-none opacity-75 sm:opacity-80"
            loading="eager"
            decoding="sync"
          />

          {/* Atmospheric Contrast Scrim (Smooth gradient for razor-sharp typography contrast) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/85 pointer-events-none" />

          {/* The Hero Typography & Cockpit Telemetry - Centered & Aligned Container */}
          <div className="absolute inset-0 z-20 flex flex-col justify-between max-w-[1240px] mx-auto px-6 sm:px-10 pt-36 sm:pt-40 md:pt-44 lg:pt-48 pb-8 sm:pb-10 pointer-events-none">
            {/* Top & Middle Content Group */}
            <div className="max-w-4xl">
              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-[-0.035em] text-white leading-[0.96] drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
                Master Any Field.
                <span className="block mt-2 sm:mt-3 text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-zinc-300 font-display drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
                  Zero Hallucinations
                </span>
              </h1>

              {/* Core Description */}
              <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg lg:text-xl text-zinc-200 max-w-2xl font-body leading-relaxed font-normal drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                A deterministic multi-agent pedagogical engine that partitions any discipline into day-budgeted milestones, interactive Socratic verification, and verifiable proof sketches.
              </p>

              {/* Aligned Interactive Controls */}
              <div className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      transitionTo("/login?redirectedFrom=" + encodeURIComponent("/"));
                    } else {
                      setIsModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(249,115,22,0.4)] active:scale-95 cursor-pointer"
                >
                  <Plus className="size-4 stroke-[2.5]" />
                  <span>Deploy Trajectory</span>
                </button>

                <a
                  href="#portfolio"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("portfolio");
                    if (el) {
                      if (lenis) {
                        lenis.scrollTo(el, { offset: -60, duration: 1.0 });
                      } else {
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
                >
                  <span>Explore Curricula</span>
                  <ArrowRight className="size-3.5 stroke-[2]" />
                </a>
              </div>
            </div>

            {/* Centered Bottom Scroll Indicator */}
            <div className="w-full flex items-center justify-center pointer-events-none">
              <a
                href="#architecture"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("architecture");
                  if (el) {
                    if (lenis) {
                      lenis.scrollTo(el, { offset: -40, duration: 1.0 });
                    } else {
                      el.scrollIntoView({ behavior: "smooth" });
                    }
                  }
                }}
                className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-zinc-400 hover:text-white transition-colors pointer-events-auto cursor-pointer"
              >
                <span>SCROLL DOWN TO EXPLORE</span>
                <span className="animate-bounce">↓</span>
              </a>
            </div>
          </div>
        </section>

        {/* Below the first screen: the picture continues as a reflection and fades into the page.
            The opacity and scrim match the bottom edge of the hero so there is no seam. */}
        <div
          aria-hidden="true"
          className="relative w-full h-[55vh] shrink-0 overflow-hidden pointer-events-none select-none [mask-image:linear-gradient(to_bottom,black_0%,rgb(0_0_0/0.86)_20%,rgb(0_0_0/0.58)_45%,rgb(0_0_0/0.26)_70%,rgb(0_0_0/0.07)_88%,transparent_100%)]"
        >
          <img
            src="/images/hero-cockpit-dark.png?v=hires-2750"
            alt=""
            className="absolute inset-x-0 top-0 w-full h-screen max-w-none -scale-y-100 object-cover object-center hidden dark:block opacity-75 sm:opacity-80"
          />
          <img
            src="/images/hero-cockpit-light.png?v=hires-2750"
            alt=""
            className="absolute inset-x-0 top-0 w-full h-screen max-w-none -scale-y-100 object-cover object-center block dark:hidden opacity-75 sm:opacity-80"
          />
          {/* Goes solid before the mirrored desk objects would show */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-[#0a0a0a] via-[18%] to-[#0a0a0a]" />
        </div>

        {/* =========================================================================
            SECTION 2: ARCHITECTURE & PEDAGOGICAL MANIFESTO
            ========================================================================= */}
        <section id="architecture" className="py-28 sm:py-36 max-w-[1240px] mx-auto px-6 sm:px-10 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <blockquote className="text-3xl sm:text-5xl md:text-6xl font-normal font-serif tracking-tight text-foreground leading-[1.1] italic">
              “Redefining limits. Stripping away the fluff. Enforcing first-principles mastery in every single session.”
            </blockquote>

            <p className="mt-8 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed">
              Most online platforms deliver speculative course outlines or generic summaries. Daari deploys a deterministic 3-agent learning system that calculates your exact cognitive budget, maps prerequisite DAGs, and verifies understanding through domain-native Socratic dialogue.
            </p>
          </div>

          {/* 4-Cell Telemetry Gauges with AnimatedCounter */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border dark:bg-white/10 rounded-2xl border border-border dark:border-white/10 overflow-hidden shadow-lg dark:shadow-2xl backdrop-blur-md">
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
            SECTION 3: THE 3-AGENT SYSTEM ARCHITECTURE SHOWCASE
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
              <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-foreground uppercase font-display">
                Curricula & Trajectories
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/studio"
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-950 dark:border-white shadow-sm hover:opacity-90 transition-all group select-none cursor-pointer"
              >
                <ArrowUpRight className="size-4 text-orange-500 dark:text-orange-600 shrink-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                <span className="text-sm font-black tracking-[-0.03em] font-display uppercase leading-none text-center">
                  STUDIO
                </span>
              </Link>

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
          </div>

          {/* Curricula Cards Grid */}
          <div>
            {isLoadingRoadmaps ? (
              <div className="py-24 text-center rounded-2xl bg-card dark:bg-white/[0.02] border border-border dark:border-white/10 p-12">
                <Loader2 className="size-8 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-xs font-mono text-muted-foreground tracking-wider">
                  Loading curricula...
                </p>
              </div>
            ) : roadmaps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {roadmaps.map((r) => {
                  const progress = r.progress_percentage || 0;
                  const handleOpenTrajectory = () => {
                    if (!currentUser) {
                      transitionTo(`/login?redirectedFrom=${encodeURIComponent("/studio")}`);
                    } else {
                      transitionTo("/studio");
                    }
                  };

                  return (
                    <div
                      key={r.id}
                      onClick={handleOpenTrajectory}
                      className="cursor-pointer group block w-full h-full text-left"
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
                        <div className="rounded-2xl bg-card dark:bg-[#0b0d10] border border-border dark:border-white/10 group-hover:border-foreground/40 dark:group-hover:border-white/30 flex flex-col justify-between h-full min-h-[220px] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200">
                          <div>
                            {/* Top Meta */}
                            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                              <span className="uppercase tracking-wider text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                                {r.domain_archetype?.replace(/_/g, " ") || "Curriculum"}
                              </span>
                              <span>{r.total_days}d · {r.daily_hours_commitment}h/day</span>
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-foreground group-hover:text-orange-500 transition-colors font-display tracking-tight leading-snug line-clamp-2">
                              {r.title}
                            </h3>
                          </div>

                          {/* Bottom: Progress + Action */}
                          <div className="mt-8 pt-4 border-t border-border/60 dark:border-white/10 flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground">
                              {progress}% completed
                            </span>
                            <div className="text-xs font-mono text-foreground font-semibold flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                              <span>Open</span>
                              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-orange-500" />
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
                  className="rounded-2xl border border-dashed border-border dark:border-white/20 hover:border-orange-500/80 bg-card/40 dark:bg-white/[0.015] hover:bg-card/70 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] p-8 group transition-all"
                >
                  <div className="size-11 rounded-full border border-border dark:border-white/20 group-hover:border-orange-500 group-hover:bg-orange-500 group-hover:text-black flex items-center justify-center text-muted-foreground transition-all mb-3">
                    <Plus className="size-5 stroke-[2.5]" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-foreground group-hover:text-orange-500 font-display">
                    Deploy New Trajectory
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    Deconstruct any complex discipline
                  </p>
                </div>
              </div>
            ) : (
              /* Curated Starter Trajectories — Ultra Minimal */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Track 01 */}
                <div
                  onClick={() => handleQuickLaunch("BGMI Tactical Frame Pacing & Latency Telemetry", 7, 2.0)}
                  className="cursor-pointer group block w-full h-full text-left"
                  role="button"
                  tabIndex={0}
                >
                  <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                    <div className="rounded-2xl bg-card dark:bg-[#0b0d10] border border-border dark:border-white/10 group-hover:border-foreground/40 dark:group-hover:border-white/30 flex flex-col justify-between h-full min-h-[240px] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200">
                      <div>
                        {/* Top Meta */}
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                          <span className="uppercase tracking-wider text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                            Competitive Gaming
                          </span>
                          <span>7d · 2h/day</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-foreground group-hover:text-orange-500 transition-colors font-display tracking-tight leading-snug">
                          BGMI Tactical Frame Pacing & Latency Telemetry
                        </h3>

                        {/* Short Description */}
                        <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed line-clamp-2">
                          Sub-millisecond touch latency, Vulkan swapchain extensions, and combat profiling.
                        </p>
                      </div>

                      {/* Bottom Link */}
                      <div className="mt-8 pt-4 border-t border-border/60 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          21 Drills
                        </span>
                        <div className="text-xs font-mono text-foreground font-semibold flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                          <span>Deploy Track</span>
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform text-orange-500" />
                        </div>
                      </div>
                    </div>
                  </TiltedCard>
                </div>

                {/* Track 02 */}
                <div
                  onClick={() => handleQuickLaunch("Distributed Systems & Raft Consensus", 14, 2.5)}
                  className="cursor-pointer group block w-full h-full text-left"
                  role="button"
                  tabIndex={0}
                >
                  <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                    <div className="rounded-2xl bg-card dark:bg-[#0b0d10] border border-border dark:border-white/10 group-hover:border-foreground/40 dark:group-hover:border-white/30 flex flex-col justify-between h-full min-h-[240px] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200">
                      <div>
                        {/* Top Meta */}
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                          <span className="uppercase tracking-wider text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                            Distributed Systems
                          </span>
                          <span>14d · 2.5h/day</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-foreground group-hover:text-orange-500 transition-colors font-display tracking-tight leading-snug">
                          Consensus Engines & Raft Invariants
                        </h3>

                        {/* Short Description */}
                        <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed line-clamp-2">
                          Leader election state machines, Multi-Paxos quorums, write-ahead logs, and Jepsen chaos.
                        </p>
                      </div>

                      {/* Bottom Link */}
                      <div className="mt-8 pt-4 border-t border-border/60 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          42 Topics
                        </span>
                        <div className="text-xs font-mono text-foreground font-semibold flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                          <span>Deploy Track</span>
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform text-orange-500" />
                        </div>
                      </div>
                    </div>
                  </TiltedCard>
                </div>

                {/* Track 03 */}
                <div
                  onClick={() => handleQuickLaunch("Classical Guitar Biomechanics & Bach Polyphony", 7, 2.0)}
                  className="cursor-pointer group block w-full h-full text-left"
                  role="button"
                  tabIndex={0}
                >
                  <TiltedCard maxAngle={3} scale={1.01} showGlare={false} className="w-full h-full">
                    <div className="rounded-2xl bg-card dark:bg-[#0b0d10] border border-border dark:border-white/10 group-hover:border-foreground/40 dark:group-hover:border-white/30 flex flex-col justify-between h-full min-h-[240px] p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-200">
                      <div>
                        {/* Top Meta */}
                        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                          <span className="uppercase tracking-wider text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                            Acoustics & Music
                          </span>
                          <span>7d · 2h/day</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-foreground group-hover:text-orange-500 transition-colors font-display tracking-tight leading-snug">
                          Classical Guitar & Bach Polyphony
                        </h3>

                        {/* Short Description */}
                        <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed line-clamp-2">
                          Right-hand nail mechanics, voice leading analysis, Bach 2-part inventions, and counterpoint.
                        </p>
                      </div>

                      {/* Bottom Link */}
                      <div className="mt-8 pt-4 border-t border-border/60 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          28 Drills
                        </span>
                        <div className="text-xs font-mono text-foreground font-semibold flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                          <span>Deploy Track</span>
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform text-orange-500" />
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
            SECTION 5: SUI-GRADE ARCHITECTURAL FOOTER WITH EMBLEM LOGO
            ========================================================================= */}
        <SiteFooter />
      </div>

      {/* Trajectory Architect Modal using Shadcn Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card dark:bg-[#090b0e] border border-border dark:border-white/15 text-foreground font-mono sm:max-w-md">
          <DialogHeader>
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
    </main>
  );
}
