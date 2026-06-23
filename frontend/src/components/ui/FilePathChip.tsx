"use client";

import { File, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FilePathChipProps {
  path: string;
  className?: string;
}

export function FilePathChip({ path, className }: FilePathChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extension = path.split('.').pop()?.toLowerCase();
  
  const extColors: Record<string, string> = {
    ts: "text-secondary",
    tsx: "text-secondary",
    js: "text-warning",
    jsx: "text-warning",
    py: "text-success",
    json: "text-warning",
    md: "text-primary",
  };
  
  const iconColor = extension ? extColors[extension] || "text-text-secondary" : "text-text-secondary";

  return (
    <div 
      onClick={handleCopy}
      className={cn(
        "group inline-flex items-center space-x-2 bg-surface-raised/50 hover:bg-surface-raised border border-border-color rounded-md px-2.5 py-1 text-sm font-mono cursor-pointer transition-colors",
        className
      )}
      title="Copy path"
    >
      <File className={cn("w-4 h-4", iconColor)} />
      <span className="text-text-secondary group-hover:text-text-primary transition-colors">{path}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-success ml-1" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
      )}
    </div>
  );
}
