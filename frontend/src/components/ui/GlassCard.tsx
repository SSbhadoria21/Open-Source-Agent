import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glowColor?: "primary" | "secondary";
}

export function GlassCard({ className, children, glowColor, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-surface/80 backdrop-blur-md border border-border-color shadow-sm transition-all duration-300 rounded-xl p-6",
        glowColor === "primary" && "hover:-translate-y-1 hover:shadow-glow",
        glowColor === "secondary" && "hover:-translate-y-1 hover:shadow-glow-secondary",
        !glowColor && "hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
