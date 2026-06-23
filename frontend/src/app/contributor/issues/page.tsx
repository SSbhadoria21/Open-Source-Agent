"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";

export default function IssueFeed() {
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filters = ["All", "Beginner", "Intermediate", "Advanced", "TypeScript", "Python", "React", "< 2 hours"];

  const issues = [
    {
      id: 1,
      repo: "vercel/next.js",
      title: "Fix hydration error mismatch on dynamic imports",
      difficulty: "Intermediate",
      time: "~2 hours",
      labels: ["bug", "react", "hydration"],
      color: "primary"
    },
    {
      id: 2,
      repo: "facebook/react",
      title: "Add warning when using useLayoutEffect on server",
      difficulty: "Beginner",
      time: "~1 hour",
      labels: ["good first issue", "warning", "ssr"],
      color: "success"
    },
    {
      id: 3,
      repo: "tiangolo/fastapi",
      title: "Support Pydantic v2 in WebSocket dependency injection",
      difficulty: "Advanced",
      time: "~5 hours",
      labels: ["enhancement", "pydantic", "websockets"],
      color: "secondary"
    },
    {
      id: 4,
      repo: "langchain-ai/langchain",
      title: "Implement fallback retry logic for Google Vertex AI embeddings",
      difficulty: "Intermediate",
      time: "~3 hours",
      labels: ["feature", "google-cloud", "retry"],
      color: "primary"
    },
    {
      id: 5,
      repo: "tailwindlabs/tailwindcss",
      title: "Update CLI documentation for v4 alpha",
      difficulty: "Beginner",
      time: "~45 mins",
      labels: ["docs", "cli"],
      color: "success"
    },
    {
      id: 6,
      repo: "huggingface/transformers",
      title: "Memory leak in Gemma2 model generation under high batch size",
      difficulty: "Advanced",
      time: "~8 hours",
      labels: ["bug", "memory", "gemma2"],
      color: "critical"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Good First Issues</h1>
        <p className="text-text-secondary">AI-curated issues matching your skill profile and preferences.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {filters.map((filter) => (
          <button
            key={filter}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {issues.map((issue, idx) => (
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

              <Link href={`/contributor/issue-helper?repo=https://github.com/${issue.repo}&issue=https://github.com/${issue.repo}/issues/${issue.id === 2 ? 28924 : 100 + issue.id}`} className="w-full">
                <button className="w-full py-2.5 rounded-lg border border-border-color text-text-primary font-medium text-sm transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:shadow-glow flex items-center justify-center">
                  Analyze This Issue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </Link>
            </GlassCard>
          </motion.div>
        ))}
      </div>
      
      {/* Skeleton loader for infinite scroll effect */}
      <div className="mt-8 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
}
