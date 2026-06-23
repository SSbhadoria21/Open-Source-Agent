import { cn } from "@/lib/utils";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

interface DifficultyBadgeProps {
  level: Difficulty;
  size?: "sm" | "lg";
  className?: string;
}

export function DifficultyBadge({ level, size = "sm", className }: DifficultyBadgeProps) {
  const config = {
    Beginner: "bg-success/10 text-success border-success/30",
    Intermediate: "bg-warning/10 text-warning border-warning/30",
    Advanced: "bg-critical/10 text-critical border-critical/30",
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center font-medium border rounded-full",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-4 py-1 text-sm",
        config[level],
        className
      )}
    >
      {level}
    </span>
  );
}
