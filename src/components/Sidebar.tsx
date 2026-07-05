/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Compass, 
  MapPin, 
  BarChart2, 
  FileText, 
  Zap, 
  ShieldCheck, 
  RefreshCw,
  ShieldAlert,
  LogOut,
  Bell,
  FileSpreadsheet
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'optimizer' | 'analytics' | 'notifications' | 'reports' | 'docs' | 'security' | 'tests';
  setActiveTab: (tab: 'overview' | 'optimizer' | 'analytics' | 'notifications' | 'reports' | 'docs' | 'security' | 'tests') => void;
  onReset: () => void;
  isResetting: boolean;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onReset, isResetting, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'overview', name: 'Real-Time Control Room', icon: Compass, badge: 'LIVE' },
    { id: 'optimizer', name: 'Gemini Rerouting AI', icon: MapPin, badge: 'AGENT' },
    { id: 'analytics', name: 'Looker GPU Analytics', icon: BarChart2, badge: '2000X' },
    { id: 'notifications', name: 'Notification Console', icon: Bell },
    { id: 'reports', name: 'Operations Reports', icon: FileSpreadsheet },
    { id: 'tests', name: 'Test & Quality Suite', icon: ShieldCheck },
    { id: 'docs', name: 'System Architecture', icon: FileText },
    { id: 'security', name: 'Identity & Security', icon: ShieldAlert },
  ] as const;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Manager': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Driver': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-750';
    }
  };

  return (
    <aside id="aegis-sidebar" className="w-80 bg-[#09090b]/80 backdrop-blur-xl border-r border-zinc-800/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Logo and branding */}
        <div className="p-6 border-b border-zinc-800/60 bg-gradient-to-b from-black/40 to-transparent">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-sm font-black text-white shadow-lg shadow-blue-600/20 glow-blue">
              A
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest text-white block">AEGISROUTE</span>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold -mt-0.5">Supply Chain Intel</p>
            </div>
          </div>
        </div>

        {/* System Active Banner */}
        <div className="mx-4 my-4 p-3 bg-zinc-950/40 backdrop-blur-md rounded border border-zinc-800/60 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono font-bold tracking-tight">RAPIDS SPARK ACTIVE</span>
          </div>
          <div className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-extrabold uppercase">
            &lt; 2S INSIGHT
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 py-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`sidebar-tab-${item.id}`}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full relative group"
              >
                {/* Active backgrounds capsule */}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-gradient-to-r from-blue-900/15 to-zinc-900/10 border-l-2 border-blue-500 rounded"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                
                <div className={`w-full flex items-center justify-between px-4 py-2.5 rounded text-xs transition-all relative z-10 ${
                  isActive 
                    ? 'text-white font-semibold' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${isActive ? 'text-blue-500' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span>{item.name}</span>
                  </div>

                  {'badge' in item && (
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                      isActive 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-zinc-900 text-zinc-500 group-hover:text-zinc-400 border border-zinc-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer system details and Reset action */}
      <div className="p-4 border-t border-zinc-800/60 bg-gradient-to-t from-black/80 to-[#09090b]/40 space-y-4">
        
        {/* User Identity Profile Card */}
        {user && (
          <div className="p-3 bg-black/60 border border-zinc-900 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name} 
                  className="w-8 h-8 rounded border border-zinc-800 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs font-mono shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-white block truncate leading-tight">{user.name}</span>
                <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase border ${getRoleBadgeClass(user.role)} mt-1`}>
                  {user.role}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              id="btn-sidebar-signout"
              onClick={onLogout}
              title="Sign Out Session"
              className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-red-950/20 transition-all shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        )}

        {/* Gemini status board */}
        <div className="p-3 bg-zinc-950/50 backdrop-blur-md rounded border border-zinc-900 flex flex-col space-y-1 shadow-sm">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
            <span className="text-[10px] font-bold text-zinc-300 font-mono tracking-wide uppercase">Gemini Reasoning</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-normal">
            Evaluating multi-modal hazard coordinates & rerouting models globally.
          </p>
        </div>

        {/* Reset Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="btn-system-reset"
          onClick={onReset}
          disabled={isResetting}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded text-[11px] font-mono font-bold tracking-tight transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'RESETTING PLATFORM...' : 'RESET SIMULATOR'}</span>
        </motion.button>

        {/* GPU live telemetry status */}
        <div className="pt-2 border-t border-zinc-900">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-mono text-zinc-400 font-bold">RAPIDS_LIVE: ON</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">7,424 CORES</span>
          </div>
          <div className="bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 w-[78%] h-full rounded-full"></div>
          </div>
          <p className="text-[9px] mt-1.5 text-zinc-500 font-mono tracking-tight text-center">
            GPU CAP: 4.2 TFLOPS (NVIDIA L4 SPARK)
          </p>
        </div>
      </div>
    </aside>
  );
}
