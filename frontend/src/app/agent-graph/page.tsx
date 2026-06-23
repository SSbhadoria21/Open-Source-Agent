"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Network, Play, CheckCircle2, AlertTriangle, Shield, Copy, Tag, Users, Activity, FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

interface NodeData {
  id: string;
  label: string;
  icon: any;
  x: number;
  y: number;
  color: string;
  status: "idle" | "running" | "done";
  latency?: string;
  type: "orchestrator" | "contributor" | "admin";
}

export default function AgentGraphVisualizer() {
  const [mounted, setMounted] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [logs, setLogs] = useState<{id: number, text: string, time: string, color: string}[]>([]);
  
  useEffect(() => {
    setMounted(true);
    
    // Simulate streaming logs
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev];
        if (newLogs.length > 8) newLogs.shift();
        
        const events = [
          { text: "[Orchestrator] Routing request to Triage Agent", color: "text-primary" },
          { text: "[Triage Agent] Analyzed issue #1042. Confidence: 94%", color: "text-secondary" },
          { text: "[Code Agent] Built AST map for src/components in 2.4s", color: "text-success" },
          { text: "[Fix Agent] Generated implementation plan", color: "text-success" },
          { text: "[Duplicate Agent] Found 2 potential duplicates", color: "text-warning" },
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        const time = new Date().toISOString().split('T')[1].substring(0, 8);
        
        newLogs.push({ id: Date.now(), text: event.text, time, color: event.color });
        return newLogs;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const nodes: NodeData[] = [
    { id: "orch", label: "Orchestrator", icon: Network, x: 50, y: 50, color: "primary", status: "running", latency: "12ms", type: "orchestrator" },
    
    { id: "repo", label: "Repo Agent", icon: Network, x: 20, y: 30, color: "success", status: "done", latency: "1.2s", type: "contributor" },
    { id: "issue", label: "Issue Agent", icon: FileText, x: 20, y: 50, color: "success", status: "idle", type: "contributor" },
    { id: "code", label: "Code Agent", icon: Network, x: 20, y: 70, color: "success", status: "running", latency: "3.4s", type: "contributor" },
    { id: "fix", label: "Fix Agent", icon: Play, x: 35, y: 85, color: "success", status: "idle", type: "contributor" },
    { id: "review_c", label: "Review Agent", icon: CheckCircle2, x: 35, y: 15, color: "success", status: "idle", type: "contributor" },
    
    { id: "triage", label: "Triage Agent", icon: AlertTriangle, x: 80, y: 30, color: "secondary", status: "done", latency: "450ms", type: "admin" },
    { id: "dup", label: "Duplicate Agent", icon: Copy, x: 80, y: 50, color: "secondary", status: "running", latency: "1.1s", type: "admin" },
    { id: "label", label: "Label Agent", icon: Tag, x: 80, y: 70, color: "secondary", status: "idle", type: "admin" },
    { id: "match", label: "Match Agent", icon: Users, x: 65, y: 85, color: "secondary", status: "idle", type: "admin" },
    { id: "health", label: "Health Agent", icon: Activity, x: 65, y: 15, color: "secondary", status: "idle", type: "admin" },
    { id: "review_a", label: "Review Agent", icon: Shield, x: 95, y: 50, color: "secondary", status: "idle", type: "admin" },
  ];

  const getColorClass = (color: string, type: 'border' | 'bg' | 'text' | 'shadow') => {
    if (color === 'primary') return type === 'border' ? 'border-primary' : type === 'bg' ? 'bg-primary' : type === 'text' ? 'text-primary' : 'shadow-[0_0_20px_rgba(110,86,207,0.6)]';
    if (color === 'secondary') return type === 'border' ? 'border-secondary' : type === 'bg' ? 'bg-secondary' : type === 'text' ? 'text-secondary' : 'shadow-[0_0_20px_rgba(0,212,255,0.6)]';
    if (color === 'success') return type === 'border' ? 'border-success' : type === 'bg' ? 'bg-success' : type === 'text' ? 'text-success' : 'shadow-[0_0_20px_rgba(0,229,160,0.6)]';
    return '';
  };

  return (
    <div className="h-screen w-full bg-background relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-30 flex justify-between items-center pointer-events-none">
        <div>
          <h1 className="text-2xl font-heading font-bold">LangGraph Live Visualizer</h1>
          <p className="text-text-secondary text-sm">Real-time state and metrics of the agent constellation</p>
        </div>
        
        <div className="flex gap-4 pointer-events-auto">
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-success"></span> Contributor Agents
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-secondary"></span> Admin Agents
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {nodes.filter(n => n.id !== "orch").map((node) => {
            const isRunning = node.status === "running" || (nodes[0].status === "running" && Math.random() > 0.5);
            return (
              <g key={`edge-${node.id}`}>
                <line 
                  x1="50%" y1="50%" 
                  x2={`${node.x}%`} y2={`${node.y}%`} 
                  stroke={`rgba(${node.color === 'secondary' ? '0,212,255' : node.color === 'success' ? '0,229,160' : '110,86,207'}, 0.2)`} 
                  strokeWidth={2}
                />
                {isRunning && (
                  <line 
                    x1="50%" y1="50%" 
                    x2={`${node.x}%`} y2={`${node.y}%`} 
                    stroke={`rgba(${node.color === 'secondary' ? '0,212,255' : node.color === 'success' ? '0,229,160' : '110,86,207'}, 0.8)`} 
                    strokeWidth={3}
                    strokeDasharray="10, 20"
                    className="animate-travel"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const Icon = node.icon;
          const isOrch = node.type === "orchestrator";
          const isRunning = node.status === "running";
          
          return (
            <motion.div
              key={node.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => setActiveNode(node.id)}
              whileHover={{ scale: 1.1 }}
            >
              <div className={`relative flex flex-col items-center group`}>
                {/* Status Indicator Ring */}
                {isRunning && (
                  <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-${node.color} animate-spin w-full h-full scale-125`}></div>
                )}
                
                <div className={`
                  ${isOrch ? 'w-24 h-24' : 'w-16 h-16'} 
                  rounded-full bg-surface border-2 flex items-center justify-center
                  ${getColorClass(node.color, 'border')}
                  ${isRunning ? getColorClass(node.color, 'shadow') : ''}
                  transition-all duration-300
                `}>
                  <Icon className={`${isOrch ? 'w-10 h-10' : 'w-6 h-6'} ${getColorClass(node.color, 'text')}`} />
                </div>
                
                <div className="mt-2 text-center bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border border-border-color">
                  <span className="text-xs font-bold text-text-primary block whitespace-nowrap">{node.label}</span>
                  {node.latency && <span className={`text-[10px] ${getColorClass(node.color, 'text')}`}>{node.latency}</span>}
                </div>
                
                {/* Hover Details */}
                <div className="absolute top-full mt-8 opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-border-color p-3 rounded-lg w-48 pointer-events-none z-50">
                  <div className="text-xs text-text-secondary mb-1">Status: <span className="text-text-primary capitalize">{node.status}</span></div>
                  <div className="text-xs text-text-secondary">Invocations today: <span className="text-text-primary">{Math.floor(Math.random() * 1000)}</span></div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Logs Panel */}
      <GlassCard className="absolute bottom-6 right-6 w-96 max-h-64 overflow-hidden flex flex-col z-30 p-4">
        <div className="flex items-center justify-between border-b border-border-color mb-3 pb-2">
          <h3 className="text-sm font-bold font-mono text-text-primary">System Logs</h3>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 pr-2">
          {logs.map((log) => (
            <div key={log.id} className="animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-text-secondary mr-2">[{log.time}]</span>
              <span className={log.color}>{log.text}</span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-text-secondary">Waiting for events...</div>}
        </div>
      </GlassCard>
    </div>
  );
}
