"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";

// Curated sample issues — these are real, publicly-visible GitHub issues
// used as examples. The issue URLs below point to actual issues.
// A real-time feed is planned for a future milestone (PRD §6.1 F-C-06).
const ALL_ISSUES = [
  {
    id: 1,
    number: 28924,
    repo: "facebook/react",
    title: "Add warning when using useLayoutEffect on server",
    difficulty: "Beginner",
    estimatedHours: 1,
    time: "1 hour",
    labels: ["good first issue", "warning", "ssr"],
    color: "success"
  },
  {
    id: 2,
    number: 65854,
    repo: "vercel/next.js",
    title: "Fix hydration error mismatch on dynamic imports",
    difficulty: "Intermediate",
    estimatedHours: 2,
    time: "2 hours",
    labels: ["bug", "react", "hydration"],
    color: "primary"
  },
  {
    id: 3,
    number: 5847,
    repo: "tiangolo/fastapi",
    title: "Support Pydantic v2 in WebSocket dependency injection",
    difficulty: "Advanced",
    estimatedHours: 5,
    time: "5 hours",
    labels: ["enhancement", "pydantic", "websockets"],
    color: "secondary"
  },
  {
    id: 4,
    number: 18452,
    repo: "langchain-ai/langchain",
    title: "Implement fallback retry logic for Google Vertex AI embeddings",
    difficulty: "Intermediate",
    estimatedHours: 3,
    time: "3 hours",
    labels: ["feature", "google-cloud", "retry"],
    color: "primary"
  },
  {
    id: 5,
    number: 14229,
    repo: "tailwindlabs/tailwindcss",
    title: "Update CLI documentation for v4 alpha",
    difficulty: "Beginner",
    estimatedHours: 1,
    time: "45 mins",
    labels: ["docs", "cli"],
    color: "success"
  },
  {
    id: 6,
    number: 31124,
    repo: "huggingface/transformers",
    title: "Memory leak in Gemma2 model generation under high batch size",
    difficulty: "Advanced",
    estimatedHours: 8,
    time: "8 hours",
    labels: ["bug", "memory", "gemma2"],
    color: "critical"
  }
];

const FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];
const LABEL_FILTERS = ["TypeScript", "Python", "React", "< 2 hours"];
const ALL_FILTERS = [...FILTERS, ...LABEL_FILTERS];

export default function IssueFeed() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredIssues = ALL_ISSUES.filter((issue) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "< 2 hours") return issue.estimatedHours < 2;
    if (["Beginner", "Intermediate", "Advanced"].includes(activeFilter)) {
      return issue.difficulty === activeFilter;
    }
    // Label-based filters (case-insensitive)
    const filterLower = activeFilter.toLowerCase();
    return issue.labels.some((l) => l.toLowerCase().includes(filterLower));
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-bold tracking-[0.25em] text-accent uppercase block mb-1 text-glow-accent">
          [ Quest Board: Active Missions ]
        </span>
        <h1 className="text-4xl font-heading font-extrabold text-white uppercase tracking-tight">
          Good First Issues
        </h1>
        <p className="text-text-secondary text-sm">
          Select a verified community quest to initialize an AI-powered walkthrough and dependency overview.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2.5 bg-surface/30 p-2.5 rounded-xl border border-primary/10">
        {ALL_FILTERS.map((filter) => (
          <button
            key={filter}
            id={`filter-${filter.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
              activeFilter === filter
                ? "bg-accent text-white border-accent shadow-glow-accent"
                : "bg-surface-raised/60 text-text-secondary border-border-color hover:text-text-primary hover:border-primary/50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Issue grid */}
      {filteredIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-secondary border border-dashed border-border-color rounded-2xl bg-surface/10">
          <p className="text-sm font-mono uppercase tracking-widest">[ NO ACTIVE MISSION FOUND ]</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue, idx) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="flex h-full"
            >
              <GlassCard className="flex flex-col w-full h-full relative overflow-hidden group border border-primary/10 hover:border-primary/30" glowColor={issue.color as any}>
                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-accent/30 pointer-events-none" />
                
                <div className="text-[10px] font-mono font-bold text-accent tracking-wider uppercase mb-2">
                  // {issue.repo}
                </div>

                <h3 className="text-base font-extrabold text-white mb-4 line-clamp-2 leading-snug uppercase tracking-tight group-hover:text-glow-primary transition-all">
                  {issue.title}
                </h3>

                <div className="flex items-center space-x-4 mb-5">
                  <DifficultyBadge level={issue.difficulty as any} />
                  <div className="flex items-center text-xs font-mono font-bold text-text-secondary uppercase">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    {issue.time}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6 mt-auto">
                  {issue.labels.map(label => (
                    <span key={label} className="px-2 py-1 rounded text-[10px] font-bold font-mono border border-primary/25 bg-primary/5 text-text-secondary uppercase">
                      {label}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/contributor/issue-helper?repo=https://github.com/${issue.repo}&issue=https://github.com/${issue.repo}/issues/${issue.number}`}
                  className="w-full"
                >
                  <button className="w-full py-3 rounded-lg border border-accent/20 bg-surface-raised text-accent font-extrabold text-xs uppercase tracking-widest transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:text-white group-hover:shadow-glow flex items-center justify-center">
                    Accept Quest
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </Link>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info notice bar */}
      <div className="p-4 rounded-xl border border-primary/20 bg-surface/30 text-xs font-mono font-semibold text-text-secondary flex items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0 animate-pulse" />
        <span className="uppercase tracking-wider">
          Real-time mission search synchronizer is scheduled for a future core update.
        </span>
      </div>
    </div>
  );
}
