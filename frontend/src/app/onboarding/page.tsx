"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, ArrowRight, CheckCircle, Loader2, AlertCircle, Star, Users, ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [entering, setEntering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUsername(username.trim()), 500);
    return () => clearTimeout(t);
  }, [username]);

  // Fetch GitHub profile
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 1) {
      setProfile(null);
      setStatus("idle");
      return;
    }

    const validate = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(debouncedUsername);
    if (!validate) {
      setStatus("error");
      setErrorMsg("Invalid GitHub username format.");
      setProfile(null);
      return;
    }

    setStatus("loading");
    setProfile(null);

    fetch(`https://api.github.com/users/${debouncedUsername}`)
      .then((r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((data: GitHubProfile) => {
        setProfile(data);
        setStatus("found");
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg(`GitHub user "${debouncedUsername}" not found.`);
      });
  }, [debouncedUsername]);

  const handleEnter = () => {
    if (status !== "found" || !profile) return;
    setEntering(true);
    localStorage.setItem("gh_username", profile.login);
    localStorage.setItem("gh_profile", JSON.stringify(profile));
    setTimeout(() => router.push("/contributor/issues"), 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEnter();
  };

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-[#05050A] flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Grid Pattern & Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151525_1px,transparent_1px),linear-gradient(to_bottom,#151525_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Cybernetic HUD Frame borders */}
      <div className="absolute inset-8 border border-primary/5 pointer-events-none rounded-3xl" />
      <div className="absolute inset-12 border border-accent/5 pointer-events-none rounded-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-surface-raised border border-primary/40 flex items-center justify-center mx-auto mb-6 shadow-glow relative group"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            <GitBranch className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-300" />
          </motion.div>

          <span className="text-xs font-bold tracking-[0.25em] text-accent uppercase block mb-2 text-glow-accent">
            [ System Access Request ]
          </span>
          <h1 className="text-4xl font-heading font-extrabold mb-3 text-white uppercase tracking-tight">
            Register Hunter ID
          </h1>
          <p className="text-text-secondary text-sm max-w-sm mx-auto">
            Input your GitHub username to synchronize your public record and calibrate the Mentee System.
          </p>
        </div>

        {/* Input Card */}
        <GlassCard className="border border-primary/20 shadow-[0_0_40px_rgba(110,86,207,0.15)] overflow-hidden relative" glowColor="accent">
          {/* Cyber accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-accent" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-accent" />

          {/* Input field */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="text-accent/60 font-mono text-sm font-bold">github.com /</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="your-username"
              className="w-full bg-surface/85 border border-border-color rounded-xl pl-[120px] pr-12 py-4 text-white font-mono text-sm outline-none focus:border-accent focus:shadow-[0_0_15px_rgba(224,40,204,0.25)] transition-all placeholder:text-text-secondary/40"
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              {status === "loading" && (
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              )}
              {status === "found" && (
                <CheckCircle className="w-5 h-5 text-success shadow-[0_0_8px_#00E5A0]" />
              )}
              {status === "error" && (
                <ShieldAlert className="w-5 h-5 text-critical shadow-[0_0_8px_#FF4444]" />
              )}
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-critical/10 border border-critical/30 rounded-xl p-3 mb-5 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-critical mt-0.5 flex-shrink-0" />
                <span className="text-xs text-critical font-medium">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hunter Profile Preview */}
          <AnimatePresence>
            {status === "found" && profile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-6 p-4 bg-surface/80 border border-success/30 rounded-xl flex items-center gap-4 relative overflow-hidden"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-success" />
                <img
                  src={profile.avatar_url}
                  alt={profile.login}
                  className="w-14 h-14 rounded-full border-2 border-accent object-cover flex-shrink-0 shadow-[0_0_12px_rgba(224,40,204,0.3)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-white text-base truncate uppercase tracking-tight">
                    {profile.name || profile.login}
                  </p>
                  <p className="text-xs font-mono text-accent">@{profile.login}</p>
                  {profile.bio && (
                    <p className="text-xs text-text-secondary mt-1.5 line-clamp-1 italic">"{profile.bio}"</p>
                  )}
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-text-secondary font-medium">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-warning" />
                      <span className="text-text-primary">{profile.public_repos}</span> repos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span className="text-text-primary">{profile.followers}</span> followers
                    </span>
                  </div>
                </div>
                <div className="bg-success/15 text-success text-[10px] font-bold tracking-widest uppercase border border-success/30 px-2 py-1 rounded">
                  VERIFIED
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA Button */}
          <motion.button
            onClick={handleEnter}
            disabled={status !== "found" || entering}
            whileHover={status === "found" ? { scale: 1.02 } : {}}
            whileTap={status === "found" ? { scale: 0.98 } : {}}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300 uppercase tracking-wider text-sm ${
              status === "found" && !entering
                ? "bg-gradient-to-r from-primary via-accent to-secondary text-white shadow-glow hover:shadow-[0_0_25px_rgba(224,40,204,0.6)] cursor-pointer"
                : "bg-surface/50 text-text-secondary border border-border-color cursor-not-allowed"
            }`}
          >
            {entering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Synchronizing System Data…
              </>
            ) : (
              <>
                Initialize System Calibration
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-xs text-text-secondary mt-6 font-medium">
          Secure public mapping.{" "}
          <span className="text-accent text-glow-accent">No access token or authorization required.</span>
        </p>
      </motion.div>
    </div>
  );
}
