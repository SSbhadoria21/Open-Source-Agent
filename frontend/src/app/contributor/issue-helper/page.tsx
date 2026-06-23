"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, FileText, Settings, Play, Copy, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AgentPipelineVisualizer, PipelineNode } from "@/components/ui/AgentPipelineVisualizer";
import { StreamingText } from "@/components/ui/StreamingText";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { FilePathChip } from "@/components/ui/FilePathChip";
import { getFixPlan, type FixPlanResponse } from "@/lib/api";

export default function IssueHelper() {
  const searchParams = useSearchParams();

  const [repoUrl, setRepoUrl] = useState(searchParams.get("repo") || "https://github.com/facebook/react");
  const [issueUrl, setIssueUrl] = useState(searchParams.get("issue") || "https://github.com/facebook/react/issues/28924");

  const [nodes, setNodes] = useState<PipelineNode[]>([
    { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "idle" },
    { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "idle" },
    { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "idle" },
  ]);

  const [activePanel, setActivePanel] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FixPlanResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setActivePanel(0);

    // Start pipeline visualization — Issue Agent running
    setNodes([
      { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "running" },
      { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "idle" },
      { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "idle" },
    ]);

    // Animate through stages while waiting for API
    const stageTimer1 = setTimeout(() => {
      setNodes([
        { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "done", time: "analyzing..." },
        { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "running" },
        { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "idle" },
      ]);
    }, 5000);

    const stageTimer2 = setTimeout(() => {
      setNodes([
        { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "done", time: "done" },
        { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "done", time: "analyzing..." },
        { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "running" },
      ]);
    }, 12000);

    try {
      const result = await getFixPlan(issueUrl, repoUrl);
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      setData(result);

      // All agents done
      setNodes([
        { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "done", time: "✓" },
        { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "done", time: "✓" },
        { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "done", time: "✓" },
      ]);
      setActivePanel(3); // Show all panels
    } catch (err: any) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setError(err.message || "An unexpected error occurred.");
      setNodes(nodes.map(n => ({ ...n, status: "idle" as const, time: undefined })));
    } finally {
      setLoading(false);
    }
  };

  const copyPlan = () => {
    if (!data?.fix_plan) return;
    const text = data.fix_plan.steps.map(s =>
      `Step ${s.number}: ${s.title}\n${s.description}\n\n${s.snippet}\n`
    ).join("\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Issue Helper</h1>
        <p className="text-text-secondary">Analyze an issue, map the dependencies, and generate a step-by-step fix plan.</p>
      </div>

      <GlassCard className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GitBranch className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Repository URL"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Issue URL"
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center px-8 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-lg hover:shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Pipeline...</span>
            ) : (
              "Run Full Analysis"
            )}
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="mb-8 p-4 bg-critical/10 border border-critical/30 rounded-lg text-critical text-sm">
          <span className="font-bold">Analysis Failed: </span>{error}
        </div>
      )}

      <div className="mb-10">
        <AgentPipelineVisualizer nodes={nodes} />
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {data && activePanel >= 1 && data.issue_summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <GlassCard glowColor="primary">
                <div className="flex items-center space-x-3 mb-4 border-b border-border-color pb-3">
                  <div className="p-2 bg-primary/20 rounded-md text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-heading font-bold">1. Issue Breakdown</h2>
                  <div className="ml-auto">
                    <DifficultyBadge level={(data.issue_summary.difficulty || "Intermediate") as any} size="lg" />
                  </div>
                </div>

                <div className="text-text-primary mb-6 text-sm leading-relaxed">
                  <StreamingText text={data.issue_summary.plain_summary || "No summary available."} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Affected Areas</span>
                    <div className="flex flex-wrap gap-2">
                      {(data.issue_summary.affected_areas || []).map((area: string) => (
                        <span key={area} className="px-3 py-1 bg-surface-raised border border-border-color rounded-md text-sm">{area}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Estimated Time</span>
                    <span className="text-sm font-bold text-text-primary">~{data.issue_summary.estimated_hours || "?"} hours</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {data && activePanel >= 2 && data.affected_files && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <GlassCard glowColor="secondary">
                <div className="flex items-center space-x-3 mb-4 border-b border-border-color pb-3">
                  <div className="p-2 bg-secondary/20 rounded-md text-secondary">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-heading font-bold">2. Code Discovery</h2>
                </div>

                <p className="text-sm text-text-secondary mb-4">The Code Agent has identified the files most likely related to this issue.</p>

                <div className="space-y-3 mb-6">
                  {(data.affected_files || []).map((file, i) => (
                    <motion.div
                      key={file.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className="p-3 bg-surface-raised rounded-lg border border-border-color flex flex-col space-y-2"
                    >
                      <FilePathChip path={file.path} />
                      <span className="text-sm text-text-secondary">{file.reason}</span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {data && activePanel >= 3 && data.fix_plan && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <GlassCard>
                <div className="flex items-center space-x-3 mb-4 border-b border-border-color pb-3">
                  <div className="p-2 bg-success/20 rounded-md text-success shadow-[0_0_10px_rgba(0,229,160,0.3)]">
                    <Play className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-heading font-bold text-success">3. Implementation Plan</h2>
                  <button
                    onClick={copyPlan}
                    className="ml-auto flex items-center space-x-2 text-sm text-text-secondary hover:text-white transition-colors bg-surface-raised px-3 py-1.5 rounded border border-border-color"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copied ? "Copied!" : "Copy Plan"}</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
                    {(data.fix_plan.steps || []).map((step) => (
                      <div key={step.number} className="relative">
                        <div className="absolute -left-[35px] w-8 h-8 rounded-full bg-surface border-2 border-primary flex items-center justify-center text-primary font-bold text-sm">
                          {step.number}
                        </div>
                        <h4 className="text-md font-bold mb-2">{step.title}</h4>
                        <p className="text-sm text-text-secondary mb-3">{step.description}</p>
                        {step.snippet && (
                          <div className="bg-[#1E1E1E] rounded-md overflow-hidden border border-border-color">
                            <div className="flex items-center px-4 py-2 bg-black/40 border-b border-border-color/50 text-xs text-text-secondary">
                              {(step.files_modified || []).join(", ") || "Code Snippet"}
                            </div>
                            <pre className="p-4 text-xs font-mono text-[#D4D4D4] overflow-x-auto whitespace-pre-wrap">
                              {step.snippet}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {data.fix_plan.edge_cases && data.fix_plan.edge_cases.length > 0 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-bold text-warning mb-1">Edge Cases to Consider</h5>
                        <ul className="text-sm text-text-secondary list-disc pl-4 space-y-1">
                          {data.fix_plan.edge_cases.map((ec, i) => (
                            <li key={i}>{ec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
