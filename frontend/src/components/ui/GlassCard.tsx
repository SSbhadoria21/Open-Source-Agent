import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glowColor?: "primary" | "secondary" | "accent" | "critical" | "success";
}

export function GlassCard({ className, children, glowColor, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-surface/65 backdrop-blur-xl border border-border-color shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-6",
        glowColor === "primary" && "hover:-translate-y-1 hover:shadow-glow hover:border-primary/40",
        glowColor === "secondary" && "hover:-translate-y-1 hover:shadow-glow-secondary hover:border-secondary/40",
        glowColor === "accent" && "hover:-translate-y-1 hover:shadow-glow-accent hover:border-accent/40",
        glowColor === "critical" && "hover:-translate-y-1 hover:shadow-glow-critical hover:border-critical/40",
        glowColor === "success" && "hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,229,160,0.4)] hover:border-success/40",
        !glowColor && "hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_8px_24px_rgba(110,86,207,0.1)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
