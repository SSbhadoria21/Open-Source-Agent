"use client";

import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { User, Shield, Activity, Users, AlertTriangle, Zap, CheckCircle, Clock } from "lucide-react";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const velocityData = [
  { day: 'Mon', opened: 5, closed: 8 },
  { day: 'Tue', opened: 12, closed: 10 },
  { day: 'Wed', opened: 8, closed: 15 },
  { day: 'Thu', opened: 15, closed: 12 },
  { day: 'Fri', opened: 20, closed: 25 },
  { day: 'Sat', opened: 4, closed: 5 },
  { day: 'Sun', opened: 6, closed: 8 },
];

const healthStats = [
  { name: 'Week 1', score: 82 },
  { name: 'Week 2', score: 85 },
  { name: 'Week 3', score: 81 },
  { name: 'Week 4', score: 89 },
  { name: 'Week 5', score: 94 },
];

const topContributors = [
  { name: "torvalds", role: "S-Class Contributor", level: 95, icon: <Zap className="w-4 h-4" />, color: "bg-accent" },
  { name: "yyx990803", role: "A-Class Contributor", level: 82, icon: <Shield className="w-4 h-4" />, color: "bg-primary" },
  { name: "gaearon", role: "A-Class Contributor", level: 78, icon: <Activity className="w-4 h-4" />, color: "bg-secondary" },
  { name: "tj", role: "B-Class Contributor", level: 65, icon: <Users className="w-4 h-4" />, color: "bg-success" },
];

const activeAgents = [
  { name: "Triage Agent", status: "Processing", queue: 12 },
  { name: "Label Agent", status: "Idle", queue: 0 },
  { name: "Review Agent", status: "Active", queue: 3 },
];

const recentAnomalies = [
  { title: "High PR Failure Rate", severity: "High", time: "2h ago" },
  { title: "Bot Traffic Spike", severity: "Medium", time: "5h ago" },
  { title: "Unusual Issue Volume", severity: "Low", time: "1d ago" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-secondary via-primary to-accent drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]">
            SYSTEM ARCHITECT
          </h1>
          <p className="text-text-secondary text-sm">Maintainer Command Center</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Guild Master Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-1 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow-secondary relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary p-1 shadow-glow-secondary">
                <img src="https://github.com/gaearon.png" alt="admin" className="w-full h-full rounded-full border-4 border-surface-raised object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-surface-raised text-xs font-bold px-2 py-1 rounded-md border border-secondary text-secondary shadow-glow-secondary">
                Admin
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-text-primary">gaearon</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/30">Guild Master</span>
              </div>
              <div className="mt-3 text-sm text-text-secondary grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center space-x-1"><Shield className="w-3 h-3 text-secondary"/><span>Repo: react</span></div>
                <div className="flex items-center space-x-1"><Activity className="w-3 h-3 text-success"/><span>Uptime: 99.9%</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-8">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Overall Repo Health</span>
              <span>94 / 100</span>
            </div>
            <div className="h-3 w-full bg-surface rounded-full overflow-hidden border border-border-color">
              <motion.div 
                className="h-full bg-gradient-to-r from-secondary to-primary shadow-glow-secondary relative"
                initial={{ width: 0 }}
                animate={{ width: "94%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* --- Issue/PR Velocity Tracker --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Velocity Tracker (Issues/PRs)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6E56CF" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#6E56CF" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(110, 86, 207, 0.1)" vertical={false} />
                <XAxis dataKey="day" stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#151525', borderColor: 'rgba(0, 212, 255, 0.4)', borderRadius: '8px' }}
                  itemStyle={{ color: '#EAEAF5' }}
                />
                <Bar dataKey="opened" fill="url(#colorOpened)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="closed" fill="url(#colorClosed)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Top Contributors --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Top Contributors</h3>
          <div className="space-y-5">
            {topContributors.map((contributor, index) => (
              <div key={contributor.name}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center space-x-3 text-text-primary">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-glow", contributor.color, contributor.color.replace('bg-', 'text-background'))}>
                      {contributor.icon}
                    </div>
                    <div>
                      <span className="font-medium block">{contributor.name}</span>
                      <span className="text-text-secondary text-xs">{contributor.role}</span>
                    </div>
                  </div>
                  <span className="text-text-secondary text-xs font-mono">{contributor.level} XP</span>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <motion.div 
                    className={cn("h-full", contributor.color)}
                    style={{ boxShadow: `0 0 10px var(--tw-colors-${contributor.color.replace('bg-', '')})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${contributor.level}%` }}
                    transition={{ duration: 1, delay: 0.3 + (index * 0.1) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* --- Repo Health Trend --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Repo Health Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E028CC" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#6E56CF" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(224, 40, 204, 0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#151525', borderColor: 'rgba(224, 40, 204, 0.4)', borderRadius: '8px' }}
                />
                <Bar dataKey="score" fill="url(#colorHealth)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Triage Completion --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative flex flex-col items-center justify-center"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6 self-start w-full">Triage Queue</h3>
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
                className="text-secondary drop-shadow-[0_0_10px_rgba(0,212,255,0.8)]"
                initial={{ strokeDashoffset: 502 }}
                animate={{ strokeDashoffset: 502 - (502 * 0.85) }} // 85% clear
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">
                <CountUp end={85} duration={2} delay={0.5} suffix="%" />
              </span>
              <span className="text-xs text-secondary font-bold tracking-widest mt-1 text-center">CLEARED</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2 text-sm text-text-secondary">
            <div className="flex items-center justify-between"><span className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-success"/> Untriaged</span> <span className="text-text-primary">15</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center"><Clock className="w-4 h-4 mr-2 text-warning"/> Avg Time</span> <span className="text-text-primary">2h 14m</span></div>
          </div>
        </motion.div>

        {/* --- Agents & Anomalies --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Active Agents */}
          <div className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Sub-Agent Fleet</h3>
            <div className="space-y-4">
              {activeAgents.map((agent, i) => (
                <div key={i} className="flex items-center p-3 rounded-xl bg-surface border border-border-color hover:border-secondary transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mr-4 group-hover:shadow-glow-secondary transition-shadow">
                    <Activity className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-text-primary">{agent.name}</h4>
                    <p className="text-xs text-text-secondary">Queue: {agent.queue}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={cn("w-2 h-2 rounded-full", agent.status === 'Active' ? 'bg-success shadow-[0_0_8px_#00E5A0]' : agent.status === 'Processing' ? 'bg-warning shadow-[0_0_8px_#FFB800] animate-pulse' : 'bg-text-secondary')} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anomalies */}
          <div className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">System Anomalies</h3>
            <div className="space-y-4">
              {recentAnomalies.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-color hover:border-critical transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className={cn("p-2 rounded-lg text-white transition-shadow", item.severity === 'High' ? 'bg-critical shadow-glow-critical' : item.severity === 'Medium' ? 'bg-warning text-black' : 'bg-surface-raised border border-border-color')}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                      <p className="text-xs text-text-secondary">{item.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
