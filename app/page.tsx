"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserRoadmaps, RoadmapSummary } from "@/lib/supabase-roadmap";
import { ArrowRight, Loader2, Plus } from "@/components/ui/icons";
import { PathStop } from "@/components/path";
import { startPath } from "@/components/create-roadmap-dialog";
import { AgentCards } from "@/components/home/agent-cards";
import { StartSentence } from "@/components/home/start-sentence";
import { SamplePlan } from "@/components/home/sample-plan";
import { BeliefDemo } from "@/components/home/belief-demo";
import { PathList } from "@/components/home/path-list";
import { SiteOpeningAnimation } from "@/components/site-opening-animation";
import { SiteFooter } from "@/components/site-footer";
import { useLenis } from "@/components/smooth-scroll";
import { isInternalNavigation, clearInternalNavigationFlag } from "@/lib/navigation-tracker";

export default function LandingPage() {
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

  const scrollToStart = () => {
    const el = document.getElementById("architecture");
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -120, duration: 1.2 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  const hasOwnPaths = roadmaps.some((r) => !r.id.startsWith("demo-"));

  return (
    <main className="relative min-h-screen w-full bg-background text-foreground font-sans overflow-x-hidden">
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
          <div className="absolute inset-0 z-20 flex flex-col justify-between max-w-[1240px] mx-auto px-6 sm:px-10 pt-44 md:pt-44 lg:pt-48 pb-8 sm:pb-10 pointer-events-none">
            {/* Top & Middle Content Group */}
            <div className="max-w-4xl">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-[-0.035em] [word-spacing:0.1em] text-white leading-[0.98] text-balance drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
                Find your way into anything.
              </h1>

              <p className="mt-6 max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-zinc-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                Pick a subject and the time you have. Daari lays out the way, one day at a time, and checks that you
                understood before you move on.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => startPath()}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-orange-500 px-6 text-base font-semibold text-black transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                >
                  <Plus className="size-4 stroke-[2.5]" />
                  Start a path
                </button>
                <a
                  href="#architecture"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToStart();
                  }}
                  className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Centered Bottom Scroll Indicator */}
            <div className="w-full flex items-center justify-center pointer-events-none">
              <a
                href="#architecture"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToStart();
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
          className="relative -mt-px w-full h-[27.5vh] shrink-0 overflow-hidden pointer-events-none select-none [mask-image:linear-gradient(to_bottom,black_0%,rgb(0_0_0/0.86)_20%,rgb(0_0_0/0.58)_45%,rgb(0_0_0/0.26)_70%,rgb(0_0_0/0.07)_88%,transparent_100%)]"
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

        {/* The path: one line from the picture to the end of the page */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-10 pt-12 sm:pt-16 pb-28">
          <section id="architecture" className="relative scroll-mt-32 pl-14 sm:pl-20 pb-24 sm:pb-36">
            <span
              aria-hidden="true"
              className="absolute -top-40 -bottom-4 left-[11px] w-0.5 bg-gradient-to-b from-transparent via-saffron via-30% to-saffron"
            />
            <blockquote className="max-w-4xl font-serif text-3xl italic leading-[1.12] tracking-tight text-foreground text-balance sm:text-5xl md:text-6xl">
              Learning something new is hard enough. Finding the way shouldn’t be.
            </blockquote>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Most courses hand everyone the same outline. Daari works out what fits your time, puts the steps in order, and
              checks that you really understood each one.
            </p>
          </section>

          <PathStop title="Say where you want to get to">
            <p>Any subject, at any pace. Daari works out the steps in between.</p>
            <div className="pt-6">
              <StartSentence />
            </div>
          </PathStop>

          <PathStop id="agents" title="Three agents lay the way" below={<AgentCards />}>
            <p>One plans the days, one fits the topics to your hours, and one teaches and questions you.</p>
          </PathStop>

          <PathStop title="See the whole way first" aside={<SamplePlan />}>
            <p>Your subject becomes days, and each day becomes a few topics that fit the hours you have.</p>
            <p>Nothing is hidden. You can look ahead, skip what you know, or start in the middle.</p>
          </PathStop>

          <PathStop
            kind="branch"
            title="Take one topic at a time"
            aside={
              <figure>
                <blockquote className="font-serif text-2xl italic leading-snug text-foreground sm:text-3xl">
                  To the uninitiated, holding a classical guitar might seem as simple as picking up an object and resting
                  it across one&rsquo;s lap. However, in the classical guitar tradition, posture is not a static pose.
                </blockquote>
                <figcaption className="mt-5 text-sm text-muted-foreground">
                  From a lesson Daari wrote on classical guitar posture.
                </figcaption>
              </figure>
            }
          >
            <p>
              Each topic opens into a full lesson, written for your level and the minutes you set aside, with practice to
              do and places to read further.
            </p>
            <p>Daari can make mistakes, so check anything important.</p>
          </PathStop>

          <PathStop kind="done" title="Prove it to yourself" aside={<BeliefDemo />}>
            <p>
              Reading is not the same as knowing. The Socratic AI writes down what you believe, finds the weakest part, and
              tries to break it.
            </p>
            <p>If your reasoning holds, the topic is done.</p>
          </PathStop>

          <PathStop
            id="portfolio"
            title={hasOwnPaths ? "Your paths" : "Paths you could walk"}
            aside={
              isLoadingRoadmaps ? (
                <p className="flex items-center gap-2.5 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-orange-500" />
                  Loading paths
                </p>
              ) : roadmaps.length > 0 ? (
                <PathList roadmaps={roadmaps} signedIn={Boolean(currentUser)} />
              ) : (
                <p className="py-6 text-base text-muted-foreground">
                  Your paths could not be loaded. Refresh the page to try again.
                </p>
              )
            }
          >
            <p>
              {hasOwnPaths
                ? "Pick up where you stopped. The line shows how far you have come."
                : "These are samples. Open one to look around, or start your own."}
            </p>
          </PathStop>

          <PathStop last title="The first step is small">
            <p>One subject, one day, one topic.</p>
            <button
              type="button"
              onClick={() => startPath()}
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-orange-500 px-7 text-base font-semibold text-black transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 cursor-pointer"
            >
              Start a path
              <ArrowRight className="size-4" />
            </button>
          </PathStop>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
