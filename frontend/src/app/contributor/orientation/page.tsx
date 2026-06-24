"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamingText } from "@/components/ui/StreamingText";
import { FilePathChip } from "@/components/ui/FilePathChip";
import { GitBranch, ArrowRight, Folder, Loader2, CheckCircle2 } from "lucide-react";
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
    "Fetching repository tree...",
    "Reading README and manifests...",
    "Repo Agent analyzing stack...",
    "Orientation complete!"
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold mb-2">Codebase Orientation</h1>
        <p className="text-text-secondary">Enter any GitHub repository URL to get an instant AI-powered map of the architecture.</p>
      </div>

      <GlassCard className="mb-8">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GitBranch className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
              placeholder="https://github.com/facebook/react"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <button 
            onClick={startAnalysis}
            disabled={analyzing}
            className="flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all shadow-glow disabled:opacity-50 disabled:shadow-none"
          >
            {analyzing ? "Analyzing..." : "Analyze Repository"}
            {!analyzing && <ArrowRight className="w-4 h-4 ml-2" />}
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="mb-8 p-4 bg-critical/10 border border-critical/30 rounded-lg text-critical text-sm">
          <span className="font-bold">Analysis Failed:</span> {error}
        </div>
      )}

      <AnimatePresence>
        {(analyzing || complete) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8"
          >
            <div className="flex flex-col space-y-4 py-4 px-2">
              {steps.map((text, i) => {
                const stepNum = i + 1;
                const isCurrent = step === stepNum;
                const isDone = step > stepNum;
                if (step < stepNum) return null;

                return (
                  <motion.div 
                    key={text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-3"
                  >
                    {isCurrent && analyzing ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-success shadow-[0_0_8px_#00E5A0] rounded-full" />
                    )}
                    <span className={isCurrent ? "text-text-primary" : "text-text-secondary"}>{text}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {complete && data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left Column */}
            <div className="space-y-6">
              <GlassCard glowColor="primary">
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {data.tech_stack?.frontend && (
                    <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/30 rounded-md text-sm font-medium">
                      Frontend: {data.tech_stack.frontend}
                    </span>
                  )}
                  {data.tech_stack?.backend && (
                    <span className="px-3 py-1 bg-[#3178C6]/10 text-[#3178C6] border border-[#3178C6]/30 rounded-md text-sm font-medium">
                      Backend: {data.tech_stack.backend}
                    </span>
                  )}
                  {data.tech_stack?.database && (
                    <span className="px-3 py-1 bg-success/10 text-success border border-success/30 rounded-md text-sm font-medium">
                      Database: {data.tech_stack.database}
                    </span>
                  )}
                  {Object.entries(data.tech_stack || {}).map(([key, val]) => {
                    if (["frontend", "backend", "database"].includes(key)) return null;
                    return (
                      <span key={key} className="px-3 py-1 bg-surface-raised text-text-secondary border border-border-color rounded-md text-sm font-medium">
                        {key}: {val}
                      </span>
                    );
                  })}
                  {!data.tech_stack && (
                    <span className="text-sm text-text-secondary">No tech stack details identified.</span>
                  )}
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Entry Points</h3>
                <div className="space-y-2 flex flex-col items-start">
                  {data.entry_points?.map((entry) => (
                    <FilePathChip key={entry} path={entry} />
                  ))}
                  {(!data.entry_points || data.entry_points.length === 0) && (
                    <span className="text-sm text-text-secondary">No entry points identified.</span>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <GlassCard glowColor="secondary">
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Repository Summary</h3>
                <div className="text-text-secondary leading-relaxed text-sm">
                  <StreamingText 
                    text={data.summary || "No summary was provided by the repository agent."} 
                    speed={15}
                  />
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Key Directories</h3>
                <div className="space-y-3">
                  {data.key_directories?.map((dir, i) => (
                    <motion.div 
                      key={dir.path}
                      className="group flex flex-col p-2 rounded-lg hover:bg-surface-raised transition-colors cursor-default"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <div className="flex items-center space-x-2 text-primary font-mono text-sm mb-1">
                        <Folder className="w-4 h-4" />
                        <span>{dir.path}</span>
                      </div>
                      <p className="text-xs text-text-secondary pl-6">{dir.desc || dir.description || "No description provided."}</p>
                    </motion.div>
                  ))}
                  {(!data.key_directories || data.key_directories.length === 0) && (
                    <span className="text-sm text-text-secondary">No key directories identified.</span>
                  )}
                </div>
              </GlassCard>

              <div className="flex justify-end pt-4">
                <Link href="/contributor/issues">
                  <button className="flex items-center px-6 py-3 bg-transparent border border-primary text-primary font-medium rounded-lg hover:bg-primary/10 transition-all">
                    Start Working on an Issue
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
