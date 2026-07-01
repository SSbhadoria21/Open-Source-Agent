"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, FileText, Settings, Play, Copy, AlertTriangle, Loader2, Terminal } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AgentPipelineVisualizer, PipelineNode } from "@/components/ui/AgentPipelineVisualizer";
import { StreamingText } from "@/components/ui/StreamingText";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { FilePathChip } from "@/components/ui/FilePathChip";
import { getFixPlan, type FixPlanResponse } from "@/lib/api";

function IssueHelperContent() {
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase block mb-1 text-glow-primary">
          [ Active Calibration: Quest Runner ]
        </span>
        <h1 className="text-4xl font-heading font-extrabold text-white uppercase tracking-tight">
          Issue Helper
        </h1>
        <p className="text-text-secondary text-sm">
          Execute multi-agent intelligence to analyze selected issue parameters, map relevant files, and code recommendations.
        </p>
      </div>

      {/* Target input */}
      <GlassCard className="border border-primary/20 shadow-glow relative overflow-hidden" glowColor="accent">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent" />
        
        <div className="flex flex-col md:flex-row gap-4 mb-5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <GitBranch className="h-5 w-5 text-accent" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-border-color rounded-xl bg-surface/85 text-white font-mono text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(224,40,204,0.15)] transition-all"
              placeholder="Repository URL"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-border-color rounded-xl bg-surface/85 text-white font-mono text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(224,40,204,0.15)] transition-all"
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
            className="w-full sm:w-auto flex items-center justify-center px-10 py-3.5 bg-gradient-to-r from-primary via-accent to-indigo-600 text-white font-extrabold rounded-xl transition-all shadow-glow hover:shadow-[0_0_20px_rgba(110,86,207,0.45)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs border border-primary/30"
          >
            {loading ? (
              <span className="flex items-center"><Loader2 className="w-4.5 h-4.5 mr-2.5 animate-spin" /> RUNNING ALIGNMENT PIPELINE...</span>
            ) : (
              "Initialize Quest Analysis"
            )}
          </button>
        </div>
      </GlassCard>

      {/* Error Output */}
      {error && (
        <div className="p-4 bg-critical/10 border border-critical/30 rounded-xl text-critical text-sm flex items-start gap-2.5 shadow-[0_0_15px_rgba(255,68,68,0.1)]">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-critical" />
          <div>
            <span className="font-extrabold uppercase tracking-wider block mb-0.5">PIPELINE EXECUTION EXCEPTION</span>
            <p className="text-text-primary">{error}</p>
          </div>
        </div>
      )}

      {/* Visualizer */}
      <div className="bg-surface/50 border border-border-color rounded-2xl p-5 shadow-inner">
        <span className="text-[10px] font-bold font-mono text-accent uppercase tracking-widest block mb-4">[ Agent Alignment Grid ]</span>
        <AgentPipelineVisualizer nodes={nodes} />
      </div>

      {/* Results */}
      <div className="space-y-6">
        <AnimatePresence>
          {data && activePanel >= 1 && data.issue_summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <GlassCard glowColor="primary" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
                <div className="flex items-center space-x-3 mb-4 border-b border-primary/20 pb-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-white">1. Issue Breakdown Analysis</h2>
                  <div className="ml-auto">
                    <DifficultyBadge level={(data.issue_summary.difficulty || "Intermediate") as any} size="lg" />
                  </div>
                </div>

                <div className="text-text-secondary mb-6 text-sm leading-relaxed font-medium">
                  <StreamingText text={data.issue_summary.plain_summary || "No summary available."} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-color/30 pt-4">
                  <div>
                    <span className="block text-[10px] font-bold font-mono text-accent uppercase tracking-wider mb-2">[ Affected Areas ]</span>
                    <div className="flex flex-wrap gap-2">
                      {(data.issue_summary.affected_areas || []).map((area: string) => (
                        <span key={area} className="px-3 py-1 bg-surface-raised border border-border-color rounded-lg text-xs font-bold font-mono text-text-secondary uppercase">{area}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold font-mono text-accent uppercase tracking-wider mb-2">[ Estimated Reward Time ]</span>
                    <span className="text-sm font-extrabold text-white font-mono uppercase tracking-wide">~{data.issue_summary.estimated_hours || "?"} hours</span>
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
              <GlassCard glowColor="secondary" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-secondary" />
                <div className="flex items-center space-x-3 mb-4 border-b border-secondary/20 pb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg text-secondary border border-secondary/30">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-white">2. Affected Code Discovery</h2>
                </div>

                <p className="text-xs text-text-secondary mb-4 font-medium uppercase tracking-wider">// CODE AGENT HAS TRACED MODIFICATION FILES:</p>

                <div className="space-y-3 mb-2">
                  {(data.affected_files || []).map((file, i) => (
                    <motion.div
                      key={file.path}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 bg-surface-raised rounded-xl border border-border-color/60 hover:border-secondary/35 transition-all flex flex-col space-y-2"
                    >
                      <FilePathChip path={file.path} />
                      <span className="text-xs text-text-secondary leading-relaxed font-mono">{file.reason}</span>
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
              <GlassCard glowColor="success" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-success" />
                <div className="flex items-center space-x-3 mb-5 border-b border-success/20 pb-3">
                  <div className="p-2 bg-success/15 rounded-lg text-success border border-success/30 shadow-[0_0_10px_rgba(0,229,160,0.2)]">
                    <Play className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-success">3. AI Implementation Guide</h2>
                  <button
                    onClick={copyPlan}
                    className="ml-auto flex items-center space-x-2 text-[10px] font-bold font-mono text-text-secondary hover:text-white transition-all bg-surface-raised border border-border-color px-3 py-1.5 rounded-lg uppercase tracking-wider"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? "Copied!" : "Copy plan"}</span>
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="relative pl-6 border-l border-primary/20 space-y-8">
                    {(data.fix_plan.steps || []).map((step) => (
                      <div key={step.number} className="relative">
                        <div className="absolute -left-[37px] w-8 h-8 rounded-full bg-surface border-2 border-primary shadow-glow flex items-center justify-center text-primary font-mono font-bold text-xs">
                          {step.number}
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">[ STEP {step.number}: {step.title} ]</h4>
                        <p className="text-xs text-text-secondary leading-relaxed font-medium mb-3.5">{step.description}</p>
                        {step.snippet && (
                          <div className="bg-[#05050A] rounded-xl overflow-hidden border border-border-color">
                            <div className="flex items-center px-4 py-2 bg-surface-raised border-b border-border-color/50 text-[10px] font-mono text-text-secondary uppercase">
                              <Terminal className="w-3.5 h-3.5 mr-2 text-primary" />
                              {(step.files_modified || []).join(", ") || "SOURCE CODE"}
                            </div>
                            <pre className="p-4 text-xs font-mono text-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {step.snippet}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {data.fix_plan.edge_cases && data.fix_plan.edge_cases.length > 0 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start space-x-3 shadow-[0_0_15px_rgba(255,184,0,0.1)]">
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-warning uppercase tracking-wider mb-1.5">[ EDGE CASES WARNING ]</h5>
                        <ul className="text-xs text-text-secondary list-disc pl-4 space-y-1 font-medium">
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

export default function IssueHelper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    }>
      <IssueHelperContent />
    </Suspense>
  );
}
