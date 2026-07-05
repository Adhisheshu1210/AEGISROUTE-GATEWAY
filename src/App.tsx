/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import OverviewTab from './components/OverviewTab';
import RouteOptimizer from './components/RouteOptimizer';
import AnalyticsTab from './components/AnalyticsTab';
import DocumentationTab from './components/DocumentationTab';
import LoginScreen from './components/LoginScreen';
import SecurityHub from './components/SecurityHub';
import NotificationConsole from './components/NotificationConsole';
import ReportingTab from './components/ReportingTab';
import TestCenterTab from './components/TestCenterTab';
import { Shipment, DisruptionIncident, GpuMetric, DashboardStats } from './types';
import { AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'optimizer' | 'analytics' | 'notifications' | 'reports' | 'docs' | 'security' | 'tests'>('overview');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [incidents, setIncidents] = useState<DisruptionIncident[]>([]);
  const [gpuMetric, setGpuMetric] = useState<GpuMetric | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('aegis_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aegisroute_jwt_token'));
  const [user, setUser] = useState<any | null>(() => {
    const raw = localStorage.getItem('aegisroute_user_profile');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  
  // Interaction triggers
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isGpuRunning, setIsGpuRunning] = useState<boolean>(false);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'alert' | 'info' } | null>(null);

  // Fetch initial telemetry data from our Express server
  const fetchState = async () => {
    if (!token) return;
    try {
      const [shipmentRes, incidentRes, metricRes, statsRes] = await Promise.all([
        fetch('/api/shipments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/incidents', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/gpu-metrics', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (shipmentRes.status === 401 || incidentRes.status === 401) {
        handleLogout();
        return;
      }

      const [shipmentData, incidentData, metricData, statsData] = await Promise.all([
        shipmentRes.json(),
        incidentRes.json(),
        metricRes.json(),
        statsRes.json()
      ]);

      setShipments(shipmentData);
      setIncidents(incidentData);
      setGpuMetric(metricData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to sync state from AegisRoute backend API:', err);
      showNotification('State sync failed. Reconnecting...', 'alert');
    }
  };

  useEffect(() => {
    if (token) {
      fetchState();
      handleRefreshUser();
    }
  }, [token]);

  const showNotification = (msg: string, type: 'success' | 'alert' | 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('aegisroute_jwt_token', newToken);
    localStorage.setItem('aegisroute_user_profile', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    showNotification(`Welcome back, Operator ${newUser.name}!`, 'success');
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Logout request failed:', e);
      }
    }
    localStorage.removeItem('aegisroute_jwt_token');
    localStorage.removeItem('aegisroute_user_profile');
    setToken(null);
    setUser(null);
    setActiveTab('overview');
    showNotification('Session terminated. Gateway secured.', 'info');
  };

  const handleRefreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('aegisroute_user_profile', JSON.stringify(data.user));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Profile refresh sync failed:', e);
    }
  };

  // 1. Ingest/Trigger disruption incident
  const handleTriggerDisruption = async (type: 'hurricane' | 'port_congestion' | 'customs_delay') => {
    try {
      const res = await fetch('/api/disruptions/trigger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchState();
        showNotification(`Critical anomaly alert: ${type.toUpperCase().replace('_', ' ')} injected!`, 'alert');
      } else {
        showNotification(data.error || 'Trigger action rejected. Role credentials insufficient.', 'alert');
      }
    } catch (err) {
      console.error('Failed to trigger disruption:', err);
    }
  };

  // 2. Solve Disruption route with Gemini
  const handleSolveDisruption = async (shipmentId: string) => {
    setIsSolving(true);
    try {
      const res = await fetch('/api/shipments/reroute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shipmentId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchState();
        showNotification(`Gemini Rerouting confirmed for shipment! Timeline optimized.`, 'success');
      } else {
        showNotification(data.error || 'Gemini rerouting action rejected. Role credentials insufficient.', 'alert');
      }
    } catch (err) {
      console.error('Failed to calculate detour route with Gemini:', err);
      showNotification('Gemini rerouting calculation timed out. Retrying...', 'alert');
    } finally {
      setIsSolving(false);
    }
  };

  // 3. Run NVIDIA RAPIDS GPU Ingestion simulation
  const handleRunGpuPipeline = async () => {
    setIsGpuRunning(true);
    showNotification('Spawning 7,424 parallel thread grids in CUDA scheduler...', 'info');
    
    // Aesthetic pipeline latency delay
    setTimeout(async () => {
      try {
        const res = await fetch('/api/gpu/run', { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          await fetchState();
          showNotification('RAPIDS cuDF processed 14.2M rows in 1.15s!', 'success');
        } else {
          showNotification(data.error || 'Computation trigger rejected. Role credentials insufficient.', 'alert');
        }
      } catch (err) {
        console.error('Failed running GPU speedup simulation:', err);
      } finally {
        setIsGpuRunning(false);
      }
    }, 1500);
  };

  // 4. Reset entire platform state
  const handleResetSimulator = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        await fetchState();
        setSelectedShipmentId(null);
        showNotification('AegisRoute platform reset successful.', 'success');
      } else {
        showNotification(data.error || 'Reset action rejected. Role credentials insufficient.', 'alert');
      }
    } catch (err) {
      console.error('Resetting simulation state failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Quick navigation routing from overview list
  const handleSelectShipment = (id: string) => {
    setSelectedShipmentId(id);
    setActiveTab('optimizer');
  };

  // Guard Clause - Render custom secure gateway if session token is unauthenticated
  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex bg-[#09090b] text-zinc-100 min-h-screen">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onReset={handleResetSimulator}
        isResetting={isResetting}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main operational view port */}
      <main id="aegis-viewport" className="flex-1 p-6 space-y-6 overflow-y-auto max-h-screen relative scanline">
        
        {/* Real-time Dynamic Notification Toast Banner */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 p-4 rounded border shadow-2xl transition-all duration-300 max-w-sm animate-bounce ${
            notification.type === 'success' 
              ? 'bg-zinc-950 border-blue-500 text-blue-400' 
              : notification.type === 'alert'
              ? 'bg-zinc-950 border-red-500 text-red-400'
              : 'bg-zinc-950 border-zinc-800 text-zinc-300'
          }`}>
            {notification.type === 'success' && <ShieldCheck className="w-5 h-5 text-blue-500" />}
            {notification.type === 'alert' && <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />}
            {notification.type === 'info' && <HelpCircle className="w-5 h-5 text-zinc-400" />}
            
            <span className="text-xs font-mono font-medium">{notification.message}</span>
          </div>
        )}

        {/* Global Operational Header */}
        <header className="flex flex-col md:flex-row justify-between md:items-center border-b border-zinc-800 pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white font-sans">
              {activeTab === 'overview' && 'Disruption Control Room'}
              {activeTab === 'optimizer' && 'Adaptive Detour & Routing Intelligence'}
              {activeTab === 'analytics' && 'Spark-RAPIDS Computational Insights'}
              {activeTab === 'notifications' && 'Operational Notification Console'}
              {activeTab === 'reports' && 'Operations Compliance & Intelligence Reports'}
              {activeTab === 'tests' && 'Security & Quality Testing Center'}
              {activeTab === 'docs' && 'Technical Reference & Architecture'}
              {activeTab === 'security' && 'Identity & Security Terminal'}
            </h1>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-widest font-bold">
              {activeTab === 'overview' && 'Live Ingestion Radar • Google Cloud Platform Pods'}
              {activeTab === 'optimizer' && 'Solving critical shipping corridor path blockages with Gemini Reasoning'}
              {activeTab === 'analytics' && 'Visualizing the 2000x NVIDIA L4 speedup metrics'}
              {activeTab === 'notifications' && 'Configure custom layout templates, SMS gateways, slack hooks, and multi-factor escalation trees'}
              {activeTab === 'reports' && 'Export PDF summaries, Excel spread audits, CSV datasets, and interactive PowerPoint slide decks'}
              {activeTab === 'tests' && 'Execute Unit, Integration, Performance, GPU FLOPS Benchmarks, Load, Security, and API Gateway Tests'}
              {activeTab === 'docs' && 'Production deployment profiles, specs, and configurations'}
              {activeTab === 'security' && 'Multi-factor authentication, active JWT session logs, and audit ledgers'}
            </p>
          </div>

          <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const nextTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(nextTheme);
                localStorage.setItem('aegis_theme', nextTheme);
              }}
              className="px-3.5 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-850 bg-zinc-900/40 text-zinc-300 hover:text-white transition-all flex items-center gap-2 text-xs font-mono font-bold cursor-pointer"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? (
                <>
                  <span className="text-yellow-500 font-sans">☀️</span> Light Mode
                </>
              ) : (
                <>
                  <span className="text-blue-400 font-sans">🌙</span> Dark Mode
                </>
              )}
            </button>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded px-4 py-2 flex items-center space-x-3 font-mono text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-zinc-300">GPU PIPELINE: CONNECTED</span>
              </div>
              <span className="text-zinc-700">|</span>
              <div className="text-zinc-400">
                UTC: {new Date().toISOString().substring(11, 19)}
              </div>
            </div>
          </div>
        </header>

        {/* Render respective tab contents with high-fidelity transitions */}
        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {stats && gpuMetric && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                {activeTab === 'overview' && (
                  <OverviewTab 
                    shipments={shipments}
                    incidents={incidents}
                    gpuMetric={gpuMetric}
                    stats={stats}
                    onTriggerDisruption={handleTriggerDisruption}
                    onRunGpuPipeline={handleRunGpuPipeline}
                    onSelectShipment={handleSelectShipment}
                    isGpuRunning={isGpuRunning}
                  />
                )}

                {activeTab === 'optimizer' && (
                  <RouteOptimizer 
                    shipments={shipments}
                    incidents={incidents}
                    selectedShipmentId={selectedShipmentId}
                    setSelectedShipmentId={setSelectedShipmentId}
                    onSolveDisruption={handleSolveDisruption}
                    isSolving={isSolving}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsTab theme={theme} token={token} />
                )}

                {activeTab === 'docs' && (
                  <DocumentationTab />
                )}

                {activeTab === 'security' && (
                  <SecurityHub 
                    token={token}
                    user={user}
                    onRefreshUser={handleRefreshUser}
                    showNotification={showNotification}
                  />
                )}

                {activeTab === 'notifications' && (
                  <NotificationConsole 
                    token={token}
                    user={user}
                    showNotification={showNotification}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportingTab theme={theme} token={token} />
                )}

                {activeTab === 'tests' && (
                  <TestCenterTab />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
