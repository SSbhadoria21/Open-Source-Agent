"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Map, List, Brain, Search, BarChart2, Activity, LogOut } from "lucide-react";
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
        // Still show something even if fetch fails
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-color bg-surface/50 backdrop-blur-md flex flex-col fixed h-full z-20">
        {/* Profile Section */}
        <div className="p-5 border-b border-border-color">
          {profile ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px] flex-shrink-0">
                <img
                  src={profile.avatar_url}
                  alt={profile.login}
                  className="w-full h-full rounded-full border-2 border-background object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-text-primary truncate">
                  {profile.name || profile.login}
                </h3>
                <p className="text-xs text-text-secondary truncate">@{profile.login}</p>
                <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full inline-block mt-1">
                  Contributor
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-surface-raised" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface-raised rounded w-24" />
                <div className="h-2 bg-surface-raised rounded w-16" />
              </div>
            </div>
          )}

          {/* GitHub Stats mini row */}
          {profile && (
            <div className="flex items-center gap-3 mt-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="text-primary font-bold">{profile.public_repos}</span> repos
              </span>
              <span className="flex items-center gap-1">
                <span className="text-secondary font-bold">{profile.followers}</span> followers
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path}>
                <div className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all relative overflow-hidden group",
                  isActive ? "text-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                )}>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10">{item.icon}</div>
                  <span className="relative z-10 font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-border-color space-y-2">
          <Link href="/agent-graph">
            <div className="flex items-center space-x-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer bg-surface-raised px-3 py-2 rounded-md">
              <span className="w-2 h-2 rounded-full bg-success animate-pulseGlow shadow-[0_0_8px_#00E5A0]"></span>
              <span>10 Agents Online</span>
              <Activity className="w-3 h-3 ml-auto text-primary" />
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 text-xs text-text-secondary hover:text-critical transition-colors px-3 py-2 rounded-md hover:bg-critical/5"
          >
            <LogOut className="w-3 h-3" />
            <span>Switch Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="h-full p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
