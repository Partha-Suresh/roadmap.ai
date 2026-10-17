"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getTopicByIdFromSupabase,
  updateTopicStatusInSupabase,
  getOrSaveLessonFromSupabase,
  consumeTokensInDb,
} from "@/lib/supabase-roadmap";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Loader2, Clock } from "@/components/ui/icons";
import { MasterclassViewer } from "@/components/masterclass-viewer";
import {
  ClickSpark,
  BlurText,
  FadeContent,
  Dock,
  DockItem,
} from "@/components/react-bits";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  agent: string;
  content: string;
  timestamp: string;
}

function ClassroomContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = params?.id as string;

  const [loadingTopic, setLoadingTopic] = useState(true);
  const [topicData, setTopicData] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streakCount, setStreakCount] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function initClassroom() {
      if (!topicId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) {
        router.push(`/login?redirectedFrom=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const queryTitle = searchParams?.get("title") || "";
      const queryDomain = searchParams?.get("domain") || "";
      const queryDesc = searchParams?.get("desc") || "";
      const queryDay = Number(searchParams?.get("day")) || 1;
      const queryMinutes = Number(searchParams?.get("minutes")) || 30;

      try {
        let topic = await getTopicByIdFromSupabase(topicId);

        if (!topic) {
          // If topic ID was not in DB, use query params or dynamic context
          const title = queryTitle || "First-Principles Conceptual Inquiry";
          const domain = queryDomain || "General Knowledge";
          topic = {
            id: topicId,
            title: title,
            description: queryDesc || `Deconstruct the governing mechanisms and invariants of ${title}.`,
            estimated_minutes: queryMinutes,
            status: "in_progress",
            roadmap_days: {
              day_number: queryDay,
              title: `${title} Foundations`,
              roadmaps: {
                title: `${domain} Intensive`,
                domain: domain,
              },
            },
          };
        }

        if (isMounted) {
          setTopicData(topic);
          setIsCompleted(topic.status === "completed");

          const domain = topic.roadmap_days?.roadmaps?.domain || queryDomain || "General Knowledge";

          // Fetch opening Socratic question dynamically from live API
          let initialQuestionContent =
            `Welcome to the Socratic Masterclass on **${topic.title}** in **${domain}**.\n\n` +
            `**First-Principles Inquiry:** In your own words, what is the core invariant or governing mechanism that ensures predictable outcomes in **${topic.title}**? ` +
            `What observable failure signature emerges if this invariant is violated under stress?\n\n` +
            `*Formulate your explanation from first principles.*`;

          try {
            const initRes = await fetch("/api/socratic", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topicTitle: topic.title,
                domain: domain,
                topicDescription: topic.description,
                action: "initial_question",
              }),
            });

            if (initRes.ok) {
              const initData = await initRes.json();
              if (initData.reply) {
                initialQuestionContent = initData.reply;
              }
            }
          } catch (e) {
            console.warn("Dynamic Socratic intro notice:", e);
          }

          const initialQuestion: ChatMessage = {
            id: "msg-0",
            role: "assistant",
            agent: "Agent 3 · Socratic Evaluator",
            content: initialQuestionContent,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages([initialQuestion]);
          setLoadingTopic(false);
        }
      } catch (err) {
        console.error("Failed to load classroom topic:", err);
        if (isMounted) setLoadingTopic(false);
      }
    }

    initClassroom();

    return () => {
      isMounted = false;
    };
  }, [topicId, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isEvaluating]);

  const handleSubmitResponse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isEvaluating) return;

    const userText = userInput.trim();
    setUserInput("");

    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      agent: "Learner Response",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setIsEvaluating(true);

    try {
      const domain = topicData?.roadmap_days?.roadmaps?.domain || searchParams?.get("domain") || "General Knowledge";
      const historyPayload = updatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/socratic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: topicData?.title,
          domain: domain,
          topicDescription: topicData?.description,
          userMessage: userText,
          conversationHistory: historyPayload,
          action: "evaluate",
        }),
      });

      let aiFeedback = "";
      let isPassed = false;

      if (res.ok) {
        const data = await res.json();
        aiFeedback = data.reply || "Evaluation completed.";
        isPassed = Boolean(data.is_passed);
      } else {
        aiFeedback =
          `**Diagnostic Feedback:**\n\n` +
          `Your response was recorded. Consider detailing the specific state boundaries and constraints governing **${topicData?.title}**.\n\n` +
          `**Follow-up Inquiry:** What mechanisms detect variance or deviation during live execution?`;
      }

      if (isPassed) {
        setStreakCount((prev) => prev + 1);
        if (!isCompleted) {
          setIsCompleted(true);
          try {
            await updateTopicStatusInSupabase(topicId, "completed");
          } catch {}
        }
      }

      // Record token consumption non-blockingly
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await consumeTokensInDb(user?.id, 650, "Agent 3: Socratic Evaluator", {
          promptTokens: 250,
          completionTokens: 400,
        });
      } catch {}

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        agent: "Agent 3 · Socratic Evaluator",
        content: aiFeedback,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsEvaluating(false);
    } catch (err) {
      console.error("Socratic evaluation error:", err);
      setIsEvaluating(false);
    }
  };

  const handleRequestHint = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);

    try {
      const domain = topicData?.roadmap_days?.roadmaps?.domain || searchParams?.get("domain") || "General Knowledge";
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/socratic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle: topicData?.title,
          domain: domain,
          topicDescription: topicData?.description,
          conversationHistory: historyPayload,
          action: "hint",
        }),
      });

      let hintText = "";
      if (res.ok) {
        const data = await res.json();
        hintText = data.reply;
      } else {
        hintText = `💡 **First-Principles Hint for ${topicData?.title}:** Focus on the initial preconditions that must hold true before execution begins. What invariant ensures predictability?`;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        await consumeTokensInDb(user?.id, 250, "Agent 3: Socratic Hint", {
          promptTokens: 100,
          completionTokens: 150,
        });
      } catch {}

      const hintMsg: ChatMessage = {
        id: `hint-${Date.now()}`,
        role: "assistant",
        agent: "Agent 3 · First-Principles Hint",
        content: hintText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, hintMsg]);
      setIsEvaluating(false);
    } catch (err) {
      console.error("Hint request error:", err);
      setIsEvaluating(false);
    }
  };

  return (
    <ClickSpark sparkColor="#f43f5e" sparkCount={8} sparkRadius={25} className="min-h-screen bg-background text-foreground flex flex-col justify-between font-sans selection:bg-orange-500/30 selection:text-orange-950 dark:selection:text-orange-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              ← Exit Classroom
            </button>
            <span className="text-border">|</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
                <span className="text-xs font-bold font-mono tracking-tight text-foreground truncate max-w-[240px] sm:max-w-md">
                  {loadingTopic ? (
                    "Loading Topic..."
                  ) : (
                    <BlurText text={topicData?.title || ""} delay={20} />
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* React Bits Floating Dock */}
            <Dock className="hidden sm:inline-flex py-1 px-2">
              <DockItem onClick={handleRequestHint} tooltip="Request Socratic Hint">
                <span className="text-sm">💡</span>
              </DockItem>
              <DockItem
                onClick={() => router.push(`/curriculum${topicData?.roadmap_days?.roadmaps?.id ? `?id=${topicData.roadmap_days.roadmaps.id}` : ""}`)}
                tooltip="Spatial Curriculum"
              >
                <span className="text-sm">📚</span>
              </DockItem>
              <DockItem
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                tooltip="Scroll to Top"
              >
                <span className="text-sm">⬆️</span>
              </DockItem>
            </Dock>

            {isCompleted ? (
              <Badge variant="emerald" className="hidden sm:inline-flex text-[11px] gap-1">
                <Check className="size-3" />
                <span>TOPIC MASTERED</span>
              </Badge>
            ) : (
              <Badge variant="orange" className="hidden sm:inline-flex text-[11px]">
                EVALUATION IN PROGRESS
              </Badge>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Classroom Discussion Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-24 pb-32 flex flex-col justify-between">
        {loadingTopic ? (
          <div className="py-32 text-center">
            <Loader2 className="size-8 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-xs font-mono text-muted-foreground">Initializing Socratic reasoning environment...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Topic Context Card */}
            <Card className="idle-card p-4 sm:p-5 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold block">
                  {topicData?.roadmap_days?.roadmaps?.title || "Curriculum Track"} • Day {topicData?.roadmap_days?.day_number || 1}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                  {topicData?.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="cyan" className="font-mono text-[10px]">
                  <Clock className="size-3 mr-1" />
                  {topicData?.estimated_minutes || 30}m
                </Badge>
                {streakCount > 1 && (
                  <Badge variant="amber" className="font-mono text-[10px]">
                    🔥 {streakCount} Streak
                  </Badge>
                )}
              </div>
            </Card>

            {/* Conversation Log wrapped in FadeContent */}
            <div className="space-y-5">
              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                return (
                  <FadeContent
                    key={m.id}
                    blur={true}
                    duration={350}
                    className={`flex gap-3.5 ${isAssistant ? "justify-start" : "justify-end"}`}
                  >
                    {isAssistant && (
                      <div className="size-8 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs font-mono">
                        AI
                      </div>
                    )}

                    <div
                      className={`max-w-2xl p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? "idle-card idle-inner-bevel border-border text-foreground"
                          : "bg-orange-500 text-white shadow-md font-medium"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-border/40">
                        <span className={`text-[10px] font-mono uppercase font-semibold ${isAssistant ? "text-orange-600 dark:text-orange-400" : "text-white/80"}`}>
                          {m.agent}
                        </span>
                        <span className={`text-[10px] font-mono ${isAssistant ? "text-muted-foreground" : "text-white/60"}`}>
                          {m.timestamp}
                        </span>
                      </div>

                      {isAssistant ? (
                        <div className="space-y-2">
                          <MasterclassViewer markdown={m.content} />
                        </div>
                      ) : (
                        <div className="whitespace-pre-line font-sans space-y-2">
                          {m.content}
                        </div>
                      )}
                    </div>
                  </FadeContent>
                );
              })}

              {isEvaluating && (
                <div className="flex items-center gap-2.5 text-xs text-orange-600 dark:text-orange-400 font-mono py-2 animate-pulse">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Agent 3 analyzing reasoning invariants...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Input Bar */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Respond from first principles
            </span>
            <button
              onClick={handleRequestHint}
              disabled={isEvaluating}
              className="text-[11px] font-mono text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>💡 Request Hint</span>
            </button>
          </div>

          <form onSubmit={handleSubmitResponse} className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="State your answer, invariant analysis, or mechanical trade-off..."
              disabled={isEvaluating}
              className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-orange-500 transition shadow-inner font-sans"
            />

            <Button
              type="submit"
              variant="orange"
              disabled={isEvaluating || !userInput.trim()}
              className="px-6 flex items-center gap-1.5 shrink-0"
            >
              <span>Submit</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </form>
        </div>
      </footer>
    </ClickSpark>
  );
}

export default function ClassroomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="size-8 text-orange-500 animate-spin" />
        </div>
      }
    >
      <ClassroomContent />
    </Suspense>
  );
}
