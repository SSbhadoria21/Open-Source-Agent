"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AgentStatus } from "./AgentStatusBadge";
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export interface PipelineNode {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: AgentStatus;
  time?: string;
}

interface AgentPipelineVisualizerProps {
  nodes: PipelineNode[];
  className?: string;
}

export function AgentPipelineVisualizer({ nodes, className }: AgentPipelineVisualizerProps) {
  return (
    <div className={cn("flex items-center justify-center w-full py-8 overflow-x-auto", className)}>
      {nodes.map((node, index) => {
        const isRunning = node.status === "running";
        const isDone = node.status === "done";
        const isError = node.status === "error";

        return (
          <div key={node.id} className="flex items-center">
            {/* Node */}
            <motion.div 
              className={cn(
                "relative flex flex-col items-center justify-center w-36 h-36 rounded-2xl border-2 bg-surface transition-colors",
                isRunning ? "border-primary shadow-glow" : isDone ? "border-success shadow-[0_0_15px_rgba(0,229,160,0.2)]" : isError ? "border-critical" : "border-border-color"
              )}
              animate={isRunning ? { scale: [1, 1.02, 1], boxShadow: ["0 0 8px rgba(110,86,207,0.4)", "0 0 24px rgba(110,86,207,0.8)", "0 0 8px rgba(110,86,207,0.4)"] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <div className={cn(
                "mb-2 p-3 rounded-full",
                isRunning ? "bg-primary/20 text-primary" : isDone ? "bg-success/20 text-success" : isError ? "bg-critical/20 text-critical" : "bg-surface-raised text-text-secondary"
              )}>
                {node.icon}
              </div>
              
              <span className="text-sm font-semibold text-text-primary text-center px-2">{node.name}</span>
              
              <div className="absolute -bottom-3 flex items-center bg-surface-raised border border-border-color rounded-full px-2 py-0.5 text-xs text-text-secondary">
                {isRunning && <Loader2 className="w-3 h-3 animate-spin mr-1 text-primary" />}
                {isDone && <CheckCircle2 className="w-3 h-3 mr-1 text-success" />}
                {isError && <AlertCircle className="w-3 h-3 mr-1 text-critical" />}
                {node.status === "idle" && <Clock className="w-3 h-3 mr-1" />}
                <span className="capitalize">{node.status}</span>
                {node.time && <span className="ml-1 opacity-70">({node.time})</span>}
              </div>
            </motion.div>

            {/* Arrow connecting to next node */}
            {index < nodes.length - 1 && (
              <div className="flex flex-col items-center px-4 w-24">
                <div className="w-full h-0.5 bg-border-color relative overflow-hidden">
                  {(isRunning || isDone) && (
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={isDone ? { width: "100%" } : { width: ["0%", "100%"] }}
                      transition={isDone ? { duration: 0.5 } : { repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  )}
                </div>
                <div className="w-0 h-0 border-t-4 border-t-transparent border-l-8 border-l-border-color border-b-4 border-b-transparent mt-[-5px] self-end relative right-[-4px]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
