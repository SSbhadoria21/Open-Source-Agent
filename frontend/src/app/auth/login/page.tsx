"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GitBranch, Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(110,86,207,0.15),_transparent_50%)]"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <GlassCard className="flex flex-col items-center p-10">
          <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-primary/50 flex items-center justify-center mb-8 shadow-glow animate-pulseGlow">
            <GitBranch className="w-10 h-10 text-text-primary" />
          </div>
          
          <h1 className="text-3xl font-heading font-bold mb-2 text-center">Welcome Back</h1>
          <p className="text-text-secondary text-center mb-10">Sign in to Open Source Mentee Agent to manage your contributions and repositories.</p>
          
          <Link href="/dashboard" className="w-full">
            <button className="w-full flex items-center justify-center px-6 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:-translate-y-1">
              <GitBranch className="w-5 h-5 mr-3 fill-current" />
              Continue with GitHub
            </button>
          </Link>
          
          <div className="mt-8 flex items-center justify-center text-xs text-text-secondary">
            <Lock className="w-3 h-3 mr-1" />
            <span>We only read your public profile and authorized repos.</span>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
