import { cn } from "@/lib/utils";

interface SimilarityGaugeProps {
  score: number; // 0 to 100
  className?: string;
}

export function SimilarityGauge({ score, className }: SimilarityGaugeProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-success";
  if (score >= 50 && score < 80) colorClass = "text-warning";
  if (score >= 80) colorClass = "text-critical";

  return (
    <div className={cn("relative flex items-center justify-center w-24 h-24", className)}>
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-surface-raised"
        />
        {/* Progress circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", colorClass)}
        />
      </svg>
      {/* Score text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-xl font-bold font-heading", colorClass)}>{score}%</span>
      </div>
    </div>
  );
}
