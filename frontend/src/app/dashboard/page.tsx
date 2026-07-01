"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("gh_username");
    if (saved) {
      router.replace("/contributor/issues");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Loading contributor workspace…</p>
      </div>
    </div>
  );
}
