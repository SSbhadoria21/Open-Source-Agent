"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, FileText, Settings, Play, Copy, AlertTriangle, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AgentPipelineVisualizer, PipelineNode } from "@/components/ui/AgentPipelineVisualizer";
import { StreamingText } from "@/components/ui/StreamingText";
import { DifficultyBadge } from "@/components/ui/DifficultyBadge";
import { FilePathChip } from "@/components/ui/FilePathChip";

export default function IssueHelper() {
  const [nodes, setNodes] = useState<PipelineNode[]>([
    { id: "issue", name: "Issue Agent", icon: <FileText className="w-5 h-5" />, status: "idle" },
    { id: "code", name: "Code Agent", icon: <Settings className="w-5 h-5" />, status: "idle" },
    { id: "fix", name: "Fix Agent", icon: <Play className="w-5 h-5" />, status: "idle" },
  ]);

  const [activePanel, setActivePanel] = useState<number>(0); // 0 = none, 1 = issue, 2 = code, 3 = fix

  const runAnalysis = () => {
    // Reset
    setNodes(nodes.map(n => ({ ...n, status: "idle", time: undefined })));
    setActivePanel(0);

    // Simulate Agent 1
    setTimeout(() => {
      setNodes(n => [
        { ...n[0], status: "running" },
        n[1], n[2]
      ]);
    }, 500);

    setTimeout(() => {
      setNodes(n => [
        { ...n[0], status: "done", time: "2.4s" },
        { ...n[1], status: "running" },
        n[2]
      ]);
      setActivePanel(1);
    }, 3500);

    // Simulate Agent 2
    setTimeout(() => {
      setNodes(n => [
        n[0],
        { ...n[1], status: "done", time: "8.1s" },
        { ...n[2], status: "running" }
      ]);
      setActivePanel(2);
    }, 8000);

    // Simulate Agent 3
    setTimeout(() => {
      setNodes(n => [
        n[0], n[1],
        { ...n[2], status: "done", time: "14.5s" }
      ]);
      setActivePanel(3);
    }, 15000);
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
              defaultValue="https://github.com/facebook/react"
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
              defaultValue="https://github.com/facebook/react/issues/28924"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex space-x-2">
            <button className="px-4 py-2 rounded-md bg-surface border border-border-color text-text-secondary text-sm hover:text-text-primary hover:border-primary transition-colors">
              Issue Only
            </button>
            <button className="px-4 py-2 rounded-md bg-surface border border-border-color text-text-secondary text-sm hover:text-text-primary hover:border-primary transition-colors">
              Issue + Code
            </button>
          </div>
          
          <button 
            onClick={runAnalysis}
            className="flex-1 sm:flex-none flex items-center justify-center px-8 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-lg hover:shadow-glow transition-all hover:-translate-y-0.5"
          >
            Run Full Analysis
          </button>
        </div>
      </GlassCard>

      <div className="mb-10">
        <AgentPipelineVisualizer nodes={nodes} />
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {activePanel >= 1 && (
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
                    <DifficultyBadge level="Intermediate" size="lg" />
                  </div>
                </div>
                
                <div className="text-text-primary mb-6 text-sm leading-relaxed">
                  <StreamingText text="The user is reporting an inconsistency in how `useLayoutEffect` behaves during Server-Side Rendering (SSR). React currently prints a warning when `useLayoutEffect` is used in SSR because it cannot read from the layout synchronously before the browser paints. The requested fix is to either silence this warning conditionally or provide a clearer error message guiding developers to use `useEffect` or conditionally render the component." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Affected Areas</span>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-surface-raised border border-border-color rounded-md text-sm">Server Rendering</span>
                      <span className="px-3 py-1 bg-surface-raised border border-border-color rounded-md text-sm">Hooks API</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Estimated Time</span>
                    <span className="text-sm font-bold text-text-primary">~2 hours</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activePanel >= 2 && (
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
                
                <p className="text-sm text-text-secondary mb-4">The Code Agent has traversed the AST and identified the exact files and call paths related to `useLayoutEffect` and SSR warnings.</p>

                <div className="space-y-3 mb-6">
                  {[
                    { path: "packages/react-dom/src/server/ReactDOMLegacyServerBrowser.js", reason: "Contains the warning logic for useLayoutEffect during SSR." },
                    { path: "packages/react-reconciler/src/ReactFiberHooks.js", reason: "Dispatcher mapping for hooks on the server." }
                  ].map((file, i) => (
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

          {activePanel >= 3 && (
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
                  <button className="ml-auto flex items-center space-x-2 text-sm text-text-secondary hover:text-white transition-colors bg-surface-raised px-3 py-1.5 rounded border border-border-color">
                    <Copy className="w-4 h-4" />
                    <span>Copy Plan</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-[35px] w-8 h-8 rounded-full bg-surface border-2 border-primary flex items-center justify-center text-primary font-bold text-sm">1</div>
                      <h4 className="text-md font-bold mb-2">Update the Dispatcher</h4>
                      <p className="text-sm text-text-secondary mb-3">In `ReactFiberHooks.js`, modify the `useLayoutEffect` dispatcher for the server environment to throw a specific warning or conditionally bypass if a certain config flag is passed.</p>
                      <div className="bg-[#1E1E1E] rounded-md overflow-hidden border border-border-color">
                        <div className="flex items-center px-4 py-2 bg-black/40 border-b border-border-color/50 text-xs text-text-secondary">
                          packages/react-reconciler/src/ReactFiberHooks.js
                        </div>
                        <pre className="p-4 text-xs font-mono text-[#D4D4D4] overflow-x-auto">
<span className="text-[#C586C0]">export</span> <span className="text-[#569CD6]">function</span> <span className="text-[#DCDCAA]">useLayoutEffect</span>(
  create: () <span className="text-[#569CD6]">=&gt;</span> (() <span className="text-[#569CD6]">=&gt;</span> <span className="text-[#569CD6]">void</span>) | <span className="text-[#569CD6]">void</span>,
  deps: <span className="text-[#4EC9B0]">Array</span>&lt;<span className="text-[#4EC9B0]">mixed</span>&gt; | <span className="text-[#569CD6]">void</span> | <span className="text-[#569CD6]">null</span>,
): <span className="text-[#569CD6]">void</span> {"{"}
<span className="text-[#569CD6]">  if</span> (<span className="text-[#9CDCFE]">__DEV__</span>) {"{"}
    <span className="text-[#C586C0]">if</span> (<span className="text-[#9CDCFE]">currentDispatcher</span> === <span className="text-[#9CDCFE]">ContextOnlyDispatcher</span>) {"{"}
      <span className="text-[#4FC1FF]">console</span>.<span className="text-[#DCDCAA]">error</span>(
        <span className="text-[#CE9178]">'useLayoutEffect does nothing on the server, because its effect cannot '</span> +
        <span className="text-[#CE9178]">'be encoded into the server renderer\'s output format. This will lead '</span> +
        <span className="text-[#CE9178]">'to a mismatch between the initial, non-hydrated UI and the intended UI. '</span> +
        <span className="text-[#CE9178]">'To avoid this, useLayoutEffect should only be used in components that '</span> +
        <span className="text-[#CE9178]">'render exclusively on the client. See https://reactjs.org/link/uselayouteffect-ssr'</span>
      );
    {"}"}
  {"}"}
  <span className="text-[#C586C0]">return</span> <span className="text-[#9CDCFE]">currentDispatcher</span>.<span className="text-[#DCDCAA]">useLayoutEffect</span>(create, deps);
{"}"}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-warning mb-1">Edge Cases to Consider</h5>
                      <ul className="text-sm text-text-secondary list-disc pl-4 space-y-1">
                        <li>Ensure the warning does not fire multiple times per render cycle (use a Set or global flag to deduplicate).</li>
                        <li>Check compatibility with React 18 Concurrent Server Rendering (Suspense).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
