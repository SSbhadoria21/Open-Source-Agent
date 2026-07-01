"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Network, Play, CheckCircle2, FileText, ArrowLeft, ShieldAlert
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import Link from "next/link";

interface NodeData {
  id: string;
  label: string;
  icon: any;
  x: number;
  y: number;
  color: string;
  type: "orchestrator" | "contributor";
  description: string;
}

const nodes: NodeData[] = [
  { id: "orch", label: "Orchestrator Core", icon: Network, x: 50, y: 50, color: "primary", type: "orchestrator", description: "LangGraph Router — dispatches user requests, coordinates execution states, and manages system state transitions." },
  { id: "repo", label: "Repo Agent", icon: Network, x: 25, y: 25, color: "success", type: "contributor", description: "Blueprints Codebases — analyzes directory structures, files, and packages to orient developers." },
  { id: "issue", label: "Issue Agent", icon: FileText, x: 25, y: 55, color: "success", type: "contributor", description: "Parses Issues — retrieves active GitHub issues, details requirements in plain english, and estimates complexity." },
  { id: "code", label: "Code Agent", icon: Network, x: 25, y: 78, color: "success", type: "contributor", description: "Maps Flows — traces function definitions, code dependencies, and identifies exactly which files require edits." },
  { id: "fix", label: "Fix Agent", icon: Play, x: 75, y: 75, color: "secondary", type: "contributor", description: "Executes Corrections — writes step-by-step implementation plans and suggested code snippets." },
  { id: "review", label: "Review Agent", icon: CheckCircle2, x: 75, y: 35, color: "secondary", type: "contributor", description: "Audits Branches — runs deep diagnostic validation on PRs for security, style, and bug checks before commits." },
];

const getColorClass = (color: string, type: 'border' | 'bg' | 'text' | 'shadow') => {
  if (color === 'primary') return type === 'border' ? 'border-primary' : type === 'bg' ? 'bg-primary' : type === 'text' ? 'text-primary' : 'shadow-[0_0_25px_rgba(110,86,207,0.7)]';
  if (color === 'secondary') return type === 'border' ? 'border-secondary' : type === 'bg' ? 'bg-secondary' : type === 'text' ? 'text-secondary' : 'shadow-[0_0_25px_rgba(0,212,255,0.7)]';
  if (color === 'success') return type === 'border' ? 'border-success' : type === 'bg' ? 'bg-success' : type === 'text' ? 'text-success' : 'shadow-[0_0_25px_rgba(0,229,160,0.7)]';
  return '';
};

export default function AgentGraphVisualizer() {
  const [mounted, setMounted] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const activeNodeData = nodes.find(n => n.id === activeNode);

  return (
    <div className="h-screen w-full bg-[#05050A] relative overflow-hidden flex flex-col">
      {/* Background Grids and Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151525_1px,transparent_1px),linear-gradient(to_bottom,#151525_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Cybernetic HUD Frame borders */}
      <div className="absolute inset-6 border border-primary/5 pointer-events-none rounded-3xl" />

      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-8 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/contributor" className="inline-flex items-center text-xs font-bold font-mono text-text-secondary hover:text-accent mb-3 uppercase tracking-wider transition-all">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Link>
          <span className="text-xs font-bold tracking-[0.25em] text-accent uppercase block mb-1 text-glow-accent">
            [ Neural System Map ]
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-white uppercase tracking-tight">Agent Architecture</h1>
          <p className="text-text-secondary text-xs">Visualizing the network of LangGraph processors. Click any node to inspect.</p>
        </div>

        <div className="flex gap-4 pointer-events-auto items-center">
          <span className="px-3.5 py-1.5 rounded-lg text-[10px] font-bold font-mono border border-accent/20 bg-accent/5 text-accent uppercase tracking-wider">
            [ CALIBRATED GRID ]
          </span>
          <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-text-secondary uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#00E5A0]"></span>
            <span>6 Systems Online</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {nodes.filter(n => n.id !== "orch").map((node) => (
            <g key={`edge-${node.id}`}>
              <line
                x1="50%" y1="50%"
                x2={`${node.x}%`} y2={`${node.y}%`}
                stroke={`rgba(${node.color === 'success' ? '0,229,160' : node.color === 'secondary' ? '0,212,255' : '110,86,207'}, ${activeNode === node.id ? 0.6 : 0.25})`}
                strokeWidth={activeNode === node.id ? 3 : 1.5}
                className={activeNode === node.id ? "animate-pulse" : ""}
              />
            </g>
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const Icon = node.icon;
          const isOrch = node.type === "orchestrator";
          const isActive = activeNode === node.id;

          return (
            <motion.div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => setActiveNode(isActive ? null : node.id)}
              whileHover={{ scale: 1.08 }}
            >
              <div className="relative flex flex-col items-center group">
                <div className={`
                  ${isOrch ? 'w-24 h-24' : 'w-16 h-16'}
                  rounded-full bg-surface border-2 flex items-center justify-center
                  ${getColorClass(node.color, 'border')}
                  ${isActive ? getColorClass(node.color, 'shadow') : 'shadow-[0_0_12px_rgba(0,0,0,0.4)]'}
                  transition-all duration-300
                `}>
                  <Icon className={`${isOrch ? 'w-10 h-10' : 'w-6 h-6'} ${getColorClass(node.color, 'text')}`} />
                </div>

                <div className="mt-2.5 text-center bg-surface-raised/95 backdrop-blur-sm px-3 py-1 rounded-lg border border-border-color shadow-md">
                  <span className="text-[10px] font-bold font-mono text-text-primary uppercase tracking-wider block whitespace-nowrap">{node.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Node Detail Panel */}
      {activeNodeData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-10 right-10 w-80 z-30"
        >
          <GlassCard className="relative overflow-hidden border border-accent/20" glowColor="accent">
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent" />
            
            <div className="flex items-center mb-3">
              <div className={`p-2 rounded-lg mr-3 bg-surface border border-border-color`}>
                <activeNodeData.icon className={`w-5 h-5 ${getColorClass(activeNodeData.color, 'text')}`} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">{activeNodeData.label}</h3>
                <span className={`text-[10px] font-bold font-mono uppercase ${getColorClass(activeNodeData.color, 'text')}`}>
                  {activeNodeData.type} Node
                </span>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              {activeNodeData.description}
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Instructions when nothing selected */}
      {!activeNode && (
        <div className="absolute bottom-10 right-10 z-30">
          <GlassCard className="text-[10px] font-mono font-bold tracking-wider text-text-secondary uppercase w-64 border border-primary/20 text-center">
            [ Select Node to Inspect Architecture ]
          </GlassCard>
        </div>
      )}
    </div>
  );
}
