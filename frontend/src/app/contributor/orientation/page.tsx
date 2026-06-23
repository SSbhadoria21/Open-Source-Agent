"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamingText } from "@/components/ui/StreamingText";
import { FilePathChip } from "@/components/ui/FilePathChip";
import { GitBranch, ArrowRight, Folder, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RepoOrientation() {
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);

  const startAnalysis = () => {
    setAnalyzing(true);
    setComplete(false);
    setStep(1);
    setTimeout(() => setStep(2), 2000);
    setTimeout(() => setStep(3), 4000);
    setTimeout(() => {
      setStep(4);
      setComplete(true);
      setAnalyzing(false);
    }, 6500);
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
              defaultValue="https://github.com/facebook/react"
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
                    {isCurrent ? (
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
        {complete && (
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
                  <span className="px-3 py-1 bg-[#61DAFB]/10 text-[#61DAFB] border border-[#61DAFB]/30 rounded-md text-sm font-medium">React</span>
                  <span className="px-3 py-1 bg-[#3178C6]/10 text-[#3178C6] border border-[#3178C6]/30 rounded-md text-sm font-medium">TypeScript</span>
                  <span className="px-3 py-1 bg-[#F7DF1E]/10 text-[#F7DF1E] border border-[#F7DF1E]/30 rounded-md text-sm font-medium">JavaScript</span>
                  <span className="px-3 py-1 bg-[#DD0031]/10 text-[#DD0031] border border-[#DD0031]/30 rounded-md text-sm font-medium">Jest</span>
                  <span className="px-3 py-1 bg-surface-raised text-text-secondary border border-border-color rounded-md text-sm font-medium">Yarn workspaces</span>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Entry Points</h3>
                <div className="space-y-2 flex flex-col items-start">
                  <FilePathChip path="packages/react/index.js" />
                  <FilePathChip path="packages/react-dom/index.js" />
                  <FilePathChip path="scripts/build.js" />
                  <FilePathChip path="packages/react-reconciler/src/ReactFiber.js" />
                </div>
              </GlassCard>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <GlassCard glowColor="secondary">
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Repository Summary</h3>
                <div className="text-text-secondary leading-relaxed text-sm">
                  <StreamingText 
                    text="React is a declarative, efficient, and flexible JavaScript library for building user interfaces. The codebase is organized as a monorepo using Yarn workspaces. The core reconciliation logic lives in `packages/react-reconciler`, while platform-specific renderers like DOM and Native are separated into their respective packages. The repository uses Flow and Flow-types heavily, though it's transitioning in some areas. The build process uses a custom Rollup setup defined in the `scripts/` directory." 
                    speed={15}
                  />
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="text-lg font-bold font-heading mb-4 border-b border-border-color pb-2">Key Directories</h3>
                <div className="space-y-3">
                  {[
                    { path: "packages/react", desc: "Core React API (hooks, components, context)." },
                    { path: "packages/react-dom", desc: "DOM renderer for browser environments." },
                    { path: "packages/react-reconciler", desc: "The core React Fiber algorithm." },
                    { path: "scripts", desc: "Build tools, release scripts, and CI configurations." }
                  ].map((dir, i) => (
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
                      <p className="text-xs text-text-secondary pl-6">{dir.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>

              <div className="flex justify-end pt-4">
                <button className="flex items-center px-6 py-3 bg-transparent border border-primary text-primary font-medium rounded-lg hover:bg-primary/10 transition-all">
                  Start Working on an Issue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
