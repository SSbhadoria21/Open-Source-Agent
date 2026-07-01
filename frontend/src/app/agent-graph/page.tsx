"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Network, Play, CheckCircle2, FileText
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

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
  { id: "orch", label: "Orchestrator", icon: Network, x: 50, y: 50, color: "primary", type: "orchestrator", description: "LangGraph router — dispatches to sub-agents based on contributor intent" },

  { id: "repo", label: "Repo Agent", icon: Network, x: 20, y: 25, color: "success", type: "contributor", description: "Analyzes file tree and README to orient the contributor in any codebase" },
  { id: "issue", label: "Issue Agent", icon: FileText, x: 20, y: 45, color: "success", type: "contributor", description: "Fetches and simplifies GitHub issues; classifies difficulty and estimated hours" },
  { id: "code", label: "Code Agent", icon: Network, x: 20, y: 65, color: "success", type: "contributor", description: "Nominates affected files and extracts call graph from real source code" },
  { id: "fix", label: "Fix Agent", icon: Play, x: 35, y: 82, color: "success", type: "contributor", description: "Generates step-by-step implementation plan from real file contents" },
  { id: "review", label: "Review Agent", icon: CheckCircle2, x: 35, y: 18, color: "success", type: "contributor", description: "Reviews PR diffs and provides actionable, categorized feedback before submission" },
];

const getColorClass = (color: string, type: 'border' | 'bg' | 'text' | 'shadow') => {
  if (color === 'primary') return type === 'border' ? 'border-primary' : type === 'bg' ? 'bg-primary' : type === 'text' ? 'text-primary' : 'shadow-[0_0_20px_rgba(110,86,207,0.6)]';
  if (color === 'secondary') return type === 'border' ? 'border-secondary' : type === 'bg' ? 'bg-secondary' : type === 'text' ? 'text-secondary' : 'shadow-[0_0_20px_rgba(0,212,255,0.6)]';
  if (color === 'success') return type === 'border' ? 'border-success' : type === 'bg' ? 'bg-success' : type === 'text' ? 'text-success' : 'shadow-[0_0_20px_rgba(0,229,160,0.6)]';
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
    <div className="h-screen w-full bg-background relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-center pointer-events-none">
        <div>
          <h1 className="text-2xl font-heading font-bold">Agent Architecture Overview</h1>
          <p className="text-text-secondary text-sm">LangGraph multi-agent system — click any node to inspect its role</p>
        </div>

        <div className="flex gap-4 pointer-events-auto items-center">
          <span className="px-3 py-1 rounded-full text-xs border border-warning/40 bg-warning/10 text-warning font-medium">
            Static Architecture Diagram
          </span>
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-success"></span> Contributor Agents
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
                stroke={`rgba(${node.color === 'success' ? '0,229,160' : '110,86,207'}, 0.25)`}
                strokeWidth={activeNode === node.id ? 3 : 1.5}
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
              whileHover={{ scale: 1.1 }}
            >
              <div className="relative flex flex-col items-center group">
                <div className={`
                  ${isOrch ? 'w-24 h-24' : 'w-16 h-16'}
                  rounded-full bg-surface border-2 flex items-center justify-center
                  ${getColorClass(node.color, 'border')}
                  ${isActive ? getColorClass(node.color, 'shadow') : ''}
                  transition-all duration-300
                `}>
                  <Icon className={`${isOrch ? 'w-10 h-10' : 'w-6 h-6'} ${getColorClass(node.color, 'text')}`} />
                </div>

                <div className="mt-2 text-center bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border border-border-color">
                  <span className="text-xs font-bold text-text-primary block whitespace-nowrap">{node.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Node Detail Panel */}
      {activeNodeData && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-6 right-6 w-80 z-30"
        >
          <GlassCard>
            <div className="flex items-center mb-3">
              <div className={`p-2 rounded-lg mr-3 bg-${activeNodeData.color}/10`}>
                <activeNodeData.icon className={`w-5 h-5 ${getColorClass(activeNodeData.color, 'text')}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">{activeNodeData.label}</h3>
                <span className={`text-xs capitalize ${getColorClass(activeNodeData.color, 'text')}`}>
                  {activeNodeData.type} agent
                </span>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {activeNodeData.description}
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Instructions when nothing selected */}
      {!activeNode && (
        <div className="absolute bottom-6 right-6 z-30">
          <GlassCard className="text-xs text-text-secondary w-64">
            Click any agent node to see its description.
          </GlassCard>
        </div>
      )}
    </div>
  );
}
