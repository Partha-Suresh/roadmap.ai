"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getUserRoadmaps,
  getRoadmapById,
  getUserActiveRoadmap,
  RoadmapSummary,
} from "@/lib/supabase-roadmap";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowUpRight, Check, Loader2, Sparkles, Clock, BookOpen } from "@/components/ui/icons";
import {
  ClickSpark,
  AnimatedCounter,
  BlurText,
  TiltedCard,
  FadeContent,
} from "@/components/react-bits";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

interface Topic {
  id: string;
  topic_number: number;
  title: string;
  description: string;
  estimated_minutes: number;
  status: "not_started" | "in_progress" | "completed";
}

interface DayNode {
  id: string;
  day_number: number;
  title: string;
  description: string;
  learning_objectives: string[];
  status: "not_started" | "in_progress" | "completed";
  topics: Topic[];
}

function CurriculumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRoadmapId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [userRoadmaps, setUserRoadmaps] = useState<RoadmapSummary[]>([]);
  const [currentRoadmap, setCurrentRoadmap] = useState<any>(null);
  const [roadmapDays, setRoadmapDays] = useState<DayNode[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function loadCurriculum() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (!user) {
          router.push(`/login?redirectedFrom=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }

        const list = await getUserRoadmaps(user.id);
        if (isMounted) setUserRoadmaps(list);

        let targetRoadmap: any = null;
        if (queryRoadmapId) {
          targetRoadmap = await getRoadmapById(queryRoadmapId);
        } else if (list.length > 0) {
          targetRoadmap = await getRoadmapById(list[0].id);
        } else {
          targetRoadmap = await getUserActiveRoadmap(user.id);
        }

        if (isMounted && targetRoadmap) {
          setCurrentRoadmap(targetRoadmap);
          setRoadmapDays(targetRoadmap.days || []);
          if (targetRoadmap.days && targetRoadmap.days.length > 0) {
            setSelectedDayId(targetRoadmap.days[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading dynamic curriculum:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCurriculum();

    return () => {
      isMounted = false;
    };
  }, [queryRoadmapId]);

  const totalTopics = roadmapDays.reduce((acc, d) => acc + (d.topics?.length || 0), 0);
  const completedTopics = roadmapDays.reduce(
    (acc, d) => acc + (d.topics?.filter((t) => t.status === "completed").length || 0),
    0
  );
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const archetype = (currentRoadmap?.domain_archetype || "").toUpperCase();
  const archetypeVariant = archetype.includes("SOFTWARE") || archetype.includes("DISTRIBUTED")
    ? "cyan"
    : archetype.includes("DATA") || archetype.includes("AI") || archetype.includes("QUANTUM")
    ? "purple"
    : archetype.includes("FINANCE") || archetype.includes("QUANT")
    ? "saffron"
    : archetype.includes("CREATIVE") || archetype.includes("GUITAR")
    ? "amber"
    : "orange";

  return (
    <ClickSpark sparkColor="#f59e0b" sparkCount={8} sparkRadius={25} className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-950 dark:selection:text-orange-100 transition-colors duration-200">
      {/* Background dot grid */}
      <div className="pointer-events-none fixed inset-0 bg-dot-grid opacity-50 dark:opacity-40" />

      {/* Main Container */}
      <main className="pt-24 sm:pt-28 pb-16 max-w-[1150px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Trajectory Switcher (when user has multiple roadmaps) */}
        {userRoadmaps.length > 1 && (
          <div className="mb-6 flex items-center justify-between gap-4">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Active Trajectory:
            </span>
            <CustomDropdown<string>
              value={currentRoadmap?.id || ""}
              onChange={(val) => router.push(`/curriculum?id=${val}`)}
              accentColor="orange"
              triggerClassName="rounded-xl px-4 py-2 text-xs"
              options={userRoadmaps.map((r) => ({
                value: r.id,
                label: r.title,
                sublabel: `${r.total_days} Days · ${r.daily_hours_commitment}h/day`,
              }))}
            />
          </div>
        )}

        {loading ? (
          <div className="py-32 text-center">
            <Loader2 className="size-8 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-xs font-mono text-muted-foreground">Constructing dynamic spatial DAG tree...</p>
          </div>
        ) : (
          <>
            {/* Top Trajectory Summary Card */}
            <Card className="p-6 idle-card idle-inner-bevel mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={archetypeVariant}>
                    {currentRoadmap?.domain_archetype?.replace("_", " ") || "SPECIALIZED DISCIPLINE"}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    {currentRoadmap?.total_days || 7} Days Intensive
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {currentRoadmap?.daily_hours_commitment || 2} hrs/day
                  </span>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                  <BlurText text={currentRoadmap?.title || "Autonomous Learning Trajectory"} delay={30} />
                </CardTitle>
                <CardDescription className="text-xs font-mono text-muted-foreground mt-1">
                  Agent 1 Chronological Day Decomposer · Agent 2 Minute-Budgeted Topics
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                    Mastery Completion
                  </span>
                  <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    <AnimatedCounter value={progressPercent} suffix="%" duration={1000} />{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({completedTopics}/{totalTopics})
                    </span>
                  </div>
                </div>
                <div className="w-36">
                  <Progress
                    value={progressPercent}
                    indicatorClassName="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500"
                    className="h-2"
                  />
                </div>
              </div>
            </Card>

            {/* Status Subheader */}
            <div className="flex items-center justify-between px-2 mb-6">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                Interactive Learning Graph
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>{roadmapDays.length} Temporal Stages Active</span>
              </span>
            </div>

            {/* Spatial Tree Container */}
            <div className="space-y-6">
              {roadmapDays.map((day, dayIdx) => {
                const isSelected = selectedDayId === day.id;
                const isCompleted = day.status === "completed";
                const isInProgress = day.status === "in_progress" || isSelected;

                return (
                  <TiltedCard
                    key={day.id}
                    maxAngle={4}
                    scale={1.01}
                    showGlare={true}
                    className="w-full"
                  >
                    <Card
                      className={`idle-card p-6 sm:p-7 transition-all duration-300 w-full ${
                        isSelected ? "ring-2 ring-orange-500/50 shadow-md" : "hover:border-foreground/20"
                      }`}
                    >
                      <div
                        onClick={() => setSelectedDayId(isSelected ? null : day.id)}
                        className="flex items-start justify-between cursor-pointer gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-base sm:text-lg font-bold text-foreground">
                                Day {day.day_number}: {day.title}
                              </h2>
                              {isCompleted && (
                                <Badge variant="emerald" className="text-[10px] py-0 px-2">
                                  COMPLETED
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                              {day.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block">
                            {day.topics?.length || 0} Subtopics
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {isSelected ? "Collapse ▲" : "Expand ▼"}
                          </Button>
                        </div>
                      </div>

                      {/* Subtopics Grid wrapped in FadeContent */}
                      {isSelected && day.topics && (
                        <FadeContent blur={true} duration={400} className="mt-6 pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                          {day.topics.map((t) => {
                            const topicDone = t.status === "completed";
                            const topicInProgress = t.status === "in_progress";

                            return (
                              <div
                                key={t.id}
                                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                                  topicDone
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : topicInProgress
                                    ? "bg-orange-500/5 border-orange-500/30 ring-1 ring-orange-500/20"
                                    : "bg-card/60 border-border hover:border-foreground/30"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-2">
                                    <span className="text-orange-600 dark:text-orange-400 font-bold">
                                      Topic {t.topic_number}
                                    </span>
                                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                      <Clock className="size-3" />
                                      {t.estimated_minutes}m
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-foreground line-clamp-2">
                                    {t.title}
                                  </h4>
                                </div>

                                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                                  <span
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                      topicDone
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : topicInProgress
                                        ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 animate-pulse"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {t.status.replace("_", " ")}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/classroom/${t.id}`}
                                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                                      title="Socratic Classroom"
                                    >
                                      Classroom →
                                    </Link>
                                    <Link
                                      href={`/workspace?id=${currentRoadmap.id}&day=${day.id}&topic=${t.id}`}
                                      className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                                    >
                                      Notes →
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </FadeContent>
                      )}
                    </Card>
                  </TiltedCard>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs font-mono text-muted-foreground">
        ROADMAP.AI SPATIAL GRAPH ENGINE · MULTI-TENANT CONVICTION
      </footer>
    </ClickSpark>
  );
}

export default function CurriculumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground font-mono text-xs">
          Loading spatial curriculum...
        </div>
      }
    >
      <CurriculumContent />
    </Suspense>
  );
}
