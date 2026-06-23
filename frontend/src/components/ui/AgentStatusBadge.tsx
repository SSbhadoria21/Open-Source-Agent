import { cn } from "@/lib/utils";

export type AgentStatus = "idle" | "running" | "done" | "error";

interface AgentStatusBadgeProps {
  name: string;
  status: AgentStatus;
  className?: string;
}

export function AgentStatusBadge({ name, status, className }: AgentStatusBadgeProps) {
  const statusConfig = {
    idle: { dot: "bg-gray-500", text: "text-gray-400" },
    running: { dot: "bg-primary animate-pulseGlow", text: "text-primary font-medium" },
    done: { dot: "bg-success shadow-[0_0_8px_#00E5A0]", text: "text-success font-medium" },
    error: { dot: "bg-critical shadow-[0_0_8px_#FF4444]", text: "text-critical font-medium" },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("inline-flex items-center space-x-2 bg-surface-raised border border-border-color rounded-full px-3 py-1 text-sm", className)}>
      <span className={cn("w-2.5 h-2.5 rounded-full", config.dot)} />
      <span className={config.text}>{name}</span>
    </div>
  );
}
