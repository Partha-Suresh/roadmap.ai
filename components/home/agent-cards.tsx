'use client';

import React from 'react';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';

const AGENTS = [
  {
    tag: 'Architect',
    title: 'Chronological Day Decomposer',
    subtitle: 'First-Principles Domain Invariants',
    description:
      'Partitions any complex domain into strict, chronological daily stages. Isolates non-negotiable mental models, eliminating speculative filler and cognitive overload.',
    metrics: [
      { label: 'Decomposition', value: 'First Principles' },
      { label: 'Pacing Metric', value: 'Chronological' },
      { label: 'Scope Bound', value: '1 to 90 Days' },
    ],
    accent: 'var(--saffron)',
    spotlight: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
    number: '01',
  },
  {
    tag: 'Structure',
    title: 'Minute-Budgeted DAG Synthesizer',
    subtitle: 'Mathematical Time Allocation',
    description:
      'Calculates minute-level time budgets for foundational drills, hands-on application, and boundary edge cases based on exact user commitment hours.',
    metrics: [
      { label: 'Resolution', value: 'Minute-Level' },
      { label: 'Topology', value: 'Strict DAG' },
      { label: 'Calibration', value: 'Adaptive Hours' },
    ],
    accent: 'var(--emerald)',
    spotlight: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    number: '02',
  },
  {
    tag: 'Teacher',
    title: 'Socratic Masterclass Evaluator',
    subtitle: 'Reproducible Diagnostic Mastery',
    description:
      'Delivers domain-native pedagogy—from competitive esports strategy and guitar ergonomics to distributed systems—complete with tactical Mermaid diagrams and Socratic evaluation.',
    metrics: [
      { label: 'Pedagogy', value: 'Domain-Native' },
      { label: 'Visuals', value: 'Vector Topology' },
      { label: 'Verification', value: 'Socratic Dialog' },
    ],
    accent: 'var(--cyan)',
    spotlight: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
    number: '03',
  },
];

/** The three agents behind a path */
export function AgentCards() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {AGENTS.map((agent) => (
        <SpotlightCard
          key={agent.number}
          spotlightColor={agent.spotlight}
          borderColor={agent.border}
          radius={320}
          className="group relative flex h-full flex-col overflow-hidden border border-border bg-card/90 p-6 shadow-lg"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-5 top-2 select-none font-display text-7xl font-black opacity-10 transition-opacity duration-300 group-hover:opacity-25"
            style={{ color: agent.accent }}
          >
            {agent.number}
          </div>

          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: agent.accent }} />
            {agent.tag}
          </p>
          <h3 className="mt-3 text-xl font-bold leading-snug tracking-tight [word-spacing:0.12em] text-foreground">
            {agent.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{agent.subtitle}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{agent.description}</p>

          <dl className="mt-auto space-y-2.5 pt-6 text-sm">
            {agent.metrics.map((m) => (
              <div key={m.label} className="flex items-baseline justify-between gap-4 border-t border-border pt-2.5">
                <dt className="text-muted-foreground">{m.label}</dt>
                <dd className="text-right font-semibold text-foreground">{m.value}</dd>
              </div>
            ))}
          </dl>
        </SpotlightCard>
      ))}
    </div>
  );
}
