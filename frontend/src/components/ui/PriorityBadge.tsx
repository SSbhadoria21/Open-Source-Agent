import { cn } from "@/lib/utils";

type Priority = "Low" | "Medium" | "High" | "Critical";

interface PriorityBadgeProps {
  level: Priority;
  className?: string;
}

export function PriorityBadge({ level, className }: PriorityBadgeProps) {
  const config = {
    Low: "bg-gray-500/10 text-gray-400 border-gray-500/30 shadow-[0_0_8px_rgba(156,163,175,0.2)]",
    Medium: "bg-warning/10 text-warning border-warning/30 shadow-[0_0_8px_rgba(255,184,0,0.3)]",
    High: "bg-orange-500/10 text-orange-500 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.3)]",
    Critical: "bg-critical/10 text-critical border-critical/30 shadow-[0_0_8px_rgba(255,68,68,0.4)]",
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center font-medium border rounded-full px-3 py-1 text-xs uppercase tracking-wider",
        config[level],
        className
      )}
    >
      {level}
    </span>
  );
}
