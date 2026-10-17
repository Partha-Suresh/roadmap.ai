"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getUserRoadmaps,
  getRoadmapById,
  RoadmapSummary,
} from "@/lib/supabase-roadmap";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  Layers,
  Sparkles,
} from "@/components/ui/icons";
import { TiltedCard, StarBorder } from "@/components/react-bits";
import { usePageTransition } from "@/components/page-transition";
import { useLenis } from "@/components/smooth-scroll";

interface RoadmapWithResume extends RoadmapSummary {
  resumeDayNumber?: number;
  resumeTopicTitle?: string;
  isFullyCompleted?: boolean;
}

export default function StudioPage() {
  const router = useRouter();
  const { transitionTo } = usePageTransition();
  const lenis = useLenis();
  const supabase = createClient();

  // User & Data State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("Architect");
  const [roadmaps, setRoadmaps] = useState<RoadmapWithResume[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Animation Stage Machine
  // 1. "greeting": Hey [Name] + Welcome to the studio (~5s)
  // 2. "question": "What are we doing today?" (2s)
  // 3. "repertoire": The roadmaps grid
  const [stage, setStage] = useState<"greeting" | "question" | "repertoire">("greeting");
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [questionVisible, setQuestionVisible] = useState(false);

  // 1. Fetch User and Roadmaps with Resume Telemetry
  useEffect(() => {
    let isMounted = true;

    async function loadStudioData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (!user) {
          // If not logged in, prompt to login or show default state
          setCurrentUser(null);
          setUserName("Architect");
        } else {
          setCurrentUser(user);

          // Extract user name from auth metadata or profiles table
          let resolvedName = "";
          const meta = user.user_metadata;
          if (meta?.full_name) resolvedName = meta.full_name;
          else if (meta?.name) resolvedName = meta.name;
          else if (meta?.first_name) resolvedName = meta.first_name;

          // Also check profiles table in Supabase
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", user.id)
              .maybeSingle();

            if (profile?.full_name) resolvedName = profile.full_name;
            else if (!resolvedName && profile?.username) resolvedName = profile.username;
          } catch {
            // non-fatal
          }

          if (!resolvedName && user.email) {
            const emailPrefix = user.email.split("@")[0].replace(/[._-]/g, " ");
            resolvedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          }

          setUserName(resolvedName.trim() || "Architect");
        }

        // Fetch User's Roadmaps
        const rawRoadmaps = await getUserRoadmaps(user ? user.id : "guest");
        if (!isMounted) return;

        // Augment each roadmap with the exact day/topic where the user stopped
        const augmented: RoadmapWithResume[] = await Promise.all(
          rawRoadmaps.map(async (r) => {
            try {
              const full = await getRoadmapById(r.id);
              if (full && full.days && full.days.length > 0) {
                for (const d of full.days) {
                  const unfinished = d.topics.find((t) => t.status !== "completed");
                  if (unfinished) {
                    return {
                      ...r,
                      resumeDayNumber: d.day_number,
                      resumeTopicTitle: unfinished.title,
                      isFullyCompleted: false,
                    };
                  }
                }
                return {
                  ...r,
                  resumeDayNumber: full.days[full.days.length - 1].day_number,
                  resumeTopicTitle: "All milestones mastered",
                  isFullyCompleted: true,
                };
              }
            } catch {
              // fallback
            }
            return {
              ...r,
              resumeDayNumber: 1,
              resumeTopicTitle: "Day 1 Initial Milestone",
              isFullyCompleted: false,
            };
          })
        );

        if (isMounted) {
          setRoadmaps(augmented);
        }
      } catch (err) {
        console.warn("Studio data loading notice:", err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    }

    loadStudioData();
    return () => { isMounted = false; };
  }, [supabase]);

  // 2. Cinematic Animation Sequence Timer (Greeting timing tuned: +0.75s)
  useEffect(() => {
    // Stage 1: Hey [Name] blurs in at 100ms
    const t1 = setTimeout(() => {
      setGreetingVisible(true);
    }, 100);

    // Welcome to the studio blurs in at 500ms
    const t2 = setTimeout(() => {
      setWelcomeVisible(true);
    }, 500);

    // Hey [Name] and Welcome blur out after ~2.55s (+0.75s adjustment)
    const t3 = setTimeout(() => {
      setGreetingVisible(false);
      setWelcomeVisible(false);
    }, 2550);

    // Stage 2: "What are we doing today?" blurs in at 3.05s
    const t4 = setTimeout(() => {
      setStage("question");
      setQuestionVisible(true);
    }, 3050);

    // "What are we doing today?" stays for 2.0s, then blurs out at 5.05s
    const t5 = setTimeout(() => {
      setQuestionVisible(false);
    }, 5050);

    // Stage 3: Transition to Repertoire at 5.45s
    const t6 = setTimeout(() => {
      setStage("repertoire");
    }, 5450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, []);

  // Keyboard shortcut to skip intro animation immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        if (stage !== "repertoire") {
          setStage("repertoire");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage]);

  // Handle roadmap selection: takes user back to where they stopped
  const handleSelectRoadmap = (roadmapId: string) => {
    transitionTo(`/workspace?id=${roadmapId}`);
  };

  const handleSkipIntro = () => {
    setStage("repertoire");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-950 dark:selection:text-orange-100 transition-colors duration-200">
      {/* Background dot grid */}
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-35 dark:opacity-25" />

      {/* Subtle Atmospheric Diffused Lighting Pools */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-orange-500/8 via-transparent to-transparent blur-[160px] rounded-full z-0 opacity-60 dark:opacity-80" />
      <div className="pointer-events-none fixed top-1/2 -left-48 w-[450px] h-[450px] bg-white/[0.02] blur-[160px] rounded-full z-0 opacity-40 dark:opacity-60" />

      {/* Top Header Blur Fade Mask */}
      <div className="fixed top-0 inset-x-0 h-32 sm:h-36 pointer-events-none z-40 bg-gradient-to-b from-background via-background/70 to-transparent backdrop-blur-xl transition-all duration-300 [mask-image:linear-gradient(to_bottom,black_0%,black_35%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_35%,transparent_100%)]" />

      {/* =========================================================================
          ANIMATION STAGE 1: GREETING ("Hey [Name]" + "Welcome to the studio")
          ========================================================================= */}
      {stage === "greeting" && (
        <section className="min-h-screen flex flex-col items-center justify-center pb-16 sm:pb-24 px-6 relative z-30 select-none">
          <div className="text-center max-w-4xl mx-auto space-y-4 -translate-y-6 sm:-translate-y-10">
            {/* 1. Hey "name from the db" */}
            <h1
              className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-[-0.03em] text-foreground transition-all duration-700 ease-out ${
                greetingVisible
                  ? "opacity-100 blur-0 translate-y-0"
                  : "opacity-0 blur-xl translate-y-6"
              }`}
            >
              Hey {userName}
              <span className="text-orange-500">.</span>
            </h1>

            {/* 2. Welcome to the studio (right after and below) */}
            <p
              className={`text-xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-medium text-muted-foreground tracking-tight transition-all duration-700 ease-out ${
                welcomeVisible
                  ? "opacity-100 blur-0 translate-y-0"
                  : "opacity-0 blur-lg translate-y-4"
              }`}
            >
              Welcome to the studio
            </p>
          </div>

          {/* Discreet Skip Button */}
          <button
            type="button"
            onClick={handleSkipIntro}
            className="absolute bottom-10 right-10 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer"
          >
            Skip Intro →
          </button>
        </section>
      )}

      {/* =========================================================================
          ANIMATION STAGE 2: QUESTION ("What are we doing today?")
          ========================================================================= */}
      {stage === "question" && (
        <section className="min-h-screen flex flex-col items-center justify-center pb-16 sm:pb-24 px-6 relative z-30 select-none">
          <div className="text-center max-w-4xl mx-auto -translate-y-6 sm:-translate-y-10">
            <h2
              className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display tracking-[-0.03em] text-foreground transition-all duration-700 ease-out ${
                questionVisible
                  ? "opacity-100 blur-0 translate-y-0"
                  : "opacity-0 blur-xl translate-y-6"
              }`}
            >
              What are we doing today?
            </h2>
          </div>

          <button
            type="button"
            onClick={handleSkipIntro}
            className="absolute bottom-10 right-10 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer"
          >
            Skip Intro →
          </button>
        </section>
      )}

      {/* =========================================================================
          STAGE 3: THE STUDIO REPERTOIRE (ROADMAP MATRIX)
          ========================================================================= */}
      {stage === "repertoire" && (
        <main className="pt-32 sm:pt-36 lg:pt-40 pb-24 max-w-[1420px] 2xl:max-w-[1460px] w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-20 animate-in fade-in duration-700">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border dark:border-white/10 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 mb-2 font-mono text-xs text-orange-600 dark:text-orange-400 font-semibold tracking-wider uppercase">
                <span className="size-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                <span>STUDIO COCKPIT · ACTIVE PORTFOLIO</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-[-0.04em] text-foreground font-display">
                What are we doing today<span className="text-orange-500">?</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl font-mono">
                Select an active trajectory to resume your pedagogical flow state right where you stopped.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/#cockpit">
                <Button
                  variant="orange"
                  size="sm"
                  className="font-mono text-xs uppercase tracking-wider font-bold h-10 px-5 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Deploy New Trajectory</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Roadmaps Grid */}
          {isLoadingData ? (
            <div className="py-24 text-center rounded-2xl bg-card dark:bg-[#121418] border border-border dark:border-white/10 p-12">
              <Loader2 className="size-8 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-xs font-mono text-muted-foreground tracking-wider">
                TELEMETRY SYNC: Querying cognitive roadmaps from Supabase...
              </p>
            </div>
          ) : roadmaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {roadmaps.map((r) => {
                const progress = r.progress_percentage || 0;
                const coverImage = (() => {
                  const arch = (r.domain_archetype || "").toLowerCase();
                  const title = (r.title || "").toLowerCase();
                  if (arch.includes("esport") || title.includes("bgmi") || title.includes("game"))
                    return "/images/track-esports.png";
                  if (arch.includes("system") || title.includes("distributed") || title.includes("consensus"))
                    return "/images/track-distributed.png";
                  if (arch.includes("music") || title.includes("guitar") || title.includes("bach"))
                    return "/images/track-polyphony.png";
                  return "/images/hero-glass-matrix.png";
                })();

                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRoadmap(r.id)}
                    className="cursor-pointer group block w-full h-full text-left"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectRoadmap(r.id);
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
                            <span className="text-[10px] font-mono text-white/90 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md">
                              {r.total_days}d Intensive
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
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

                            {/* "Where You Stopped" Telemetry Banner */}
                            <div className="mt-4 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-mono">
                              <span className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold block mb-0.5">
                                {r.isFullyCompleted ? "STATUS" : "RESUME WHERE YOU STOPPED"}
                              </span>
                              <p className="text-foreground font-semibold truncate">
                                {r.isFullyCompleted
                                  ? "✓ All milestones completed"
                                  : `Day ${r.resumeDayNumber}: ${r.resumeTopicTitle}`}
                              </p>
                            </div>
                          </div>

                          {/* Velocity Progress Bar */}
                          <div className="mt-5 pt-4 border-t border-border dark:border-white/10">
                            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
                              <span>Curriculum Velocity</span>
                              <span className="text-foreground font-bold font-mono">{progress}%</span>
                            </div>
                            <Progress
                              value={progress}
                              indicatorClassName="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500"
                              className="mb-4 h-1.5 bg-muted dark:bg-white/10"
                            />

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {r.completed_topics_count || 0} topics mastered
                              </span>
                              <div className="text-xs font-bold text-foreground group-hover:text-orange-500 flex items-center gap-1 font-mono uppercase tracking-wider">
                                <span>Resume</span>
                                <ArrowRight className="size-3.5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-20 text-center rounded-2xl bg-card dark:bg-[#090b0e] border border-border dark:border-white/10 p-8 max-w-xl mx-auto">
              <div className="size-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                <Layers className="size-6" />
              </div>
              <h2 className="text-xl font-bold font-display text-foreground">
                No active trajectories found
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                Deploy your first deterministic multi-agent syllabus to enter the pedagogical studio.
              </p>
              <div className="mt-6">
                <Link href="/#cockpit">
                  <Button variant="orange" size="sm" className="font-mono text-xs uppercase tracking-wider font-bold h-10 px-5">
                    <Plus className="size-3.5 mr-2 stroke-[2.5]" />
                    <span>Ignite Trajectory</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

