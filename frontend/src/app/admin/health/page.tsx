"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamingText } from "@/components/ui/StreamingText";
import {
  RefreshCw, TrendingUp, TrendingDown, Users, GitMerge,
  FileText, Copy, CheckCircle2, Activity, Loader2, GitBranch
} from "lucide-react";
import CountUp from "react-countup";
import { getProjectHealth, type HealthReport } from "@/lib/api";

export default function HealthDashboard() {
  const [mounted, setMounted] = useState(false);
  const [repoName, setRepoName] = useState("facebook/react");
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProjectHealth(repoName, period);
      setReport(result.health_report);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || "Failed to fetch health report.");
    } finally {
      setLoading(false);
    }
  };

  const openIssues = report?.open_issues ?? 0;
  const closedThisPeriod = report?.closed_this_period ?? 0;
  const activeContributors = report?.active_contributors ?? 0;
  const avgPrMergeDays = report?.avg_pr_merge_days ?? 0;
  const stalePrs = report?.stale_prs ?? 0;

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-2">Project Health</h1>
          <p className="text-text-secondary">Real-time project metrics from GitHub — PR merge times, issue flow, and contributor activity.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          {lastFetched && (
            <span className="text-sm text-text-secondary">Last updated: {lastFetched}</span>
          )}
        </div>
      </div>

      {/* Repo Input & Fetch */}
      <GlassCard className="mb-8">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GitBranch className="h-5 w-5 text-text-secondary" />
            </div>
            <input
              type="text"
              id="health-repo-input"
              className="block w-full pl-10 pr-3 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              placeholder="owner/repo (e.g. facebook/react)"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
            />
          </div>
          <select
            id="health-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-secondary transition-all"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            id="health-fetch-btn"
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center justify-center px-6 py-3 bg-secondary text-black font-medium rounded-lg hover:bg-secondary/90 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</span>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Fetch Health Report</>
            )}
          </button>
        </div>
      </GlassCard>

      {error && (
        <div className="mb-8 p-4 bg-critical/10 border border-critical/30 rounded-lg text-critical text-sm">
          <span className="font-bold">Error: </span>{error}
        </div>
      )}

      {report && (
        <>
          {/* Top Metrics — sourced from real GitHub API */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: "Open Issues", value: openIssues, icon: <FileText className="w-6 h-6 text-warning" />, up: false, color: "warning" },
              { title: `Closed (${report.period})`, value: closedThisPeriod, icon: <CheckCircle2 className="w-6 h-6 text-success" />, up: true, color: "success" },
              { title: "Active Contributors", value: activeContributors, icon: <Users className="w-6 h-6 text-secondary" />, up: activeContributors > 5, color: "secondary" },
              { title: "Avg PR Merge", value: avgPrMergeDays, suffix: "d", icon: <GitMerge className="w-6 h-6 text-primary" />, up: avgPrMergeDays < 5, color: "primary" },
            ].map((stat, i) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg bg-${stat.color}/10`}>
                      {stat.icon}
                    </div>
                    <div className={`flex items-center text-sm font-medium ${stat.up ? 'text-success' : 'text-critical'}`}>
                      {stat.up ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    </div>
                  </div>
                  <h3 className="text-text-secondary text-sm font-medium mb-1">{stat.title}</h3>
                  <div className="text-3xl font-heading font-bold text-text-primary">
                    <CountUp end={stat.value} duration={2.5} separator="," decimals={stat.suffix === "d" ? 1 : 0} />
                    {stat.suffix && <span className="text-xl text-text-secondary ml-1">{stat.suffix}</span>}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Stale PRs Alert */}
          {stalePrs > 0 && (
            <GlassCard className="mb-8">
              <h3 className="text-lg font-heading font-bold mb-4">Stale PRs</h3>
              <p className="text-text-secondary text-sm">
                There are <span className="text-warning font-bold">{stalePrs}</span> open pull requests with no activity in the last 14 days.
              </p>
            </GlassCard>
          )}

          {/* AI Narrative */}
          <GlassCard glowColor="secondary">
            <div className="flex justify-between items-center mb-4 border-b border-border-color pb-3">
              <h3 className="text-lg font-heading font-bold text-secondary flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                AI Health Narrative
              </h3>
              <div className="flex space-x-2">
                <button
                  id="health-copy-btn"
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded transition-colors"
                  title="Copy to Clipboard"
                  onClick={() => {
                    if (report?.narrative) navigator.clipboard.writeText(report.narrative);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-text-primary leading-relaxed text-sm">
              <StreamingText
                text={report.narrative || "No narrative available for this repository."}
                speed={20}
              />
            </div>
          </GlassCard>
        </>
      )}

      {!report && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Activity className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">Enter a repository name and click &quot;Fetch Health Report&quot; to get started.</p>
          <p className="text-sm mt-2 opacity-60">Metrics are fetched in real-time from the GitHub API.</p>
        </div>
      )}
    </div>
  );
}
