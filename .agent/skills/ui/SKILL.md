---
name: apexkrish-ui-engineering
description: Complete UI/UX design system, component architecture, styling tokens, and frontend engineering rules for ApexKrish Capital. Activate this skill whenever creating, modifying, or refactoring user interfaces, components, styling, animations, or layouts for this website.
---

# ApexKrish Capital — Frontend & UI Engineering Skill

This skill governs all user interface development, component styling, layout architecture, and visual design standards for **ApexKrish Capital** (`apexkrishcapital.com`), an institutional-grade private equity syndication platform connecting accredited investors with Special Purpose Vehicle (SPV) allocations into tier-one frontier technology companies.

---

## 1. UI Tech Stack & Core Dependencies

| Layer | Library / Tool | Implementation Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Client & Server Components (`'use client'` for interactive UI), React 19. |
| **CSS Engine** | Tailwind CSS v4 | `@import "tailwindcss";`, `@import "tw-animate-css";`, `@theme inline { ... }`. |
| **Component Primitives** | Radix UI (`radix-ui`) / Shadcn | Accessible headless primitives styled with Tailwind and `class-variance-authority` (CVA). |
| **Utility** | `clsx` + `tailwind-merge` | Centralized `cn(...)` utility in `@/lib/utils`. |
| **Icons** | Lucide React (`lucide-react`) | Geometric, high-contrast UI iconography (`size-4`, `w-4 h-4`, `stroke-width: 1.75–2`). |
| **Auth UI** | Clerk (`@clerk/nextjs`, `@clerk/ui`) | Customized with neobrutalism theme and brand localization. |
| **Typography** | `next/font/google` | Inter (body text), Geist Sans (headlines), Geist Mono (financial data). |

---

## 2. The Anti-Slop Architectural Standard

All frontend design decisions on this platform strictly follow the **Clean Minimalist Institutional Standard**:

- **No Generic AI Slop:** Do NOT use multi-color neon gradients (purple/pink blurs), oversized generic floating cards, or bubbly cartoon illustrations.
- **Institutional Authority:** Visuals must evoke top-tier private equity and modern fintech (resembling Linear, Ramp, Mercury, and Stripe).
- **High Data Density with Generous Breathing Room:** Data metrics must be legible, organized in structured grids, and spaced cleanly with consistent padding.
- **Subtle Surface Depth:** Use 0.5px hairline borders, soft inner bevels, and multi-layered translucent glassmorphism instead of heavy drop shadows.
- **Accurate Financial Vocabulary:** Standard deal minimums are **$5,000 USD**; vehicle terms feature **10% performance carry** and **2% minimum management fees**; compliance is strictly **SEC Rule 506(c)**.

---

## 3. Design Tokens & Styling Foundations

### 3.1 Color Palette (OKLCH Color Space)

The site utilizes OKLCH color tokens defined in `app/globals.css`. Always use semantic Tailwind color classes (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.) instead of hardcoded hex values.

```css
/* Light Mode Foundation (Platinum Slate & Obsidian Ink) */
--background: oklch(0.960 0.003 250);       /* Soft platinum slate surface */
--foreground: oklch(0.16 0.006 250);        /* Deep obsidian black */
--card: oklch(1 0 0);                       /* Pure white card surface */
--card-foreground: oklch(0.16 0.006 250);
--popover: oklch(0.985 0.002 250);
--muted: oklch(0.925 0.004 250);
--muted-foreground: oklch(0.46 0.006 250);
--border: oklch(0.895 0.005 250);
--radius: 0.625rem;                         /* 10px base border-radius */

/* Dark Mode Foundation (Obsidian & High-Contrast Slate) */
--background: oklch(0.145 0 0);             /* Deep dark background */
--foreground: oklch(0.985 0 0);             /* Pure crisp white */
--card: oklch(0.205 0 0);                   /* Elevated obsidian surface */
--card-foreground: oklch(0.985 0 0);
--popover: oklch(0.205 0 0);
--muted: oklch(0.269 0 0);
--muted-foreground: oklch(0.708 0 0);
--border: oklch(1 0 0 / 10%);               /* 10% translucent white hairline */
```

### 3.2 Semantic Multi-Color Palette

The platform uses a sophisticated multi-color palette anchored by energetic saffron & flame orange, combined with rich secondary semantic accents:

- **Saffron & Flame Orange (Primary Hero & High-Conviction Actions):**
  - Primary call-to-actions, active selection rings, active topic markers, brand mark accents.
  - Tailwind: `text-orange-600 dark:text-orange-400`, `bg-orange-500`, `shadow-[0_4px_22px_rgba(249,115,22,0.4)]`, `border-orange-500/30`.
- **Amber Gold (Curriculum Days, Daily Time & Milestones):**
  - Daily hour allocations, code language tags, milestone stats.
  - Tailwind: `text-amber-600 dark:text-amber-400`, `bg-amber-500/10`, `border-amber-500/20`.
- **Emerald & Jade (Deterministic Verification & Completion):**
  - Completed topics, 100% pedagogical guarantees, verified status.
  - Tailwind: `text-emerald-600 dark:text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/20`.
- **Cyan & Electric Sky (Systems Architecture & Technical Telemetry):**
  - Distributed systems tracks, academic citation tags, terminal metrics.
  - Tailwind: `text-cyan-600 dark:text-cyan-400`, `bg-cyan-500/10`, `border-cyan-500/20`.
- **Coral & Rose (Capstone Drills & Advanced Challenges):**
  - Socratic evaluations, high-intensity capstone drills, difficulty badges.
  - Tailwind: `text-rose-600 dark:text-rose-400`, `bg-rose-500/10`, `border-rose-500/20`.
- **Amethyst & Royal Purple (AI Agents & Frontier Solvers):**
  - Quantum mechanics tracks, agentic reasoning indicators, learning platform badges.
  - Tailwind: `text-purple-600 dark:text-purple-400`, `bg-purple-500/10`, `border-purple-500/20`.

### 3.3 Bespoke CSS Classes & Glassmorphism

Defined in `app/globals.css`:

```css
/* Glassmorphism with Specular Borders */
.idle-glass {
  background: rgba(245, 245, 248, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 0.5px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0px 10px 40px -10px rgba(10, 10, 10, 0.08);
}
.dark .idle-glass {
  background: rgba(18, 18, 20, 0.75);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0px 16px 40px -10px rgba(0, 0, 0, 0.4);
}

/* Institutional Card Surfaces */
.idle-card {
  background: var(--card);
  color: var(--card-foreground);
  border: 0.5px solid var(--border);
  box-shadow: 0px 10px 40px -10px rgba(10, 10, 10, 0.06);
  border-radius: 24px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.idle-card:hover {
  transform: translateY(-2px);
  box-shadow: 0px 16px 45px -10px rgba(10, 10, 10, 0.1);
}

/* Specular Inset Rim Highlight */
.idle-inner-bevel {
  box-shadow: inset 0px 0px 14px 0px rgba(255, 255, 255, 0.8);
}
.dark .idle-inner-bevel {
  box-shadow: inset 0px 0px 14px 0px rgba(255, 255, 255, 0.06);
}
```

### 3.4 Typography Hierarchy

- **Primary Headings (`h1`, `h2`):** `font-bold tracking-[-0.03em] text-foreground`.
- **Display Metrics & Numbers:** `font-mono tracking-tight` (used for valuations, check sizes, caps).
- **Section Badges & Eyebrows:**
  ```tsx
  <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
    APEX KRISH CAPITAL · SEC 506(c)
  </span>
  ```
- **Body & Explanatory Copy:** `text-base text-muted-foreground leading-relaxed font-normal`.

---

## 4. Component Architecture & UI File Map

```
apexkrishcapital/
├── app/
│   ├── layout.tsx                     # Root layout, theme script, Clerk provider, fonts
│   ├── page.tsx                       # Public landing page (Hero, Offerings, Focus Sectors, Fiduciary)
│   ├── about/page.tsx                 # About Us & Investment Thesis
│   ├── profile/page.tsx               # Investor Profile & Accreditation form route
│   ├── admin/page.tsx                 # Operations Command Center route
│   ├── investor-education/page.tsx    # SEC 506(c) Knowledge Base & SPV Guide
│   └── globals.css                    # CSS variables, animations, glassmorphism utilities
├── components/
│   ├── navbar.tsx                     # Scroll-adaptive floating liquid glass navbar
│   ├── HeroSection.tsx                # Hero section with animated status pill and dual CTAs
│   ├── OfferingsSection.tsx           # Dynamic live deal room switcher, commit panel, past deals grid
│   ├── BusinessApplicationSection.tsx # For Founders expandable modal portal
│   ├── RequestAccessModal.tsx         # Request Allocation Access expandable modal portal
│   ├── ProfileComponent.tsx           # Accreditation self-certification form with edge tooltips
│   ├── AdminPage.tsx                  # 4-column deal command center & separated commitments tables
│   ├── dark-mode-toggle.tsx           # Sun/Moon/System dropdown toggle
│   ├── avatarbutton.tsx               # Clerk UserButton wrapper & user menu
│   ├── ScrollRestorationManager.tsx   # Window scroll coordinator
│   └── ui/                            # Shadcn UI primitives: button, card, select, dropdown-menu, expandable-screen, avatar
```

---

## 5. Key UI Component Implementation Standards

### 5.1 Floating Liquid Glass Navbar (`components/navbar.tsx`)

The navbar floats above page content with dynamic scroll-adaptive elevation:
- **Unscrolled (`scrollY <= 30`):** `top-6 md:top-8`, `max-w-[1300px]`, `py-2.5 px-6`, subtle border.
- **Scrolled (`scrollY > 30`):** `top-2.5 md:top-3.5`, `max-w-[1180px]`, `py-1.5 px-4 md:px-5`, higher blur, rim reflection, deeper shadow.
- **Persona Switcher:** Pill toggle switching between `investors` and `founders`.
- **CTA:** `Request Access` pill button triggering the expandable modal.
- **Specular Reflection:**
  ```tsx
  <div className="pointer-events-none absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/40 to-transparent" />
  ```

### 5.2 Expandable Screen Modal System (`components/ui/expandable-screen.tsx`)

Modals on ApexKrish do not use jarring standard popup dialogs; they use the `ExpandableScreen` architecture with morphing fullscreen presentation and event dispatchers:

```tsx
// Opening a modal programmatically from any component:
window.dispatchEvent(
  new CustomEvent("open-expandable-screen", {
    detail: { layoutId: "request-access-portal" }, // or "founder-raise-portal"
  })
);

// Closing a modal programmatically:
window.dispatchEvent(
  new CustomEvent("close-expandable-screen", {
    detail: { layoutId: "request-access-portal" },
  })
);
```

#### Scroll Lock Guard
When Radix UI opens selects inside modals, it locks document scrolling. To prevent layout jerking, `globals.css` enforces:
```css
body[data-scroll-locked]:has([data-slot="select-content"]) {
  overflow-y: scroll !important;
  margin-right: 0 !important;
  padding-right: 0 !important;
}
```

### 5.3 Live Deal Room & Commitment Panel (`components/OfferingsSection.tsx`)

The deal room is the highest-conversion UI surface:
- **Active Deal Switcher:** Horizontal list of live SPVs (e.g., Micro1 Inc.) with round badges (`Active SPV Allocation`, `Direct Equity SPV`).
- **Interactive Check Selector:** Quick-fill preset buttons for verified investors:
  - `$5,000` (Minimum check entry)
  - `$10,000`
  - `$25,000`
  - `$50,000`
  - Custom numeric input with formatting (`minCheckNum: 5000`).
- **Verification Status Banners:** If an investor is unverified, show a clean, high-contrast banner with direct contact links (`syndicate@apexkrishcapital.com` and `720-845-6839`).
- **Admin In-Place Controls:** For `role === 'admin'`, live cards display quick-action buttons for **Broadcast**, **Close Deal**, and **Delete Deal**.
- **Past Offerings Grid:** 3-column responsive grid displaying closed vehicles (Valuation, Check Size, Closed Month/Year badge like `Jul 2026`).

### 5.4 Edge-Aware Accreditation Tooltips (`components/ProfileComponent.tsx`)

When displaying SEC investor status options (`Accredited investor(1M+)`, `Qualified client(2M+)`, `Qualified purchaser(5M+)`), use portal-rendered tooltips that dynamically calculate viewport bounds to prevent clipping:
- Checks `rect.left - margin - dialogWidth >= 0` for left-placement.
- Falls back to right-side or bottom-docked placement on smaller viewports (`< 640px`).
- Automatically dismisses on window scroll or resize.

### 5.5 Multi-Opportunity Administrative Command Center (`components/AdminPage.tsx`)

- **4-Column Responsive Grid:** Live metrics for total allocation cap, wired funds, commitment progress bars, and investor count.
- **Separated Commitments Tables:**
  - **Active Commitments Table:** Live checks with inline status dropdown (`Active`, `Wire Received`, `Allocated`, `Cancelled`).
  - **Closed Deals Archive Table:** Historical records tagged with date of deal closure.
- **Filter Bar:** Search query input, sector filter, status filter, and pitch deck availability toggle.
- **CSV Export:** Context-aware export generating downloadable reports formatted for operations.

---

## 6. Buttons, Inputs & Micro-Interactions

### 6.1 Button Variants (`components/ui/button.tsx`)

- **Primary Action (High-Conversion Pill):**
  ```tsx
  <Button className="h-11 px-6 rounded-full font-bold text-xs tracking-wider uppercase bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer shadow-xs active:scale-95">
    Commit Capital
  </Button>
  ```
- **Secondary / Ghost Pill:**
  ```tsx
  <Button variant="outline" className="h-11 px-6 rounded-full font-semibold text-xs tracking-wider uppercase border-border hover:bg-muted transition-all cursor-pointer">
    Express Interest
  </Button>
  ```
- **Icon / Micro Button:**
  ```tsx
  <Button size="icon" variant="ghost" className="size-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
    <ArrowUpRight className="size-4" />
  </Button>
  ```

### 6.2 Form Inputs & Selects

- Use `components/ui/select.tsx` with Radix primitives.
- Input fields should have rounded-xl or rounded-lg styling with hairline borders:
  ```tsx
  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
  ```
- Error states must display inline with `AlertCircle` and `text-xs text-destructive`.

### 6.3 Loading & Async Feedback

- Always disable triggers during pending network states.
- Render Lucide's `Loader2 className="size-4 animate-spin"` next to descriptive text:
  ```tsx
  {isSubmitting ? (
    <>
      <Loader2 className="size-4 animate-spin" />
      <span>Securing Allocation...</span>
    </>
  ) : (
    <span>Confirm Commitment</span>
  )}
  ```

---

## 7. Strict UI Rules for AI Agents

1. **Never break dark mode:** Every new element, card, or modal must be tested in both light (`html`) and dark (`html.dark`) modes.
2. **Never change standard financial figures:**
   - Minimum check size is **$5,000 USD** (not $10K, not $25K, not $50K).
   - Syndicate carry is **10% performance carry** (half of industry 20%).
   - Management fee is **2% minimum**.
   - Founder raise target is **$200K and above** with **30-day close**.
3. **Preserve the brand logo:** Always use `/apexkrishnalogo.png` with appropriate aspect ratio and never replace it with generic font placeholders.
4. **Preserve clean responsive breakpoints:**
   - Mobile: `< 640px` (single column, full-width buttons, collapsible menus).
   - Tablet: `640px – 1024px` (2 columns, compact floating navbar).
   - Desktop: `> 1024px` (max container `1150px` for landing page, `1300px` for floating navbar, multi-column tables).
5. **No inline style hacks:** Use Tailwind CSS v4 utility classes and existing CSS variables in `globals.css`.
6. **No Flash of Unstyled Theme (FOIT):** Any root layout modifications must preserve the synchronous theme detection script in `<head>` of `app/layout.tsx`.
