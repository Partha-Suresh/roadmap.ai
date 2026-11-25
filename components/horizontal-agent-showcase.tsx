'use client';

import React from 'react';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import { TiltedCard } from '@/components/react-bits/tilted-card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Terminal, Sparkles, Layers } from '@/components/ui/icons';

const AGENTS = [
  {
    tag: 'AGENT 01: ARCHITECT',
    title: 'Chronological Day Decomposer',
    subtitle: 'First-Principles Domain Invariants',
    description:
      'Partitions any complex domain into strict, chronological daily stages. Isolates non-negotiable mental models, eliminating speculative filler and cognitive overload.',
    metrics: [
      { label: 'Decomposition', value: 'First Principles' },
      { label: 'Pacing Metric', value: 'Chronological' },
      { label: 'Scope Bound', value: '1 to 90 Days' },
    ],
    accent: '#f97316',
    spotlight: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
    number: '01',
    badgeVariant: 'orange' as const,
  },
  {
    tag: 'AGENT 02: STRUCTURE',
    title: 'Minute-Budgeted DAG Synthesizer',
    subtitle: 'Mathematical Time Allocation',
    description:
      'Calculates minute-level time budgets for foundational drills, hands-on application, and boundary edge cases based on exact user commitment hours.',
    metrics: [
      { label: 'Resolution', value: 'Minute-Level' },
      { label: 'Topology', value: 'Strict DAG' },
      { label: 'Calibration', value: 'Adaptive Hours' },
    ],
    accent: '#10b981',
    spotlight: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    number: '02',
    badgeVariant: 'emerald' as const,
  },
  {
    tag: 'AGENT 03: TEACHER',
    title: 'Socratic Masterclass Evaluator',
    subtitle: 'Reproducible Diagnostic Mastery',
    description:
      'Delivers domain-native pedagogy—from competitive esports strategy and guitar ergonomics to distributed systems—complete with tactical Mermaid diagrams and Socratic evaluation.',
    metrics: [
      { label: 'Pedagogy', value: 'Domain-Native' },
      { label: 'Visuals', value: 'Vector Topology' },
      { label: 'Verification', value: 'Socratic Dialog' },
    ],
    accent: '#06b6d4',
    spotlight: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
    number: '03',
    badgeVariant: 'cyan' as const,
  },
];

export function HorizontalAgentShowcase() {
  return (
    <section className="py-24 max-w-[1200px] mx-auto px-6 relative z-10">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center mb-2">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground font-mono">
              SYSTEM ARCHITECTURE
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.03em] text-foreground font-display">
            Multi-Agent Architecture
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground font-mono max-w-md leading-relaxed">
          Modular multi-agent system designed for focused learning and structured mastery.
        </p>
      </div>

      {/* Grid of 3 Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {AGENTS.map((agent) => (
          <TiltedCard
            key={agent.number}
            maxAngle={5}
            scale={1.015}
            showGlare={true}
            className="w-full h-full"
          >
            <SpotlightCard
              spotlightColor={agent.spotlight}
              borderColor={agent.border}
              radius={320}
              className="p-7 sm:p-8 flex flex-col justify-between h-full bg-card/90 border border-border relative overflow-hidden group shadow-lg"
            >
              {/* Giant Watermark Number (Lando Norris style) */}
              <div
                className="absolute top-3 right-6 text-7xl sm:text-8xl font-black select-none pointer-events-none font-mono opacity-5 group-hover:opacity-15 transition-opacity duration-300"
                style={{ color: agent.accent }}
              >
                {agent.number}
              </div>

              <div>
                {/* Telemetry Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className="text-[11px] font-mono tracking-widest uppercase font-bold"
                    style={{ color: agent.accent }}
                  >
                    {agent.tag}
                  </span>
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: agent.accent }} />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {agent.title}
                </h3>
                <span className="text-xs text-muted-foreground font-mono block mt-1">
                  {agent.subtitle}
                </span>

                <p className="mt-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {agent.description}
                </p>
              </div>

              {/* Specs & Metrics Matrix */}
              <div className="mt-8 pt-6 border-t border-border space-y-2.5">
                {agent.metrics.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                      {m.label}
                    </span>
                    <span className="text-foreground font-semibold">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </TiltedCard>
        ))}
      </div>
    </section>
  );
}

export default HorizontalAgentShowcase;
