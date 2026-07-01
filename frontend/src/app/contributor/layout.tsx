"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Map, List, Brain, Search, BarChart2, Activity, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
}

export default function ContributorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<GitHubProfile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("gh_profile");
    const username = localStorage.getItem("gh_username");

    if (!username) {
      router.replace("/onboarding");
      return;
    }

    if (stored) {
      try {
        setProfile(JSON.parse(stored));
        return;
      } catch {}
    }

    // Fallback: re-fetch if profile not cached
    fetch(`https://api.github.com/users/${username}`)
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        localStorage.setItem("gh_profile", JSON.stringify(data));
      })
      .catch(() => {
        setProfile({ login: username, name: null, avatar_url: `https://github.com/${username}.png`, bio: null, public_repos: 0, followers: 0 });
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("gh_username");
    localStorage.removeItem("gh_profile");
    router.push("/onboarding");
  };

  const navItems = [
    { name: "Dashboard", path: "/contributor", icon: <BarChart2 className="w-5 h-5" /> },
    { name: "Repo Orientation", path: "/contributor/orientation", icon: <Map className="w-5 h-5" /> },
    { name: "Issue Feed", path: "/contributor/issues", icon: <List className="w-5 h-5" /> },
    { name: "Issue Helper", path: "/contributor/issue-helper", icon: <Brain className="w-5 h-5" /> },
    { name: "PR Review", path: "/contributor/pr-review", icon: <Search className="w-5 h-5" /> },
  ];

  // Derived Rank simulation (similar to page.tsx)
  const repoCount = profile?.public_repos || 0;
  const followersCount = profile?.followers || 0;
  const estimatedLevel = Math.max(1, Math.floor((repoCount * 120 + followersCount * 50) / 500));
  const hunterClass = estimatedLevel >= 30 ? "S-Class" : estimatedLevel >= 20 ? "A-Class" : estimatedLevel >= 10 ? "B-Class" : "C-Class";

  return (
    <div className="flex min-h-screen bg-[#05050A]">
      {/* Sidebar with Glassmorphic HUD Theme */}
      <aside className="w-64 border-r border-primary/20 bg-surface/40 backdrop-blur-xl flex flex-col fixed h-full z-20 shadow-[8px_0_32px_0_rgba(0,0,0,0.4)]">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent/40 pointer-events-none" />

        {/* Profile Section */}
        <div className="p-5 border-b border-primary/20">
          {profile ? (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-accent to-secondary p-[2px] flex-shrink-0 shadow-[0_0_12px_rgba(224,40,204,0.3)]">
                  <img
                    src={profile.avatar_url}
                    alt={profile.login}
                    className="w-full h-full rounded-full border-2 border-surface object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate uppercase tracking-tight">
                    {profile.name || profile.login}
                  </h3>
                  <p className="text-xs font-mono text-accent truncate">@{profile.login}</p>
                </div>
              </div>

              {/* Hunter Rank Badge */}
              <div className="flex items-center space-x-2 bg-surface-raised border border-accent/20 px-2 py-1 rounded-md">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-bold text-accent tracking-widest uppercase">
                  {hunterClass} HUNTER
                </span>
                <span className="text-[10px] font-bold text-text-secondary ml-auto">
                  Lv. {estimatedLevel}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-surface-raised" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-surface-raised rounded w-24" />
                <div className="h-2.5 bg-surface-raised rounded w-16" />
              </div>
            </div>
          )}

          {/* GitHub Stats mini row */}
          {profile && (
            <div className="flex items-center justify-between mt-4 text-[10px] font-mono text-text-secondary uppercase tracking-wider">
              <span className="flex items-center gap-1">
                REPOS: <span className="text-primary font-bold text-glow-primary">{profile.public_repos}</span>
              </span>
              <span className="flex items-center gap-1">
                FOLLOWERS: <span className="text-secondary font-bold text-glow-secondary">{profile.followers}</span>
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path}>
                <div className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group uppercase font-bold text-xs tracking-wider cursor-pointer",
                  isActive ? "text-accent text-glow-accent" : "text-text-secondary hover:text-text-primary hover:bg-surface-raised/40"
                )}>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-accent/5 border-l-2 border-accent"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">{item.icon}</div>
                  <span className="relative z-10 font-bold">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status panel */}
        <div className="p-4 border-t border-primary/20 space-y-2 bg-surface/20">
          <Link href="/agent-graph">
            <div className="flex items-center space-x-2 text-[10px] font-bold font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer bg-surface-raised/50 border border-primary/10 px-3 py-2 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_#00E5A0]"></span>
              <span>[ SYSTEM CALIBRATED ]</span>
              <Activity className="w-3.5 h-3.5 ml-auto text-primary animate-pulse" />
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 text-[10px] font-bold font-mono text-text-secondary hover:text-critical transition-all px-3 py-2 rounded-lg hover:bg-critical/5 uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen relative">
        {/* Subtle grid accent inside page content */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#151525_1px,transparent_1px),linear-gradient(to_bottom,#151525_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-[0.03] pointer-events-none" />
        
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="h-full p-8 relative z-10"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
