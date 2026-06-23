"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamingText } from "@/components/ui/StreamingText";
import { RefreshCw, TrendingUp, TrendingDown, Users, GitMerge, FileText, Download, Copy, CheckCircle2, Activity, Loader2, GitBranch } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell } from "recharts";
import CountUp from "react-countup";
import { getProjectHealth, type HealthReport } from "@/lib/api";

export default function HealthDashboard() {
  const [mounted, setMounted] = useState(false);
  const [repoName, setRepoName] = useState("facebook/react");
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
      const result = await getProjectHealth(repoName);
      setReport(result.health_report);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || "Failed to fetch health report.");
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data from the report or use sensible defaults
  const openIssues = report?.open_issues ?? 0;
  const closedThisPeriod = report?.closed_this_period ?? 0;
  const activeContributors = report?.active_contributors ?? 0;
  const avgPrMergeDays = report?.avg_pr_merge_days ?? 0;
  const stalePrs = report?.stale_prs ?? 0;

  // Simulated flow data derived from report metrics for visual representation
  const flowData = report ? [
    { name: '1', opened: Math.round(openIssues * 0.15), closed: Math.round(closedThisPeriod * 0.1) },
    { name: '5', opened: Math.round(openIssues * 0.22), closed: Math.round(closedThisPeriod * 0.18) },
    { name: '10', opened: Math.round(openIssues * 0.18), closed: Math.round(closedThisPeriod * 0.28) },
    { name: '15', opened: Math.round(openIssues * 0.25), closed: Math.round(closedThisPeriod * 0.22) },
    { name: '20', opened: Math.round(openIssues * 0.30), closed: Math.round(closedThisPeriod * 0.35) },
    { name: '25', opened: Math.round(openIssues * 0.20), closed: Math.round(closedThisPeriod * 0.42) },
    { name: '30', opened: Math.round(openIssues * 0.12), closed: Math.round(closedThisPeriod * 0.50) },
  ] : [];

  const mergeTimeData = report ? [
    { name: '<1d', value: Math.max(1, Math.round(closedThisPeriod * 0.15)), color: '#00E5A0' },
    { name: '1-2d', value: Math.max(1, Math.round(closedThisPeriod * 0.25)), color: '#00D4FF' },
    { name: '2-5d', value: Math.max(1, Math.round(closedThisPeriod * 0.35)), color: '#6E56CF' },
    { name: '5-10d', value: Math.max(1, Math.round(closedThisPeriod * 0.15)), color: '#FFB800' },
    { name: '>10d', value: Math.max(1, stalePrs), color: '#FF4444' },
  ] : [];

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-2">Project Health</h1>
          <p className="text-text-secondary">Project momentum, PR merge times, and issue flow at a glance.</p>
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
              className="block w-full pl-10 pr-3 py-3 border border-border-color rounded-lg bg-background text-text-primary focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              placeholder="owner/repo (e.g. facebook/react)"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
            />
          </div>
          <button
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
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: "Open Issues", value: openIssues, icon: <FileText className="w-6 h-6 text-warning" />, trend: report ? `${openIssues}` : "--", up: false, color: "warning" },
              { title: `Closed (${report.period})`, value: closedThisPeriod, icon: <CheckCircle2 className="w-6 h-6 text-success" />, trend: `${closedThisPeriod}`, up: true, color: "success" },
              { title: "Active Contributors", value: activeContributors, icon: <Users className="w-6 h-6 text-secondary" />, trend: `${activeContributors}`, up: activeContributors > 5, color: "secondary" },
              { title: "Avg PR Merge", value: avgPrMergeDays, suffix: "d", icon: <GitMerge className="w-6 h-6 text-primary" />, trend: `${avgPrMergeDays}d`, up: avgPrMergeDays < 5, color: "primary" },
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
                      {stat.trend}
                    </div>
                  </div>
                  <h3 className="text-text-secondary text-sm font-medium mb-1">{stat.title}</h3>
                  <div className="text-3xl font-heading font-bold text-text-primary">
                    <CountUp end={stat.value} duration={2.5} separator="," />
                    {stat.suffix && <span className="text-xl text-text-secondary ml-1">{stat.suffix}</span>}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <GlassCard>
              <h3 className="text-lg font-heading font-bold mb-6">Issue Flow ({report.period})</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6E56CF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6E56CF" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" vertical={false} />
                    <XAxis dataKey="name" stroke="#8888AA" tick={{fill: '#8888AA', fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8888AA" tick={{fill: '#8888AA', fontSize: 12}} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0F0F1A', borderColor: 'rgba(110,86,207,0.2)', borderRadius: '8px' }}
                      itemStyle={{ color: '#EAEAF5' }}
                    />
                    <Area type="monotone" dataKey="opened" stroke="#6E56CF" strokeWidth={2} fillOpacity={1} fill="url(#colorOpened)" name="Opened" />
                    <Area type="monotone" dataKey="closed" stroke="#00D4FF" strokeWidth={2} fillOpacity={1} fill="url(#colorClosed)" name="Closed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-heading font-bold mb-6">PR Merge Time Distribution</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mergeTimeData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" horizontal={false} />
                    <XAxis type="number" stroke="#8888AA" tick={{fill: '#8888AA', fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#8888AA" tick={{fill: '#8888AA', fontSize: 12}} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#0F0F1A', borderColor: 'rgba(110,86,207,0.2)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {mergeTimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Stale PRs Info */}
          {stalePrs > 0 && (
            <GlassCard className="mb-8">
              <h3 className="text-lg font-heading font-bold mb-4">Stale PRs</h3>
              <p className="text-text-secondary text-sm">
                There are <span className="text-warning font-bold">{stalePrs}</span> stale pull requests that need attention.
              </p>
            </GlassCard>
          )}

          {/* AI Summary */}
          <GlassCard glowColor="secondary">
            <div className="flex justify-between items-center mb-4 border-b border-border-color pb-3">
              <h3 className="text-lg font-heading font-bold text-secondary flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                AI Health Narrative
              </h3>
              <div className="flex space-x-2">
                <button
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
        </div>
      )}
    </div>
  );
}
