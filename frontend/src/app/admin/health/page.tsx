"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { StreamingText } from "@/components/ui/StreamingText";
import { RefreshCw, TrendingUp, TrendingDown, Users, GitMerge, FileText, Download, Copy, CheckCircle2, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell } from "recharts";
import CountUp from "react-countup";

export default function HealthDashboard() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const flowData = [
    { name: '1', opened: 12, closed: 8 },
    { name: '5', opened: 19, closed: 15 },
    { name: '10', opened: 15, closed: 22 },
    { name: '15', opened: 22, closed: 18 },
    { name: '20', opened: 30, closed: 28 },
    { name: '25', opened: 25, closed: 35 },
    { name: '30', opened: 18, closed: 42 },
  ];

  const mergeTimeData = [
    { name: '<1hr', value: 45, color: '#00E5A0' },
    { name: '1-4hr', value: 80, color: '#00D4FF' },
    { name: '4-24hr', value: 120, color: '#6E56CF' },
    { name: '1-3d', value: 50, color: '#FFB800' },
    { name: '>3d', value: 15, color: '#FF4444' },
  ];

  const stalePRs = [
    { id: 1, title: "Refactor reconciliation algorithm", author: "acdlite", days: 14, status: "red" },
    { id: 2, title: "Fix hydration mismatch in Suspense", author: "sebmarkbage", days: 8, status: "amber" },
    { id: 3, title: "Update docs for useLayoutEffect", author: "rachelnabors", days: 6, status: "amber" },
  ];

  const topContributors = [
    { name: "torvalds", prs: 42, issues: 128, avatar: "https://github.com/torvalds.png", tier: "gold" },
    { name: "gaearon", prs: 38, issues: 95, avatar: "https://github.com/gaearon.png", tier: "silver" },
    { name: "acdlite", prs: 25, issues: 64, avatar: "https://github.com/acdlite.png", tier: "bronze" },
    { name: "sophiebits", prs: 18, issues: 42, avatar: "https://github.com/sophiebits.png", tier: "none" },
  ];

  if (!mounted) return null; // Avoid hydration mismatch with Recharts

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-2">Project Health</h1>
          <p className="text-text-secondary">Project momentum, PR merge times, and issue flow at a glance.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <span className="text-sm text-text-secondary">Last updated: 2 mins ago</span>
          <button className="flex items-center px-4 py-2 bg-surface-raised border border-border-color rounded-lg text-sm text-text-primary hover:text-secondary hover:border-secondary transition-colors">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Open Issues", value: 342, icon: <FileText className="w-6 h-6 text-warning" />, trend: "+12%", up: true, color: "warning" },
          { title: "Closed This Week", value: 128, icon: <CheckCircle2 className="w-6 h-6 text-success" />, trend: "+24%", up: true, color: "success" },
          { title: "Active Contributors", value: 45, icon: <Users className="w-6 h-6 text-secondary" />, trend: "-2%", up: false, color: "secondary" },
          { title: "Avg PR Merge", value: 18, suffix: "h", icon: <GitMerge className="w-6 h-6 text-primary" />, trend: "-4h", up: true, color: "primary" },
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
          <h3 className="text-lg font-heading font-bold mb-6">Issue Flow (30 Days)</h3>
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

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GlassCard>
          <h3 className="text-lg font-heading font-bold mb-6">Stale PRs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-secondary uppercase border-b border-border-color">
                <tr>
                  <th className="px-4 py-3 font-medium">Pull Request</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {stalePRs.map((pr) => (
                  <tr key={pr.id} className="border-b border-border-color hover:bg-surface-raised/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary max-w-[200px] truncate" title={pr.title}>
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${pr.status === 'red' ? 'bg-critical' : 'bg-warning'}`}></span>
                        {pr.title}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{pr.author}</td>
                    <td className="px-4 py-3 text-text-secondary">{pr.days}</td>
                    <td className="px-4 py-3">
                      <button className="text-secondary hover:text-secondary/80 text-xs font-medium px-2 py-1 border border-secondary/30 rounded hover:bg-secondary/10 transition-colors">
                        Ping
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-heading font-bold mb-6">Top Contributors This Month</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-secondary uppercase border-b border-border-color">
                <tr>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Contributor</th>
                  <th className="px-4 py-3 font-medium">PRs Merged</th>
                  <th className="px-4 py-3 font-medium">Issues Closed</th>
                </tr>
              </thead>
              <tbody>
                {topContributors.map((user, i) => (
                  <tr key={user.name} className={`border-b border-border-color hover:bg-surface-raised/50 transition-colors ${
                    user.tier === 'gold' ? 'bg-[#FFD700]/5' : user.tier === 'silver' ? 'bg-[#C0C0C0]/5' : user.tier === 'bronze' ? 'bg-[#CD7F32]/5' : ''
                  }`}>
                    <td className="px-4 py-3 font-bold font-heading text-text-secondary">
                      #{i + 1}
                    </td>
                    <td className="px-4 py-3 flex items-center space-x-3">
                      <img src={user.avatar} className="w-6 h-6 rounded-full" alt={user.name} />
                      <span className="font-medium text-text-primary">{user.name}</span>
                    </td>
                    <td className="px-4 py-3 text-success font-medium">{user.prs}</td>
                    <td className="px-4 py-3 text-secondary font-medium">{user.issues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* AI Summary */}
      <GlassCard glowColor="secondary">
        <div className="flex justify-between items-center mb-4 border-b border-border-color pb-3">
          <h3 className="text-lg font-heading font-bold text-secondary flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Weekly Health Report
          </h3>
          <div className="flex space-x-2">
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded transition-colors" title="Download PDF">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-raised rounded transition-colors" title="Copy to Clipboard">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-text-primary leading-relaxed text-sm">
          <StreamingText 
            text="The project is currently in excellent health with a 24% increase in closed issues this week, largely driven by a recent bug-squashing initiative. PR merge times are averaging 18 hours, which is well within our 24-hour SLA target. However, we have noticed a slight 2% drop in active contributors, and there are 3 PRs that have been stale for over 5 days in the reconciliation module. The Triage Agent successfully classified 85% of incoming issues automatically this week, saving maintainers an estimated 12 hours of manual sorting." 
            speed={20}
          />
        </div>
      </GlassCard>
    </div>
  );
}
