"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowUpRight, Plus } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { usePageTransition } from "@/components/page-transition";
import { useLenis } from "@/components/smooth-scroll";

export interface NavbarProps {
  currentUser?: any;
  onOpenDeployModal?: () => void;
  onSignOut?: () => void;
}

export function Navbar({
  currentUser: propsUser,
  onOpenDeployModal,
  onSignOut,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { transitionTo } = usePageTransition();
  const lenis = useLenis();
  const supabase = createClient();
  const [internalUser, setInternalUser] = useState<any>(propsUser ?? null);

  const handleBrandClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (window.location.hash) {
        window.history.pushState(null, "", "/");
      }
    } else {
      e.preventDefault();
      transitionTo("/");
    }
  };

  const handleCurriculaClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      const portfolio = document.getElementById("portfolio");
      if (portfolio) {
        if (lenis) {
          lenis.scrollTo(portfolio, { offset: -60, duration: 1.2 });
        } else {
          portfolio.scrollIntoView({ behavior: "smooth" });
        }
        window.history.pushState(null, "", "/#portfolio");
      }
    } else {
      e.preventDefault();
      transitionTo("/#portfolio");
    }
  };

  const handleStudioClick = (e: React.MouseEvent) => {
    if (pathname === "/studio") {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.0 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      e.preventDefault();
      transitionTo("/studio");
    }
  };

  // Self-contained auth detection if currentUser is not passed explicitly
  useEffect(() => {
    if (propsUser !== undefined) {
      setInternalUser(propsUser);
      return;
    }

    let isMounted = true;
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) setInternalUser(user);
      } catch {
        // non-fatal
      }
    }
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setInternalUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [propsUser, supabase]);

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
      return;
    }
    try {
      await supabase.auth.signOut();
      setInternalUser(null);
      transitionTo("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleDeployClick = () => {
    if (onOpenDeployModal) {
      onOpenDeployModal();
      return;
    }
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("open-deploy-modal"));
      const cockpit = document.getElementById("cockpit");
      if (cockpit) {
        cockpit.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    transitionTo("/#cockpit");
  };

  if (pathname?.startsWith("/classroom")) {
    return null;
  }

  const navItems = [
    { label: "Curricula", href: "/#portfolio" },
    { label: "Quota", href: "/billing" },
  ];

  return (
    <>
      {/* Left Wing: Vertical formation sticking to the left (No horizontal dividing line) */}
      <nav
        aria-label="Primary Navigation"
        className="fixed top-5 left-5 sm:top-6 sm:left-8 z-50 flex flex-col items-start gap-1.5 font-mono text-xs select-none pointer-events-auto"
      >
        {/* Brandmark */}
        <Link
          href="/"
          onClick={handleBrandClick}
          className="inline-flex items-center justify-center h-8.5 px-3.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-950 dark:border-white shadow-sm hover:opacity-90 transition-all mb-0.5 select-none cursor-pointer"
        >
          <span className="text-sm font-black tracking-[-0.03em] font-display uppercase leading-none text-center">
            ROADMAP<span className="text-orange-500 dark:text-orange-600 font-extrabold">.AI</span>
          </span>
        </Link>

        {/* Small Navigation Buttons Listed in Vertical Formation */}
        <div className="flex flex-col items-start gap-1 font-body">
          <Link
            href="/#portfolio"
            onClick={handleCurriculaClick}
            className="px-2.5 py-1 rounded-md bg-transparent hover:bg-foreground hover:text-background text-muted-foreground hover:text-background text-xs uppercase tracking-wider font-medium leading-tight transition-all cursor-pointer"
          >
            Curricula
          </Link>

          <Link
            href="/billing"
            className="px-2.5 py-1 rounded-md bg-transparent hover:bg-foreground hover:text-background text-muted-foreground hover:text-background text-xs uppercase tracking-wider font-medium leading-tight transition-all cursor-pointer"
          >
            Quota
          </Link>

          <button
            type="button"
            onClick={handleDeployClick}
            className="px-2.5 py-1 rounded-md bg-orange-500/15 hover:bg-orange-500 text-orange-600 dark:text-orange-400 hover:text-black text-xs uppercase tracking-wider font-bold leading-tight transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer font-body"
          >
            <Plus className="size-3 stroke-[2.5]" />
            <span>Deploy</span>
          </button>
        </div>
      </nav>

      {/* Right Wing: Vertical formation sticking to the right (Identical structure to Left Wing) */}
      <nav
        aria-label="User Actions"
        className="fixed top-5 right-5 sm:top-6 sm:right-8 z-50 flex flex-col items-end gap-1.5 font-mono text-xs select-none pointer-events-auto"
      >
        {/* Studio Pill */}
        <Link
          href="/studio"
          onClick={handleStudioClick}
          className="inline-flex items-center justify-center gap-1.5 h-8.5 pl-2.5 pr-3 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-950 dark:border-white shadow-sm hover:opacity-90 transition-all mb-0.5 group select-none cursor-pointer"
        >
          <ArrowUpRight className="size-3.5 text-orange-500 dark:text-orange-600 shrink-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-sm font-black tracking-[-0.03em] font-display uppercase leading-none text-center">
            STUDIO
          </span>
        </Link>

        {/* Small Navigation Buttons Listed in Vertical Formation */}
        <div className="flex flex-col items-end gap-1 font-body">
          {internalUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-2.5 py-1 rounded-md bg-transparent hover:bg-red-600 hover:text-white text-muted-foreground text-xs uppercase tracking-wider font-medium leading-tight transition-all cursor-pointer"
              title="Sign out of account"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="px-2.5 py-1 rounded-md bg-transparent hover:bg-foreground hover:text-background text-muted-foreground text-xs uppercase tracking-wider font-medium leading-tight transition-all flex items-center"
            >
              Sign In
            </Link>
          )}

          <ThemeToggle variant="pill" />
        </div>
      </nav>
    </>
  );
}

export { Navbar as KotoNavbar };
export default Navbar;
