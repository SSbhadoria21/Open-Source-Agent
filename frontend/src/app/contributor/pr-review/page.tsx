"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bug, Shield, Paintbrush, TestTube, CheckCircle2, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

export default function PRReview() {
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("Bugs");

  const startAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setComplete(true);
    }, 3000);
  };

  const tabs = [
    { name: "Bugs", icon: <Bug className="w-4 h-4" />, count: 2, color: "text-critical" },
    { name: "Security", icon: <Shield className="w-4 h-4" />, count: 0, color: "text-success" },
    { name: "Style", icon: <Paintbrush className="w-4 h-4" />, count: 3, color: "text-warning" },
    { name: "Tests", icon: <TestTube className="w-4 h-4" />, count: 1, color: "text-orange-500" },
  ];

  const issues = {
    Bugs: [
      {
        id: 1,
        severity: "High",
        file: "src/utils/parser.ts:42",
        desc: "Potential null pointer exception when `ast.body` is undefined before mapping.",
        fix: "if (!ast?.body) return [];"
      },
      {
        id: 2,
        severity: "Medium",
        file: "src/components/Header.tsx:18",
        desc: "Missing dependency `user` in useEffect hook.",
        fix: "}, [user, dispatch]);"
      }
    ],
    Security: [],
    Style: [
      {
        id: 3,
        severity: "Low",
        file: "src/api/client.ts:112",
        desc: "Use camelCase for variable names instead of snake_case (`api_response`).",
        fix: "const apiResponse = await fetch(...)"
      },
      {
        id: 4,
        severity: "Low",
        file: "src/api/client.ts:115",
        desc: "Unnecessary else block after return statement.",
        fix: "Remove `else` and un-indent the block."
      },
      {
        id: 5,
        severity: "Low",
        file: "src/models/user.ts:5",
        desc: "Prefer `interface` over `type` for object definitions.",
        fix: "interface UserProps { ... }"
      }
    ],
    Tests: [
      {
        id: 6,
        severity: "Medium",
        file: "tests/parser.test.ts",
        desc: "Missing test coverage for the new `parseStrict` function.",
        fix: "Add a test block: `describe('parseStrict', () => { ... })`"
      }
    ]
  };

  const activeIssues = (issues as any)[activeTab];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Pre-Submission PR Review</h1>
        <p className="text-text-secondary">Analyze your pull request privately to catch bugs, security flaws, and style issues before review.</p>
      </div>

      <GlassCard className="mb-10">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <input
            type="text"
            className="flex-1 px-4 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-primary transition-all"
            placeholder="https://github.com/owner/repo/pull/123"
            defaultValue="https://github.com/facebook/react/pull/28925"
          />
          <button 
            onClick={startAnalysis}
            disabled={analyzing}
            className="flex items-center justify-center px-8 py-3 bg-primary text-white font-medium rounded-lg hover:shadow-glow disabled:opacity-50"
          >
            {analyzing ? (
              <span className="flex items-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Analyzing...</span>
            ) : "Review PR"}
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-4 flex items-center">
          <Shield className="w-3 h-3 mr-1" />
          Your GitHub PR will be analyzed privately — we never store your code.
        </p>
      </GlassCard>

      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Summary Bar */}
            <div className="flex flex-wrap gap-4 mb-8">
              {tabs.map((tab) => (
                <div key={tab.name} className="flex-1 bg-surface-raised border border-border-color rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-text-secondary">
                    {tab.icon}
                    <span className="font-medium">{tab.name}</span>
                  </div>
                  <span className={`text-xl font-bold font-heading ${tab.count > 0 ? tab.color : "text-text-secondary"}`}>
                    {tab.count}
                  </span>
                </div>
              ))}
            </div>

            <GlassCard className="p-0 overflow-hidden">
              {/* Tab Nav */}
              <div className="flex border-b border-border-color bg-surface-raised/50">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all border-b-2 ${
                      activeTab === tab.name 
                        ? "border-primary text-text-primary bg-surface" 
                        : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.name}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.name ? "bg-primary/20 text-primary" : "bg-background"}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 bg-surface min-h-[300px]">
                {activeIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary py-12">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    >
                      <CheckCircle2 className="w-16 h-16 text-success mb-4 shadow-[0_0_15px_rgba(0,229,160,0.3)] rounded-full" />
                    </motion.div>
                    <p className="text-lg">No issues found in this category 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeIssues.map((issue: any, i: number) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 border border-border-color rounded-lg bg-background/50 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <PriorityBadge level={issue.severity as any} />
                            <span className="font-mono text-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded">{issue.file}</span>
                          </div>
                        </div>
                        <p className="text-text-primary mb-4 text-sm">{issue.desc}</p>
                        
                        <div className="bg-[#1E1E1E] rounded-md overflow-hidden border border-border-color">
                          <div className="flex items-center px-4 py-1.5 bg-black/40 border-b border-border-color/50 text-xs text-text-secondary">
                            Suggested Fix
                          </div>
                          <pre className="p-3 text-xs font-mono text-[#D4D4D4] overflow-x-auto">
                            <span className="text-success">+ {issue.fix}</span>
                          </pre>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
