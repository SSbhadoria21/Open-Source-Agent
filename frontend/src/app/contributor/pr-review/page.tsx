"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bug, Shield, Paintbrush, TestTube, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { StreamingText } from "@/components/ui/StreamingText";
import { reviewPR, type ReviewPRResponse, type ReviewIssue } from "@/lib/api";

export default function PRReview() {
  const [prUrl, setPrUrl] = useState("https://github.com/facebook/react/pull/28925");
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Bugs");
  const [data, setData] = useState<ReviewPRResponse | null>(null);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setComplete(false);
    setError(null);
    setData(null);

    try {
      const result = await reviewPR(prUrl);
      setData(result);
      setComplete(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setAnalyzing(false);
    }
  };

  const tabConfig = [
    { name: "Bugs", icon: <Bug className="w-4 h-4" />, color: "text-critical" },
    { name: "Security", icon: <Shield className="w-4 h-4" />, color: "text-success" },
    { name: "Style", icon: <Paintbrush className="w-4 h-4" />, color: "text-warning" },
    { name: "Tests", icon: <TestTube className="w-4 h-4" />, color: "text-orange-500" },
  ];

  const getIssueCount = (category: string): number => {
    if (!data?.grouped_issues) return 0;
    return (data.grouped_issues as any)[category]?.length || 0;
  };

  const getActiveIssues = (): ReviewIssue[] => {
    if (!data?.grouped_issues) return [];
    return (data.grouped_issues as any)[activeTab] || [];
  };

  const tabs = tabConfig.map(t => ({ ...t, count: getIssueCount(t.name) }));
  const activeIssues = getActiveIssues();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-bold tracking-[0.25em] text-accent uppercase block mb-1 text-glow-accent">
          [ Code Audit: Pre-Submission Review ]
        </span>
        <h1 className="text-4xl font-heading font-extrabold text-white uppercase tracking-tight">
          PR Review
        </h1>
        <p className="text-text-secondary text-sm">
          Run complete automated diagnostics on your pull request branches to identify logical conflicts, bugs, styles and tests.
        </p>
      </div>

      {/* Target input */}
      <GlassCard className="border border-primary/20 shadow-glow relative overflow-hidden" glowColor="accent">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent" />

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            className="flex-1 px-4 py-3.5 border border-border-color rounded-xl bg-surface/85 text-white font-mono text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(224,40,204,0.15)] transition-all"
            placeholder="https://github.com/owner/repo/pull/123"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
          />
          <button
            onClick={startAnalysis}
            disabled={analyzing}
            className="flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(224,40,204,0.4)] disabled:opacity-50 uppercase tracking-wider text-xs border border-accent/20"
          >
            {analyzing ? (
              <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> auditing...</span>
            ) : "Audit Branch"}
          </button>
        </div>
        <p className="text-[10px] font-mono text-text-secondary mt-4 flex items-center gap-1.5 uppercase font-bold tracking-wide">
          <Shield className="w-3.5 h-3.5 text-accent animate-pulse" />
          // Secure scan. Analysis is executed locally on system nodes without storage retention.
        </p>
      </GlassCard>

      {/* Error Output */}
      {error && (
        <div className="p-4 bg-critical/10 border border-critical/30 rounded-xl text-critical text-sm flex items-start gap-2.5 shadow-[0_0_15px_rgba(255,68,68,0.1)]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-critical" />
          <div>
            <span className="font-extrabold uppercase tracking-wider block mb-0.5">AUDIT CONFLICT DETECTED</span>
            <p className="text-text-primary">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {complete && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            {data.summary && (
              <GlassCard glowColor="secondary" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-secondary" />
                <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-secondary mb-3 pb-2 border-b border-secondary/15">
                  [ System Executive Summary ]
                </h3>
                <div className="text-sm text-text-secondary leading-relaxed font-medium">
                  <StreamingText text={data.summary} speed={15} />
                </div>
              </GlassCard>
            )}

            {/* Diagnostics Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tabs.map((tab) => (
                <div key={tab.name} className="bg-surface/60 border border-border-color/60 rounded-xl p-4 flex items-center justify-between shadow-inner">
                  <div className="flex items-center space-x-2 text-text-secondary">
                    {tab.icon}
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">{tab.name}</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${tab.count > 0 ? tab.color + " text-glow-" + tab.color.split("-")[1] : "text-text-secondary"}`}>
                    {tab.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Diagnostic Categories Details */}
            <GlassCard className="p-0 overflow-hidden border border-primary/20 shadow-glow relative">
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-accent/40 pointer-events-none" />
              
              {/* Tab Nav */}
              <div className="flex flex-wrap border-b border-border-color bg-surface-raised/40">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    onClick={() => setActiveTab(tab.name)}
                    className={`flex items-center space-x-2 px-6 py-4.5 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 ${
                      activeTab === tab.name
                        ? "border-accent text-accent bg-surface/80"
                        : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised/30"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.name}</span>
                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${activeTab === tab.name ? "bg-accent/15 text-accent border border-accent/20" : "bg-background"}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 bg-surface/50 min-h-[300px]">
                {activeIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary py-16">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    >
                      <CheckCircle2 className="w-16 h-16 text-success mb-4 shadow-[0_0_15px_rgba(0,229,160,0.35)] rounded-full" />
                    </motion.div>
                    <p className="text-sm font-mono uppercase tracking-widest text-success font-bold">[ category secure - no issues detected ]</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeIssues.map((issue, i) => (
                      <motion.div
                        key={`${issue.file}-${i}`}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="p-4 border border-border-color/60 rounded-xl bg-surface/40 hover:border-primary/45 transition-colors flex flex-col space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center space-x-2.5">
                            <PriorityBadge level={issue.severity as any} />
                            <span className="font-mono text-xs font-bold text-secondary bg-secondary/10 border border-secondary/25 px-2.5 py-0.5 rounded-lg">{issue.file}</span>
                          </div>
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed font-medium">{issue.desc}</p>

                        {issue.fix && (
                          <div className="bg-[#05050A] rounded-xl overflow-hidden border border-border-color">
                            <div className="flex items-center px-4 py-2 bg-surface-raised border-b border-border-color/50 text-[10px] font-mono text-text-secondary uppercase">
                              Suggested Diagnostic Fix
                            </div>
                            <pre className="p-3.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed text-success bg-success/[0.02]">
                              <span>+ {issue.fix}</span>
                            </pre>
                          </div>
                        )}
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
