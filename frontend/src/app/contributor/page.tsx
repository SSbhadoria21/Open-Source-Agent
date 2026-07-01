"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Target, Flame, Star, Hexagon, Medal, Award, Code, CheckCircle, Gift, ExternalLink, BookOpen, GitFork, Users, Package } from "lucide-react";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface GitHubProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
  company: string | null;
  location: string | null;
  created_at: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  updated_at: string;
}

// Static skill data — reflects contributor focus areas
const skills = [
  { name: "Code Quality", level: 85, icon: <Code className="w-4 h-4" />, color: "bg-primary" },
  { name: "Issue Resolution", level: 60, icon: <Target className="w-4 h-4" />, color: "bg-secondary" },
  { name: "PR Reviewing", level: 40, icon: <Star className="w-4 h-4" />, color: "bg-accent" },
  { name: "Architecture", level: 75, icon: <Hexagon className="w-4 h-4" />, color: "bg-success" },
  { name: "Mentorship", level: 90, icon: <Flame className="w-4 h-4" />, color: "bg-warning" },
];

const agents = [
  { name: "Repo Agent", role: "Orientation", status: "Active" },
  { name: "Fix Agent", role: "Debugger", status: "Idle" },
  { name: "Review Agent", role: "PR Reviewer", status: "Active" },
];

const quests = [
  { title: "Code Refactoring", points: 80, percentage: 85 },
  { title: "Bug Fixing", points: 30, percentage: 32 },
  { title: "Documentation", points: 55, percentage: 71 },
];

function getLanguageColor(lang: string | null): string {
  const map: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    Swift: "#F05138",
  };
  return lang ? (map[lang] || "#6E56CF") : "#555";
}

export default function ContributorDashboard() {
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [repoBarData, setRepoBarData] = useState<{ name: string; stars: number }[]>([]);
  const [joinYear, setJoinYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("gh_profile");
    const username = localStorage.getItem("gh_username");
    if (!username) return;

    // Load cached profile
    if (stored) {
      try { setProfile(JSON.parse(stored)); } catch {}
    }

    // Fetch fresh profile + repos in parallel
    Promise.all([
      fetch(`https://api.github.com/users/${username}`).then(r => r.json()),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`).then(r => r.json()),
    ]).then(([profileData, repoData]: [GitHubProfile, GitHubRepo[]]) => {
      setProfile(profileData);
      localStorage.setItem("gh_profile", JSON.stringify(profileData));

      if (Array.isArray(repoData)) {
        const sorted = repoData
          .filter(r => r.stargazers_count > 0 || repoData.length < 10)
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 5);
        setRepos(sorted);
        setRepoBarData(sorted.map(r => ({ name: r.name.slice(0, 12), stars: r.stargazers_count })));
      }

      if (profileData.created_at) {
        setJoinYear(new Date(profileData.created_at).getFullYear());
      }

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Derived XP simulation from real stats
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const xpMax = 15000;
  const xpCurrent = Math.min((profile?.public_repos || 0) * 120 + totalStars * 30 + (profile?.followers || 0) * 50, xpMax);
  const xpPercent = Math.round((xpCurrent / xpMax) * 100);
  const level = Math.max(1, Math.floor(xpCurrent / 500));
  const yearsSince = joinYear ? new Date().getFullYear() - joinYear : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary drop-shadow-[0_0_10px_rgba(224,40,204,0.5)]">
            SOLO LEVELING
          </h1>
          <p className="text-text-secondary text-sm">System Dashboard · {profile ? `@${profile.login}` : "Loading…"}</p>
        </div>
        {profile && (
          <a href={profile.html_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-primary transition-colors border border-border-color bg-surface-raised px-3 py-2 rounded-lg">
            <ExternalLink className="w-3 h-3" />
            View on GitHub
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Profile Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-1 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          {loading || !profile ? (
            <div className="animate-pulse space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 rounded-full bg-surface-raised" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-surface-raised rounded w-24" />
                  <div className="h-3 bg-surface-raised rounded w-16" />
                </div>
              </div>
              <div className="h-3 bg-surface-raised rounded w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-6 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-primary p-1 shadow-glow-accent">
                    <img
                      src={profile.avatar_url}
                      alt={profile.login}
                      className="w-full h-full rounded-full border-4 border-surface-raised object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-surface-raised text-xs font-bold px-2 py-1 rounded-md border border-accent text-accent shadow-glow-accent">
                    Lv. {level}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-text-primary">{profile.name || profile.login}</h2>
                  <p className="text-xs text-text-secondary">@{profile.login}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/30">
                      {level >= 30 ? "S-Class" : level >= 20 ? "A-Class" : level >= 10 ? "B-Class" : "C-Class"} Contributor
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-text-secondary grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center space-x-1">
                      <Flame className="w-3 h-3 text-warning" />
                      <span>{yearsSince}y active</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Medal className="w-3 h-3 text-success" />
                      <span>{profile.followers} followers</span>
                    </div>
                  </div>
                </div>
              </div>

              {profile.bio && (
                <p className="text-xs text-text-secondary mb-4 italic line-clamp-2">"{profile.bio}"</p>
              )}

              <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                <div className="bg-surface rounded-lg p-2 border border-border-color">
                  <p className="text-lg font-bold text-primary">{profile.public_repos}</p>
                  <p className="text-xs text-text-secondary">Repos</p>
                </div>
                <div className="bg-surface rounded-lg p-2 border border-border-color">
                  <p className="text-lg font-bold text-secondary">{profile.followers}</p>
                  <p className="text-xs text-text-secondary">Followers</p>
                </div>
                <div className="bg-surface rounded-lg p-2 border border-border-color">
                  <p className="text-lg font-bold text-accent">{totalStars}</p>
                  <p className="text-xs text-text-secondary">Stars</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>XP to next level</span>
                  <span>{xpCurrent.toLocaleString()} / {xpMax.toLocaleString()} XP</span>
                </div>
                <div className="h-3 w-full bg-surface rounded-full overflow-hidden border border-border-color">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent shadow-glow-accent relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPercent}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* --- Top Repos Bar Chart --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Top Repos by Stars</h3>
            {profile && (
              <a href={`https://github.com/${profile.login}?tab=repositories`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
                All repos <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="h-56 w-full">
            {repoBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repoBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D838CB" stopOpacity={1} />
                      <stop offset="95%" stopColor="#6E56CF" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(110, 86, 207, 0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8888AA" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8888AA" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                    contentStyle={{ backgroundColor: "#151525", borderColor: "rgba(110, 86, 207, 0.4)", borderRadius: "8px" }}
                    itemStyle={{ color: "#EAEAF5" }}
                    formatter={(v: any) => [`${v} ⭐`, "Stars"]}
                  />
                  <Bar dataKey="stars" fill="url(#colorStars)" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                {loading ? "Fetching repos…" : "No starred repos found"}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Skill Tracker --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Skill Tracker</h3>
          <div className="space-y-5">
            {skills.map((skill, index) => (
              <div key={skill.name}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center space-x-3 text-text-primary">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-glow", skill.color, skill.color.replace("bg-", "text-background"))}>
                      {skill.icon}
                    </div>
                    <span className="font-medium">{skill.name}</span>
                  </div>
                  <span className="text-text-secondary text-xs">{skill.level}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full", skill.color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.level}%` }}
                    transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* --- Recent Repos List --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Your Top Repositories</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center p-3 rounded-xl bg-surface border border-border-color gap-4">
                  <div className="w-8 h-8 rounded-lg bg-surface-raised" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-raised rounded w-32" />
                    <div className="h-2 bg-surface-raised rounded w-48" />
                  </div>
                </div>
              ))
            ) : repos.length > 0 ? (
              repos.map((repo, i) => (
                <motion.a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center p-3 rounded-xl bg-surface border border-border-color hover:border-primary transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mr-4 group-hover:shadow-glow transition-shadow flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-text-primary truncate">{repo.name}</h4>
                    {repo.description && (
                      <p className="text-xs text-text-secondary truncate">{repo.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4 text-xs text-text-secondary flex-shrink-0">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLanguageColor(repo.language) }} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3 text-text-secondary" />
                      {repo.forks_count}
                    </span>
                  </div>
                </motion.a>
              ))
            ) : (
              <p className="text-text-secondary text-sm text-center py-8">No public repos found.</p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Goal Completion (XP ring) --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative flex flex-col items-center justify-center"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6 self-start w-full">Level Progress</h3>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-surface" />
              <motion.circle
                cx="96" cy="96" r="80"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray="502"
                strokeDashoffset="502"
                strokeLinecap="round"
                className="text-accent drop-shadow-[0_0_10px_rgba(224,40,204,0.8)]"
                initial={{ strokeDashoffset: 502 }}
                animate={{ strokeDashoffset: 502 - (502 * (xpPercent / 100)) }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">
                <CountUp end={xpPercent} duration={2} delay={0.5} suffix="%" />
              </span>
              <span className="text-xs text-accent font-bold tracking-widest mt-1 text-center">XP</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2 text-sm text-text-secondary">
            <div className="flex items-center justify-between">
              <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-success" />Repos</span>
              <span className="text-text-primary font-mono">{profile?.public_repos ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><Award className="w-4 h-4 mr-2 text-warning" />Total Stars</span>
              <span className="text-text-primary font-mono">{totalStars}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><Users className="w-4 h-4 mr-2 text-primary" />Followers</span>
              <span className="text-text-primary font-mono">{profile?.followers ?? "—"}</span>
            </div>
          </div>
        </motion.div>

        {/* --- Agents + Quests --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Active Agents */}
          <div className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Party Members (Agents)</h3>
            <div className="space-y-4">
              {agents.map((agent, i) => (
                <div key={i} className="flex items-center p-3 rounded-xl bg-surface border border-border-color hover:border-primary transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-4 group-hover:shadow-glow transition-shadow">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-text-primary">{agent.name}</h4>
                    <p className="text-xs text-text-secondary">{agent.role}</p>
                  </div>
                  <span className={cn("w-2 h-2 rounded-full", agent.status === "Active" ? "bg-success shadow-[0_0_8px_#00E5A0]" : "bg-text-secondary")} />
                </div>
              ))}
            </div>
          </div>

          {/* Quests */}
          <div className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Quests Marketplace</h3>
            <div className="space-y-4">
              {quests.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-color hover:border-accent transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:shadow-glow-accent transition-shadow">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                      <p className="text-xs text-accent">+{item.points} XP</p>
                    </div>
                  </div>
                  <div className="text-xs text-text-secondary font-mono bg-background px-2 py-1 rounded">
                    {item.percentage}%
                  </div>
                </div>
              ))}
            </div>

            <Link href="/contributor/issues" className="mt-4 block">
              <button className="w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors mt-2">
                Browse Open Issues →
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
