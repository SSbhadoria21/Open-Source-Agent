"use client";

import { useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  FileText,
  Settings,
  Play,
  Copy,
  AlertTriangle,
  Loader2,
  Terminal,
  BookOpen,
  ExternalLink,
  BookmarkCheck,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AgentPipelineVisualizer, PipelineNode } from "@/components/ui/AgentPipelineVisualizer";
import { StreamingText } from "@/components/ui/StreamingText";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { FilePathChip } from "@/components/ui/FilePathChip";
import { getFixPlan, streamFixPlan, type FixPlanResponse, type SourceCitation } from "@/lib/api";

function IssueHelperContent() {
  const searchParams = useSearchParams();

  const [repoUrl, setRepoUrl] = useState(searchParams.get("repo") || "https://github.com/facebook/react");
  const [issueUrl, setIssueUrl] = useState(searchParams.get("issue") || "https://github.com/facebook/react/issues/28924");

  const [nodes, setNodes] = useState<PipelineNode[]>([
    { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "idle" },
    { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "idle" },
    { id: "docs", name: "Docs RAG", icon: <BookOpen className="w-5 h-5" />, status: "idle" },
    { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "idle" },
  ]);

  const [activePanel, setActivePanel] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FixPlanResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [indexingMsg, setIndexingMsg] = useState<string | null>(null);

  const cleanupStreamRef = useRef<(() => void) | null>(null);

  const runAnalysis = async () => {
    if (!repoUrl.trim() || !issueUrl.trim()) {
      setError("Please provide both a Repository URL and an Issue URL.");
      return;
    }

    if (cleanupStreamRef.current) {
      cleanupStreamRef.current();
      cleanupStreamRef.current = null;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setActivePanel(0);
    setIndexingMsg("Initializing multi-agent pipeline...");

    // Initialize pipeline nodes
    setNodes([
      { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "running", time: "analyzing..." },
      { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "idle" },
      { id: "docs", name: "Docs RAG", icon: <BookOpen className="w-5 h-5" />, status: "idle" },
      { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "idle" },
    ]);

    let streamCompleted = false;

    try {
      const cleanup = streamFixPlan(
        issueUrl,
        repoUrl,
        (eventType, payload) => {
          if (eventType === "agent_status") {
            const { node, status, time, result } = payload;
            setNodes((prev) =>
              prev.map((n) => (n.id === node ? { ...n, status, time } : n))
            );

            if (node === "issue" && status === "done" && result) {
              setData((prev) => ({
                ...(prev || ({} as any)),
                issue_summary: result,
              }));
              setActivePanel((p) => Math.max(p, 1));
            } else if (node === "code" && status === "done" && result) {
              setData((prev) => ({
                ...(prev || ({} as any)),
                affected_files: result.affected_files,
                call_graph: result.call_graph,
              }));
              setActivePanel((p) => Math.max(p, 2));
            } else if (node === "docs" && status === "done") {
              setActivePanel((p) => Math.max(p, 3));
            }
          } else if (eventType === "indexing_docs") {
            setIndexingMsg(payload.message || "Indexing documentation...");
          } else if (eventType === "retrieved_context") {
            const sources: SourceCitation[] = payload.sources || [];
            setData((prev) => ({
              ...(prev || ({} as any)),
              retrieved_context: payload.chunks || [],
              fix_plan: {
                ...(prev?.fix_plan || { steps: [], edge_cases: [] }),
                sources,
              },
            }));
            setActivePanel((p) => Math.max(p, 3));
          } else if (eventType === "complete") {
            streamCompleted = true;
            setData(payload);
            setNodes([
              { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "done", time: "✓" },
              { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "done", time: "✓" },
              { id: "docs", name: "Docs RAG", icon: <BookOpen className="w-5 h-5" />, status: "done", time: "✓" },
              { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "done", time: "✓" },
            ]);
            setActivePanel(4);
            setLoading(false);
            setIndexingMsg(null);
          } else if (eventType === "error") {
            setError(payload.error || "An error occurred during agent execution.");
            setLoading(false);
            setIndexingMsg(null);
          }
        },
        async () => {
          // If SSE connection fails, fall back to POST endpoint seamlessly
          if (!streamCompleted) {
            try {
              const fallbackData = await getFixPlan(issueUrl, repoUrl);
              setData(fallbackData);
              setNodes([
                { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "done", time: "✓" },
                { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "done", time: "✓" },
                { id: "docs", name: "Docs RAG", icon: <BookOpen className="w-5 h-5" />, status: "done", time: "✓" },
                { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "done", time: "✓" },
              ]);
              setActivePanel(4);
            } catch (fallbackErr: any) {
              setError(fallbackErr.message || "An unexpected error occurred.");
              setNodes((prev) => prev.map((n) => ({ ...n, status: "idle" as const, time: undefined })));
            } finally {
              setLoading(false);
              setIndexingMsg(null);
            }
          }
        }
      );

      cleanupStreamRef.current = cleanup;
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
      setIndexingMsg(null);
    }
  };

  const copyPlan = () => {
    if (!data?.fix_plan) return;
    const text = data.fix_plan.steps
      .map(
        (s) =>
          `Step ${s.number}: ${s.title}\n${s.description}\n\n${s.snippet}\n`
      )
      .join("\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sources = data?.fix_plan?.sources || [];
  const retrievedChunks = data?.retrieved_context || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase block mb-1 text-glow-primary">
          [ Active Calibration: Quest Runner + RAG Grounding ]
        </span>
        <h1 className="text-4xl font-heading font-extrabold text-white uppercase tracking-tight">
          Issue Helper
        </h1>
        <p className="text-text-secondary text-sm">
          Execute multi-agent intelligence to analyze selected issues, trace affected code, retrieve repo documentation, and generate grounded implementation plans.
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

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-xs text-text-secondary font-mono flex items-center">
            {loading && indexingMsg && (
              <span className="flex items-center text-accent animate-pulse">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                {indexingMsg}
              </span>
            )}
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center px-10 py-3.5 bg-gradient-to-r from-primary via-accent to-indigo-600 text-white font-extrabold rounded-xl transition-all shadow-glow hover:shadow-[0_0_20px_rgba(110,86,207,0.45)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs border border-primary/30"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="w-4.5 h-4.5 mr-2.5 animate-spin" /> RUNNING ALIGNMENT PIPELINE...
              </span>
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

      {/* Visualizer Command Center */}
      <div className="bg-surface/50 border border-border-color rounded-2xl p-5 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold font-mono text-accent uppercase tracking-widest block">
            [ Real-Time Agent Command Center ]
          </span>
          <span className="text-[10px] font-mono text-text-secondary uppercase">
            {loading ? "Streaming Live via SSE" : "Pipeline Idle"}
          </span>
        </div>
        <AgentPipelineVisualizer nodes={nodes} />
      </div>

      {/* Progressive Results Display */}
      <div className="space-y-6">
        <AnimatePresence>
          {/* Panel 1: Issue Breakdown */}
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
                  <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-white">
                    1. Issue Breakdown Analysis
                  </h2>
                  <div className="ml-auto">
                    <DifficultyBadge level={(data.issue_summary.difficulty || "Intermediate") as any} size="lg" />
                  </div>
                </div>

                <div className="text-text-secondary mb-6 text-sm leading-relaxed font-medium">
                  <StreamingText text={data.issue_summary.plain_summary || "No summary available."} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border-color/30 pt-4">
                  <div>
                    <span className="block text-[10px] font-bold font-mono text-accent uppercase tracking-wider mb-2">
                      [ Affected Areas ]
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(data.issue_summary.affected_areas || []).map((area: string) => (
                        <span
                          key={area}
                          className="px-3 py-1 bg-surface-raised border border-border-color rounded-lg text-xs font-bold font-mono text-text-secondary uppercase"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold font-mono text-accent uppercase tracking-wider mb-2">
                      [ Estimated Reward Time ]
                    </span>
                    <span className="text-sm font-extrabold text-white font-mono uppercase tracking-wide">
                      ~{data.issue_summary.estimated_hours || "?"} hours
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Panel 2: Affected Code Discovery */}
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
                  <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-white">
                    2. Affected Code Discovery
                  </h2>
                </div>

                <p className="text-xs text-text-secondary mb-4 font-medium uppercase tracking-wider">
                  // CODE AGENT HAS TRACED MODIFICATION FILES:
                </p>

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
                      <span className="text-xs text-text-secondary leading-relaxed font-mono">
                        {file.reason}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Panel 3: Retrieved Repository Documentation */}
          {data && (activePanel >= 3 || sources.length > 0 || retrievedChunks.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden"
            >
              <GlassCard glowColor="accent" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent" />
                <div className="flex items-center space-x-3 mb-4 border-b border-accent/20 pb-3">
                  <div className="p-2 bg-accent/15 rounded-lg text-accent border border-accent/30 shadow-[0_0_10px_rgba(224,40,204,0.2)]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-white">
                      3. Retrieved Repository Documentation & Conventions
                    </h2>
                    <span className="text-[10px] text-text-secondary font-mono">
                      Grounded in target repo&apos;s own guides, templates & contribution rules
                    </span>
                  </div>
                  <div className="ml-auto">
                    <span className="px-2.5 py-1 bg-accent/10 border border-accent/30 rounded-lg text-xs font-mono font-bold text-accent">
                      {sources.length || retrievedChunks.length} Sources Found
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {(sources.length > 0 ? sources : retrievedChunks.map(c => ({ file_path: c.file_path, source_url: c.source_url, heading: c.heading, score: c.score }))).map((src, i) => (
                    <a
                      key={`${src.file_path}-${i}`}
                      href={src.source_url || `https://github.com/${repoUrl.replace("https://github.com/", "")}/blob/main/${src.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-3 bg-surface-raised rounded-xl border border-border-color/60 hover:border-accent/40 hover:bg-surface transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold font-mono text-white group-hover:text-accent transition-colors flex items-center">
                          <BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-accent flex-shrink-0" />
                          {src.file_path}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-secondary group-hover:text-accent transition-colors flex-shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary mt-1">
                        <span className="truncate max-w-[200px] text-accent/80 font-semibold">
                          {src.heading ? `§ ${src.heading}` : "General Documentation"}
                        </span>
                        {src.score !== undefined && (
                          <span className="px-1.5 py-0.5 rounded bg-surface border border-border-color text-text-secondary">
                            Score: {(src.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Panel 4: AI Implementation Guide Grounded in Docs */}
          {data && activePanel >= 4 && data.fix_plan && (
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
                  <div>
                    <h2 className="text-sm font-bold font-heading uppercase tracking-wider text-success">
                      4. Grounded Implementation Guide
                    </h2>
                    <span className="text-[10px] text-text-secondary font-mono">
                      Citations anchored directly in verified repo documentation
                    </span>
                  </div>
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
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                          [ STEP {step.number}: {step.title} ]
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed font-medium mb-3.5">
                          {step.description}
                        </p>
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
                        <h5 className="text-xs font-bold text-warning uppercase tracking-wider mb-1.5">
                          [ EDGE CASES WARNING ]
                        </h5>
                        <ul className="text-xs text-text-secondary list-disc pl-4 space-y-1 font-medium">
                          {data.fix_plan.edge_cases.map((ec, i) => (
                            <li key={i}>{ec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Sources Section Under the Plan */}
                  {sources.length > 0 && (
                    <div className="bg-surface-raised border border-border-color rounded-xl p-4 mt-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <BookOpen className="w-4 h-4 text-accent" />
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          [ Sources & Documentation Cited ]
                        </h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sources.map((s, idx) => (
                          <a
                            key={`${s.file_path}-${idx}`}
                            href={s.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface border border-accent/30 text-xs font-mono text-accent hover:bg-accent/10 transition-colors"
                          >
                            <BookmarkCheck className="w-3 h-3 mr-1.5 text-accent" />
                            <span>{s.file_path}</span>
                            <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                          </a>
                        ))}
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      }
    >
      <IssueHelperContent />
    </Suspense>
  );
}
