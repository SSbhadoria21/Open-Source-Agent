"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamingText } from "@/components/ui/StreamingText";
import { FilePathChip } from "@/components/ui/FilePathChip";
import { GitBranch, ArrowRight, Folder, Loader2, CheckCircle2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisData {
  tech_stack: {
    frontend?: string;
    backend?: string;
    database?: string;
    [key: string]: any;
  };
  key_directories: Array<{ path: string; description?: string; desc?: string }>;
  entry_points: string[];
  summary: string;
}

export default function RepoOrientation() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/facebook/react");
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setComplete(false);
    setError(null);
    setData(null);
    setStep(1);

    // Animate loading steps
    const interval = setInterval(() => {
      setStep((s) => {
        if (s < 3) return s + 1;
        clearInterval(interval);
        return s;
      });
    }, 2000);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiUrl}/contributor/analyze-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl })
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error(`Failed to analyze repository. Server returned status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      } else if (result.repo_summary) {
        setData(result.repo_summary);
        setStep(4);
        setComplete(true);
      } else {
        throw new Error("No repository summary was returned by the agent.");
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "An unexpected error occurred while analyzing the repository.");
      setComplete(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const steps = [
    "Fetching codebase schema structure...",
    "Scanning manifest dependency files...",
    "Core system parsing directories...",
    "Codebase scan orientation complete!"
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col space-y-1">
        <span className="text-xs font-bold tracking-[0.25em] text-primary uppercase block mb-1 text-glow-primary">
          [ Quest: Codebase Mapping ]
        </span>
        <h1 className="text-4xl font-heading font-extrabold text-white uppercase tracking-tight">
          Codebase Orientation
        </h1>
        <p className="text-text-secondary text-sm">
          Map out the blueprints of any GitHub repository to identify main entry points and directory layout.
        </p>
      </div>

      {/* Target input */}
      <GlassCard className="border border-primary/20 shadow-glow relative overflow-hidden" glowColor="accent">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <GitBranch className="h-5 w-5 text-accent" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3.5 border border-border-color rounded-xl bg-surface/80 text-white font-mono text-sm focus:outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(224,40,204,0.15)] transition-all placeholder:text-text-secondary/40"
              placeholder="https://github.com/facebook/react"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <button 
            onClick={startAnalysis}
            disabled={analyzing}
            className="flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl transition-all shadow-glow disabled:opacity-50 disabled:shadow-none hover:shadow-[0_0_20px_rgba(224,40,204,0.4)] uppercase tracking-wider text-sm border border-accent/20"
          >
            {analyzing ? (
              <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Orienting...</span>
            ) : (
              <>
                Scan Codebase
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </GlassCard>

      {/* Error Output */}
      {error && (
        <div className="p-4 bg-critical/10 border border-critical/30 rounded-xl text-critical text-sm flex items-start gap-2.5 shadow-[0_0_15px_rgba(255,68,68,0.1)]">
          <Shield className="w-5 h-5 flex-shrink-0 text-critical" />
          <div>
            <span className="font-extrabold uppercase tracking-wider block mb-0.5">SCAN PROTOCOL FAILURE</span>
            <p className="text-text-primary">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Checklist */}
      <AnimatePresence>
        {(analyzing || complete) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-surface/50 border border-border-color rounded-xl p-5"
          >
            <span className="text-[10px] font-bold font-mono text-accent uppercase tracking-widest block mb-4">[ Calibration Progress ]</span>
            <div className="flex flex-col space-y-3 pl-1">
              {steps.map((text, i) => {
                const stepNum = i + 1;
                const isCurrent = step === stepNum;
                const isDone = step > stepNum;
                if (step < stepNum) return null;

                return (
                  <motion.div 
                    key={text}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-3 text-sm font-mono"
                  >
                    {isCurrent && analyzing ? (
                      <Loader2 className="w-4.5 h-4.5 text-accent animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4.5 h-4.5 text-success shadow-[0_0_8px_#00E5A0] rounded-full" />
                    )}
                    <span className={isCurrent ? "text-white font-bold" : "text-text-secondary"}>
                      {text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Grid Results */}
      <AnimatePresence>
        {complete && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left Column */}
            <div className="space-y-6">
              {/* Tech Stack */}
              <GlassCard glowColor="primary" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-white mb-4 border-b border-primary/20 pb-2.5">
                  [ System Tech Stack ]
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {data.tech_stack?.frontend && (
                    <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/30 rounded-lg text-xs font-bold font-mono uppercase">
                      FRONTEND: {data.tech_stack.frontend}
                    </span>
                  )}
                  {data.tech_stack?.backend && (
                    <span className="px-3 py-1.5 bg-[#3178C6]/10 text-[#3178C6] border border-[#3178C6]/30 rounded-lg text-xs font-bold font-mono uppercase">
                      BACKEND: {data.tech_stack.backend}
                    </span>
                  )}
                  {data.tech_stack?.database && (
                    <span className="px-3 py-1.5 bg-success/10 text-success border border-success/30 rounded-lg text-xs font-bold font-mono uppercase">
                      DATABASE: {data.tech_stack.database}
                    </span>
                  )}
                  {Object.entries(data.tech_stack || {}).map(([key, val]) => {
                    if (["frontend", "backend", "database"].includes(key)) return null;
                    return (
                      <span key={key} className="px-3 py-1.5 bg-surface-raised text-text-secondary border border-border-color rounded-lg text-xs font-bold font-mono uppercase">
                        {key}: {val}
                      </span>
                    );
                  })}
                  {!data.tech_stack && (
                    <span className="text-xs text-text-secondary">No tech stack details identified.</span>
                  )}
                </div>
              </GlassCard>

              {/* Entry Points */}
              <GlassCard className="relative" glowColor="accent">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent" />
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-white mb-4 border-b border-accent/20 pb-2.5">
                  [ Main Entry Files ]
                </h3>
                <div className="space-y-2.5 flex flex-col items-start">
                  {data.entry_points?.map((entry) => (
                    <FilePathChip key={entry} path={entry} />
                  ))}
                  {(!data.entry_points || data.entry_points.length === 0) && (
                    <span className="text-xs text-text-secondary">No entry points identified.</span>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Summary */}
              <GlassCard glowColor="secondary" className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-secondary" />
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-white mb-4 border-b border-secondary/20 pb-2.5">
                  [ AI Core Summary ]
                </h3>
                <div className="text-text-secondary leading-relaxed text-sm font-medium">
                  <StreamingText 
                    text={data.summary || "No summary was provided by the repository agent."} 
                    speed={15}
                  />
                </div>
              </GlassCard>

              {/* Key Directories */}
              <GlassCard className="relative">
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-white mb-4 border-b border-primary/20 pb-2.5">
                  [ Key Directories ]
                </h3>
                <div className="space-y-3">
                  {data.key_directories?.map((dir, i) => (
                    <motion.div 
                      key={dir.path}
                      className="group flex flex-col p-2.5 rounded-xl hover:bg-surface-raised border border-transparent hover:border-primary/25 transition-all cursor-default"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                    >
                      <div className="flex items-center space-x-2 text-primary font-mono text-xs font-bold mb-1">
                        <Folder className="w-4 h-4 text-accent" />
                        <span className="group-hover:text-accent transition-colors">{dir.path}</span>
                      </div>
                      <p className="text-xs text-text-secondary pl-6 leading-relaxed">{dir.desc || dir.description || "No description provided."}</p>
                    </motion.div>
                  ))}
                  {(!data.key_directories || data.key_directories.length === 0) && (
                    <span className="text-xs text-text-secondary">No key directories identified.</span>
                  )}
                </div>
              </GlassCard>

              <div className="flex justify-end pt-4">
                <Link href="/contributor/issues">
                  <button className="flex items-center px-6 py-3 bg-transparent border border-accent text-accent font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-accent/10 transition-all shadow-glow-accent">
                    Select Active Issue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
