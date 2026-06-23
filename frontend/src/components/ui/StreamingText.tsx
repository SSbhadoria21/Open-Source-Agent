"use client";

import { useState, useEffect } from "react";

interface StreamingTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function StreamingText({ text, speed = 30, className = "", onComplete }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => {
        const next = text.substring(0, i + 1);
        if (i >= text.length - 1) {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
        i++;
        return next;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" style={{ verticalAlign: "middle" }} />
      )}
    </span>
  );
}
