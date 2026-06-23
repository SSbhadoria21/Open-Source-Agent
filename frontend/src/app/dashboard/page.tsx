"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GitPullRequest, Shield } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen relative overflow-hidden">
      {/* Contributor Panel */}
      <motion.div 
        className="flex-1 relative flex flex-col items-center justify-center p-12 group cursor-pointer border-r border-border-color"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(110,86,207,0.15),_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 border-2 border-primary group-hover:shadow-glow transition-all duration-300">
            <GitPullRequest className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-4xl font-heading font-bold mb-4">I'm a Contributor</h2>
          <p className="text-text-secondary text-lg mb-8">
            Get AI guidance on repos, issues, and your PRs to accelerate your open source journey.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {["Repo Orientation", "Issue Explainer", "Fix Plans", "PR Review"].map((feature) => (
              <span key={feature} className="px-4 py-1.5 bg-surface-raised border border-border-color rounded-full text-sm text-text-primary">
                {feature}
              </span>
            ))}
          </div>
          
          <Link href="/contributor/issues">
            <button className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:shadow-glow transition-all transform group-hover:-translate-y-1">
              Enter Contributor Mode
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Admin Panel */}
      <motion.div 
        className="flex-1 relative flex flex-col items-center justify-center p-12 group cursor-pointer"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,212,255,0.15),_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-8 border-2 border-secondary group-hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all duration-300">
            <Shield className="w-12 h-12 text-secondary" />
          </div>
          
          <h2 className="text-4xl font-heading font-bold mb-4">I'm a Maintainer</h2>
          <p className="text-text-secondary text-lg mb-8">
            Automate triage, labeling, matching, and health monitoring for your open source projects.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {["Auto-Triage", "Duplicate Detection", "Contributor Matching", "Health Reports"].map((feature) => (
              <span key={feature} className="px-4 py-1.5 bg-surface-raised border border-border-color rounded-full text-sm text-text-primary">
                {feature}
              </span>
            ))}
          </div>
          
          <Link href="/admin/health">
            <button className="px-8 py-4 bg-surface-raised text-secondary font-semibold rounded-lg border border-secondary hover:bg-secondary/10 hover:shadow-glow-secondary transition-all transform group-hover:-translate-y-1">
              Enter Admin Mode
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Glowing Divider OR */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden md:flex flex-col items-center z-20">
        <div className="w-[1px] h-32 bg-gradient-to-b from-transparent via-border-color to-transparent"></div>
        <div className="w-10 h-10 rounded-full bg-background border border-border-color flex items-center justify-center text-xs font-bold text-text-secondary shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          OR
        </div>
        <div className="w-[1px] h-32 bg-gradient-to-b from-border-color via-border-color to-transparent"></div>
      </div>
    </div>
  );
}
