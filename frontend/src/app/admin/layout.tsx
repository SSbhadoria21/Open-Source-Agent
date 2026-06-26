"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Target, Copy, Tag, Users, Activity, FileText, Settings, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: <BarChart2 className="w-5 h-5" /> },
    { name: "Triage Agent", path: "/admin/triage", icon: <Target className="w-5 h-5" /> },
    { name: "Duplicates", path: "/admin/duplicates", icon: <Copy className="w-5 h-5" /> },
    { name: "Label Agent", path: "/admin/labels", icon: <Tag className="w-5 h-5" /> },
    { name: "Matching", path: "/admin/matching", icon: <Users className="w-5 h-5" /> },
    { name: "Health Dashboard", path: "/admin/health", icon: <Activity className="w-5 h-5" /> },
    { name: "PR Review", path: "/admin/review", icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-color bg-surface/50 backdrop-blur-md flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-border-color flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary to-primary p-[2px]">
              <img src="https://github.com/gaearon.png" alt="User" className="w-full h-full rounded-full border-2 border-background" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">gaearon</h3>
              <span className="text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded-full inline-block mt-1">Admin</span>
            </div>
          </div>
          
          <select className="w-full bg-surface border border-border-color text-text-primary text-sm rounded-md px-3 py-2 outline-none focus:border-secondary">
            <option>facebook/react</option>
            <option>facebook/react-native</option>
            <option>facebook/flux</option>
          </select>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path}>
                <div className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all relative overflow-hidden group",
                  isActive ? "text-secondary" : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                )}>
                  {isActive && (
                    <motion.div 
                      layoutId="activeAdminTab"
                      className="absolute inset-0 bg-secondary/10 border-l-2 border-secondary"
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

        <div className="p-4 border-t border-border-color mt-auto">
          <div className="flex items-center space-x-3 px-4 py-3 text-text-secondary hover:text-text-primary transition-colors cursor-pointer rounded-lg hover:bg-surface-raised">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </div>
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
