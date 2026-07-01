"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, ArrowRight, CheckCircle, Loader2, AlertCircle, Star, GitFork, Users } from "lucide-react";

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
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-surface-raised border border-primary/30 flex items-center justify-center mx-auto mb-6 shadow-glow"
          >
            <GitBranch className="w-8 h-8 text-primary" />
          </motion.div>

          <h1 className="text-3xl font-heading font-bold mb-2">
            Who are you on GitHub?
          </h1>
          <p className="text-text-secondary">
            Enter your GitHub username to personalize your contributor workspace.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-surface-raised border border-border-color rounded-2xl p-8 shadow-[0_0_40px_rgba(110,86,207,0.08)]">
          {/* Input */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="text-text-secondary font-mono text-sm">github.com /</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="your-username"
              className="w-full bg-surface border border-border-color rounded-xl pl-[120px] pr-12 py-4 text-text-primary font-mono text-sm outline-none focus:border-primary transition-colors placeholder:text-text-secondary/40"
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              {status === "loading" && (
                <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
              )}
              {status === "found" && (
                <CheckCircle className="w-4 h-4 text-success" />
              )}
              {status === "error" && (
                <AlertCircle className="w-4 h-4 text-critical" />
              )}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {status === "error" && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-critical mb-4 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Profile Preview */}
          <AnimatePresence>
            {status === "found" && profile && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-6 p-4 bg-surface border border-success/20 rounded-xl flex items-center gap-4"
              >
                <img
                  src={profile.avatar_url}
                  alt={profile.login}
                  className="w-14 h-14 rounded-full border-2 border-primary/40 object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary truncate">{profile.name || profile.login}</p>
                  <p className="text-xs text-text-secondary truncate">@{profile.login}</p>
                  {profile.bio && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-1">{profile.bio}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning" />
                      {profile.public_repos} repos
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-primary" />
                      {profile.followers} followers
                    </span>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA Button */}
          <motion.button
            onClick={handleEnter}
            disabled={status !== "found" || entering}
            whileHover={status === "found" ? { scale: 1.02 } : {}}
            whileTap={status === "found" ? { scale: 0.98 } : {}}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 ${
              status === "found" && !entering
                ? "bg-primary text-white shadow-glow hover:bg-primary/90 cursor-pointer"
                : "bg-surface text-text-secondary cursor-not-allowed border border-border-color"
            }`}
          >
            {entering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Entering workspace…
              </>
            ) : (
              <>
                Enter Contributor Workspace
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-secondary mt-6">
          Your GitHub profile data is fetched publicly from the GitHub API.{" "}
          <span className="text-primary">No login required.</span>
        </p>
      </motion.div>
    </div>
  );
}
