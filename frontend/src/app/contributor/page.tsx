"use client";

import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { User, Target, Flame, Star, Hexagon, Medal, Award, Code, CheckCircle, Gift, Play } from "lucide-react";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const habitData = [
  { day: 'Mon', commits: 2, prs: 1 },
  { day: 'Tue', commits: 6, prs: 0 },
  { day: 'Wed', commits: 4, prs: 2 },
  { day: 'Thu', commits: 8, prs: 1 },
  { day: 'Fri', commits: 10, prs: 3 },
  { day: 'Sat', commits: 3, prs: 0 },
  { day: 'Sun', commits: 7, prs: 1 },
];

const statsData = [
  { name: 'Jan', value: 6 },
  { name: 'Feb', value: 11 },
  { name: 'Mar', value: 18 },
  { name: 'Apr', value: 10 },
  { name: 'May', value: 23 },
];

const skills = [
  { name: "Code Quality", level: 85, icon: <Code className="w-4 h-4" />, color: "bg-primary" },
  { name: "Issue Resolution", level: 60, icon: <Target className="w-4 h-4" />, color: "bg-secondary" },
  { name: "PR Reviewing", level: 40, icon: <Star className="w-4 h-4" />, color: "bg-accent" },
  { name: "Architecture", level: 75, icon: <Hexagon className="w-4 h-4" />, color: "bg-success" },
  { name: "Mentorship", level: 90, icon: <Flame className="w-4 h-4" />, color: "bg-warning" },
];

const matchyTapes = [
  { name: "Code Agent", role: "Reviewer", status: "Active" },
  { name: "Fix Agent", role: "Debugger", status: "Idle" },
  { name: "Health Agent", role: "Monitor", status: "Active" },
];

const marketplace = [
  { title: "Code Refactoring", points: 80, percentage: 85 },
  { title: "Bug Fixing", points: 30, percentage: 32 },
  { title: "Documentation", points: 55, percentage: 71 },
];

export default function ContributorDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary drop-shadow-[0_0_10px_rgba(224,40,204,0.5)]">
            SOLO LEVELING
          </h1>
          <p className="text-text-secondary text-sm">System Dashboard</p>
        </div>
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
          
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-primary p-1 shadow-glow-accent">
                <img src="https://github.com/torvalds.png" alt="torvalds" className="w-full h-full rounded-full border-4 border-surface-raised object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-surface-raised text-xs font-bold px-2 py-1 rounded-md border border-accent text-accent shadow-glow-accent">
                Lv. 42
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-text-primary">torvalds</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/30">S-Class Contributor</span>
              </div>
              <div className="mt-3 text-sm text-text-secondary grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center space-x-1"><Flame className="w-3 h-3 text-warning"/><span>Streak: 12</span></div>
                <div className="flex items-center space-x-1"><Medal className="w-3 h-3 text-success"/><span>Rank: #4</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-8">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>XP to next level</span>
              <span>12,450 / 15,000 XP</span>
            </div>
            <div className="h-3 w-full bg-surface rounded-full overflow-hidden border border-border-color">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary to-accent shadow-glow-accent relative"
                initial={{ width: 0 }}
                animate={{ width: "83%" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* --- Habit Tracker --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Habit Tracker</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D838CB" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#6E56CF" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(110, 86, 207, 0.1)" vertical={false} />
                <XAxis dataKey="day" stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#151525', borderColor: 'rgba(110, 86, 207, 0.4)', borderRadius: '8px' }}
                  itemStyle={{ color: '#EAEAF5' }}
                />
                <Bar dataKey="commits" fill="url(#colorCommits)" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
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
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shadow-glow", skill.color, skill.color.replace('bg-', 'text-background'))}>
                      {skill.icon}
                    </div>
                    <span className="font-medium">{skill.name}</span>
                  </div>
                  <span className="text-text-secondary text-xs">{skill.level}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <motion.div 
                    className={cn("h-full", skill.color)}
                    style={{ boxShadow: `0 0 10px var(--tw-colors-${skill.color.replace('bg-', '')})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.level}%` }}
                    transition={{ duration: 1, delay: 0.3 + (index * 0.1) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* --- Activity Stats --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-2 bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Performance Matrix</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4FF" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#6E56CF" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888AA" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#151525', borderColor: 'rgba(0, 212, 255, 0.4)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="url(#colorStats)" radius={[6, 6, 0, 0]} barSize={40}>
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="url(#colorStats)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Goal Completion --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow relative flex flex-col items-center justify-center"
        >
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6 self-start w-full">Goal Completion</h3>
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
                animate={{ strokeDashoffset: 502 - (502 * 0.75) }} // 75% complete
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">
                <CountUp end={75} duration={2} delay={0.5} suffix="%" />
              </span>
              <span className="text-xs text-accent font-bold tracking-widest mt-1 text-center">XP</span>
            </div>
          </div>
          <div className="w-full mt-6 space-y-2 text-sm text-text-secondary">
            <div className="flex items-center justify-between"><span className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-success"/> Tasks Done</span> <span>45</span></div>
            <div className="flex items-center justify-between"><span className="flex items-center"><Award className="w-4 h-4 mr-2 text-warning"/> Achievements</span> <span>12</span></div>
          </div>
        </motion.div>

        {/* --- Marketplace / Quests --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Matchy Tapes / Agents */}
          <div className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Party Members (Agents)</h3>
            <div className="space-y-4">
              {matchyTapes.map((agent, i) => (
                <div key={i} className="flex items-center p-3 rounded-xl bg-surface border border-border-color hover:border-primary transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-4 group-hover:shadow-glow transition-shadow">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-text-primary">{agent.name}</h4>
                    <p className="text-xs text-text-secondary">{agent.role}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={cn("w-2 h-2 rounded-full", agent.status === 'Active' ? 'bg-success shadow-[0_0_8px_#00E5A0]' : 'bg-text-secondary')} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div className="bg-surface-raised border border-border-color rounded-2xl p-6 shadow-glow">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Quests Marketplace</h3>
            <div className="space-y-4">
              {marketplace.map((item, i) => (
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
          </div>

        </motion.div>
      </div>
    </div>
  );
}
