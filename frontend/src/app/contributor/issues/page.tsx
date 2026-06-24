"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
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
    time: "~1 hour",
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
    time: "~2 hours",
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
    time: "~5 hours",
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
    time: "~3 hours",
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
    time: "~45 mins",
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
    time: "~8 hours",
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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Good First Issues</h1>
        <p className="text-text-secondary">
          Curated example issues — use the Analyze button to get an AI-powered breakdown for any issue.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-3 mb-8">
        {ALL_FILTERS.map((filter) => (
          <button
            key={filter}
            id={`filter-${filter.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeFilter === filter
                ? "bg-primary text-white shadow-glow"
                : "bg-surface-raised text-text-secondary border border-border-color hover:text-text-primary hover:border-primary/50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Issue grid */}
      {filteredIssues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <p className="text-lg">No issues match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue, idx) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex h-full"
            >
              <GlassCard className="flex flex-col w-full h-full group" glowColor={issue.color as any}>
                <div className="text-xs font-mono text-secondary mb-2">{issue.repo}</div>

                <h3 className="text-lg font-bold text-text-primary mb-4 line-clamp-2 leading-snug">
                  {issue.title}
                </h3>

                <div className="flex items-center space-x-4 mb-4">
                  <DifficultyBadge level={issue.difficulty as any} />
                  <div className="flex items-center text-xs text-text-secondary font-medium">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {issue.time}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                  {issue.labels.map(label => (
                    <span key={label} className="px-2 py-0.5 rounded text-xs border border-border-color bg-surface-raised text-text-secondary">
                      {label}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/contributor/issue-helper?repo=https://github.com/${issue.repo}&issue=https://github.com/${issue.repo}/issues/${issue.number}`}
                  className="w-full"
                >
                  <button className="w-full py-2.5 rounded-lg border border-border-color text-text-primary font-medium text-sm transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:shadow-glow flex items-center justify-center">
                    Analyze This Issue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </Link>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-12 p-4 rounded-lg border border-border-color bg-surface-raised text-sm text-text-secondary text-center">
        Real-time good first issue feed from GitHub search is planned for a future milestone (PRD §6.1 F-C-06).
      </div>
    </div>
  );
}
