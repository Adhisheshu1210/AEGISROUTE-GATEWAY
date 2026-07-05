/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shipment, 
  DisruptionIncident, 
  GpuMetric, 
  DashboardStats 
} from '../types';
import { 
  ShieldAlert, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Flame, 
  Cpu, 
  Zap, 
  Play, 
  MapPin, 
  ArrowRight,
  AlertTriangle,
  Compass,
  Activity,
  Layers,
  Database,
  Globe
} from 'lucide-react';

interface OverviewTabProps {
  shipments: Shipment[];
  incidents: DisruptionIncident[];
  gpuMetric: GpuMetric;
  stats: DashboardStats;
  onTriggerDisruption: (type: 'hurricane' | 'port_congestion' | 'customs_delay') => void;
  onRunGpuPipeline: () => void;
  onSelectShipment: (id: string) => void;
  isGpuRunning: boolean;
}

export default function OverviewTab({
  shipments,
  incidents,
  gpuMetric,
  stats,
  onTriggerDisruption,
  onRunGpuPipeline,
  onSelectShipment,
  isGpuRunning
}: OverviewTabProps) {
  const [hoveredShipment, setHoveredShipment] = useState<string | null>(null);

  // Unified mathematically accurate geographic projection map coordinate system (10N-60N, 0-360 Longitude)
  const mapCoords = (p: {lat: number; lng: number}) => {
    let lngNorm = p.lng < 0 ? p.lng + 360 : p.lng;
    const x = 50 + ((lngNorm % 360) / 360) * 850;
    const y = 380 - ((p.lat - 10) / 50) * 300;
    return { x, y };
  };

  // Real-world continent vector polygons for highly polished control room HUD
  const NorthAmerica = [
    { lat: 60, lng: -168 }, { lat: 60, lng: -140 }, { lat: 60, lng: -60 },
    { lat: 50, lng: -55 }, { lat: 40, lng: -74 }, { lat: 25, lng: -80 },
    { lat: 18, lng: -95 }, { lat: 10, lng: -83 }, { lat: 15, lng: -95 },
    { lat: 25, lng: -110 }, { lat: 34, lng: -120 }, { lat: 48, lng: -125 },
    { lat: 58, lng: -136 }
  ];

  const EurasiaEast = [
    { lat: 60, lng: 20 }, { lat: 60, lng: 100 }, { lat: 60, lng: 170 },
    { lat: 55, lng: 165 }, { lat: 45, lng: 142 }, { lat: 35, lng: 140 },
    { lat: 35, lng: 125 }, { lat: 22, lng: 115 }, { lat: 10, lng: 105 },
    { lat: 10, lng: 80 }, { lat: 20, lng: 70 }, { lat: 15, lng: 50 },
    { lat: 30, lng: 35 }, { lat: 35, lng: 40 }, { lat: 45, lng: 30 },
    { lat: 55, lng: 30 }
  ];

  const EuropeScandinavia = [
    { lat: 60, lng: 5 }, { lat: 60, lng: 25 }, { lat: 55, lng: 20 },
    { lat: 50, lng: 5 }, { lat: 40, lng: 5 }, { lat: 35, lng: 15 },
    { lat: 45, lng: 15 }, { lat: 50, lng: 10 }
  ];

  const WestEuropeFarRight = [
    { lat: 60, lng: -15 }, { lat: 60, lng: 0 }, { lat: 50, lng: 0 },
    { lat: 35, lng: 0 }, { lat: 10, lng: 0 }, { lat: 10, lng: -15 },
    { lat: 20, lng: -18 }, { lat: 30, lng: -10 }, { lat: 40, lng: -10 },
    { lat: 55, lng: -10 }
  ];

  const NorthAfrica = [
    { lat: 35, lng: 0 }, { lat: 35, lng: 30 }, { lat: 10, lng: 45 },
    { lat: 10, lng: 0 }, { lat: 25, lng: 15 }
  ];

  const Japan = [
    { lat: 43, lng: 140 }, { lat: 40, lng: 143 }, { lat: 35, lng: 140 },
    { lat: 32, lng: 130 }, { lat: 34, lng: 132 }, { lat: 38, lng: 138 }
  ];

  const continents = [
    { name: 'North America', points: NorthAmerica },
    { name: 'Eurasia East', points: EurasiaEast },
    { name: 'Europe / Scandinavia', points: EuropeScandinavia },
    { name: 'West Europe / Africa', points: WestEuropeFarRight },
    { name: 'North Africa', points: NorthAfrica },
    { name: 'Japan', points: Japan }
  ];

  // Helper to format currency
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 1. Dashboard Statistics Cards - Datadog & Snowflake inspired */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Fleet */}
        <div className="glass-card p-5 rounded-xl border border-zinc-800/80 flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest uppercase block">ACTIVE CARGO PATHS</span>
            <div className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">{stats.totalShipments} Lanes</div>
            <div className="flex space-x-2 mt-2.5 text-[10px] font-mono font-bold">
              <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{stats.ontimeCount} On-Time</span>
              <span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{stats.delayedCount} Delayed</span>
              <span className="text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">{stats.disruptedCount} Blocked</span>
            </div>
          </div>
          <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850 shadow-inner shrink-0 relative group-hover:border-blue-500/30 transition-all duration-300">
            <Compass className="w-5.5 h-5.5 text-zinc-400 group-hover:text-blue-400 transition-colors duration-300" />
          </div>
        </div>

        {/* Active Disruption Incidents */}
        <div className={`p-5 rounded-xl border flex items-center justify-between shadow-xl relative overflow-hidden group transition-all duration-300 ${
          stats.activeIncidentsCount > 0 
            ? 'bg-red-950/10 border-red-900/60 incident-glow' 
            : 'glass-card border-zinc-800/80'
        }`}>
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest uppercase block">CRITICAL DISRUPTIONS</span>
            <div className={`text-3xl font-extrabold mt-1.5 tracking-tight ${stats.activeIncidentsCount > 0 ? 'text-red-500' : 'text-white'}`}>
              {stats.activeIncidentsCount} Events
            </div>
            <p className="text-[10px] font-mono text-zinc-400 mt-3 flex items-center gap-1.5">
              <Activity className={`w-3.5 h-3.5 ${stats.activeIncidentsCount > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
              {stats.activeIncidentsCount > 0 
                ? 'NVIDIA GPUDirect active alerts' 
                : 'All logistics pipelines green'}
            </p>
          </div>
          <div className={`p-3 rounded-lg border transition-all duration-300 shrink-0 ${
            stats.activeIncidentsCount > 0 
              ? 'bg-red-950/60 border-red-800/50 text-red-500' 
              : 'bg-zinc-950/80 border-zinc-850 text-zinc-400 group-hover:border-red-500/30 group-hover:text-red-400'
          }`}>
            <ShieldAlert className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* At-Risk Cargo Value */}
        <div className="glass-card p-5 rounded-xl border border-zinc-800/80 flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest uppercase block">AT-RISK CARGO VALUE</span>
            <div className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              {formatUSD(stats.atRiskValueUsd)}
            </div>
            <p className="text-[9px] text-zinc-500 mt-3 font-mono uppercase tracking-wider">
              Total Assets: {formatUSD(shipments.reduce((acc, s) => acc + s.value, 0))}
            </p>
          </div>
          <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-850 shadow-inner shrink-0 group-hover:border-amber-500/30 transition-all duration-300">
            <DollarSign className="w-5.5 h-5.5 text-amber-500 group-hover:text-amber-400 transition-colors" />
          </div>
        </div>

        {/* Time-To-Insight RAPIDS */}
        <div className="glass-card p-5 rounded-xl border border-blue-500/20 flex items-center justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/[0.01] pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold text-blue-400 font-mono tracking-widest uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400 animate-bounce" /> NVIDIA SPEEDUP RATIO
            </span>
            <div className="text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              {gpuMetric.rapidsTimeSeconds}s <span className="text-xs font-normal text-zinc-500 font-mono">vs 38.5m</span>
            </div>
            <div className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded mt-3 font-mono inline-flex items-center gap-1 font-bold">
              ⚡ {gpuMetric.speedupMultiplier.toLocaleString()}X RAPIDS REDUCTION
            </div>
          </div>
          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-900/30 shadow-inner shrink-0 group-hover:border-blue-500/50 transition-all duration-300">
            <Cpu className="w-5.5 h-5.5 text-blue-400" />
          </div>
        </div>
      </motion.div>

      {/* 2. Main Live Grid Panel - Palantir Foundry style maps & widgets */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Live Shipping Track Grid (Interactive SVG Map) */}
        <div className="lg:col-span-2 bg-[#0d0d11]/90 backdrop-blur-md rounded-xl border border-zinc-800/80 p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[480px]">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/[0.02] to-transparent pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-800/60 pb-4 mb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400 animate-spin-slow" />
                  <h3 className="text-lg font-bold text-white tracking-tight">Geospatial Telemetry Control Room</h3>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase block mt-0.5">Real-Time Global Shipping Grid • NVIDIA Acceleration Enabled</span>
              </div>
              <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono font-bold bg-black/40 p-1.5 rounded border border-zinc-850">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>ON-TIME</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded"><span className="w-2 h-2 bg-amber-500 rounded-full"></span>DELAYED</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded"><span className="w-2 h-2 bg-red-500 rounded-full"></span>DISRUPTED</span>
              </div>
            </div>

            {/* Interactive SVG Map */}
            <div className="relative bg-black rounded-lg border border-zinc-850 p-4 overflow-hidden h-[340px] flex items-center justify-center">
              {/* Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181c_1px,transparent_1px),linear-gradient(to_bottom,#18181c_1px,transparent_1px)] bg-[size:24px_24px] opacity-45"></div>
              
              <svg className="w-full h-full min-h-[300px] select-none" viewBox="0 0 1000 450">
                {/* Real-world projected coordinate landmasses */}
                {continents.map((c, idx) => {
                  const projected = c.points.map(mapCoords);
                  const pathD = `M ${projected[0].x} ${projected[0].y} ` + 
                    projected.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
                  return (
                    <path 
                      key={idx} 
                      d={pathD} 
                      fill="rgba(15, 23, 42, 0.45)" 
                      stroke="rgba(63, 63, 70, 0.25)" 
                      strokeWidth="1.2" 
                    />
                  );
                })}

                {/* Laser radar coordinate line sweep */}
                <line x1="0" y1="225" x2="1000" y2="225" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1" />
                <line x1="500" y1="0" x2="500" y2="450" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1" />

                {/* Draw shipping routes */}
                {shipments.map((s) => {
                  const points = s.currentRoutePoints;
                  if (points.length < 2) return null;

                  const svgPoints = points.map(mapCoords);
                  let pathD = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
                  for (let i = 1; i < svgPoints.length; i++) {
                    const xc = (svgPoints[i-1].x + svgPoints[i].x) / 2;
                    const yc = (svgPoints[i-1].y + svgPoints[i].y) / 2 - 15;
                    pathD += ` Q ${xc} ${yc} ${svgPoints[i].x} ${svgPoints[i].y}`;
                  }

                  const isHovered = hoveredShipment === s.id;
                  let strokeColor = 'rgba(59, 130, 246, 0.4)'; // ontime
                  if (s.status === 'disrupted') strokeColor = '#ef4444';
                  if (s.status === 'delayed') strokeColor = '#f59e0b';
                  if (isHovered) strokeColor = '#10b981';

                  const hasOptimized = s.optimizedRoutePoints && s.optimizedRoutePoints.length > 0;
                  const optSvgPoints = hasOptimized ? s.optimizedRoutePoints!.map(mapCoords) : [];
                  let optPathD = '';
                  if (hasOptimized && optSvgPoints.length > 0) {
                    optPathD = `M ${optSvgPoints[0].x} ${optSvgPoints[0].y}`;
                    for (let i = 1; i < optSvgPoints.length; i++) {
                      const xc = (optSvgPoints[i-1].x + optSvgPoints[i].x) / 2;
                      const yc = (optSvgPoints[i-1].y + optSvgPoints[i].y) / 2 - 25;
                      optPathD += ` Q ${xc} ${yc} ${optSvgPoints[i].x} ${optSvgPoints[i].y}`;
                    }
                  }

                  const currentPixel = mapCoords(s.currentCoords);

                  return (
                    <g 
                      key={s.id} 
                      onMouseEnter={() => setHoveredShipment(s.id)} 
                      onMouseLeave={() => setHoveredShipment(null)}
                      className="cursor-pointer"
                      onClick={() => onSelectShipment(s.id)}
                    >
                      {/* Original Path */}
                      <path 
                        d={pathD} 
                        fill="none" 
                        stroke={strokeColor} 
                        strokeWidth={isHovered ? 3.5 : 1.5} 
                        strokeDasharray={s.status === 'disrupted' ? "5 4" : "none"}
                        opacity={isHovered ? 1 : s.status === 'disrupted' ? 0.8 : 0.45}
                        className="transition-all duration-350"
                      />

                      {/* Optimized detour path dashed in bright teal */}
                      {hasOptimized && (
                        <path 
                          d={optPathD} 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth={2.5} 
                          strokeDasharray="5 3"
                          opacity={0.9}
                          className="animate-[dash_10s_linear_infinite]"
                        />
                      )}

                      {/* Origin Node */}
                      <circle cx={svgPoints[0].x} cy={svgPoints[0].y} r="3.5" fill="#000000" stroke={strokeColor} strokeWidth="1.5" />
                      
                      {/* Destination Node */}
                      <circle cx={svgPoints[svgPoints.length-1].x} cy={svgPoints[svgPoints.length-1].y} r="4.5" fill={s.status === 'ontime' ? '#3b82f6' : '#f59e0b'} stroke="#000000" strokeWidth="1.5" />
                      <text x={svgPoints[svgPoints.length-1].x + 8} y={svgPoints[svgPoints.length-1].y + 3} fill="#a1a1aa" fontSize="9" className="font-mono font-bold">
                        {s.destination.split(' ')[0]}
                      </text>

                      {/* Current Carrier Position Dot with multiple radar pulse echoes */}
                      <g transform={`translate(${currentPixel.x}, ${currentPixel.y})`}>
                        <circle cx="0" cy="0" r={isHovered ? "7" : "4.5"} fill={s.status === 'disrupted' ? '#ef4444' : s.status === 'delayed' ? '#f59e0b' : '#3b82f6'} className="animate-pulse" />
                        <circle cx="0" cy="0" r="12" fill="none" stroke={s.status === 'disrupted' ? '#ef4444' : s.status === 'delayed' ? '#f59e0b' : '#3b82f6'} strokeWidth="1" opacity={isHovered ? 0.7 : 0.15} className="animate-ping" />
                        
                        {/* Interactive HUD Details on Hover */}
                        {isHovered && (
                          <g transform="translate(14, -20)" className="pointer-events-none">
                            <rect width="180" height="52" rx="4" fill="rgba(8, 8, 10, 0.95)" stroke="#3f3f46" strokeWidth="1" className="shadow-2xl" />
                            <text x="10" y="18" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">{s.code} • {s.carrier}</text>
                            <text x="10" y="32" fill="#a1a1aa" fontSize="8.5" fontFamily="monospace">CARGO: {formatUSD(s.value)}</text>
                            <text x="10" y="43" fill={s.status === 'disrupted' ? '#ef4444' : s.status === 'delayed' ? '#f59e0b' : '#3b82f6'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              STATUS: {s.status.toUpperCase()} {s.delayHours > 0 ? `(+${s.delayHours}H)` : ''}
                            </text>
                          </g>
                        )}
                      </g>
                    </g>
                  );
                })}

                {/* Draw active incident hazard circles */}
                {incidents.map((inc) => {
                  const { x, y } = mapCoords(inc.coordinates);
                  const pxRadius = inc.type === 'hurricane' ? 45 : inc.type === 'port_congestion' ? 25 : 15;

                  return (
                    <g key={inc.id}>
                      {/* Outer alarm rings */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={pxRadius + 20} 
                        fill="rgba(239, 68, 68, 0.03)" 
                        stroke="rgba(239, 68, 68, 0.15)" 
                        strokeWidth="0.75" 
                        strokeDasharray="2 4"
                        className="animate-spin-slow"
                      />
                      {/* Core hazard zone */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={pxRadius} 
                        fill="rgba(239, 68, 68, 0.1)" 
                        stroke="#ef4444" 
                        strokeWidth="1.2" 
                        strokeDasharray="4 4"
                      />
                      {/* Center pin node */}
                      <circle cx={x} cy={y} r="3" fill="#ef4444" />
                      
                      {/* High-fidelity labels */}
                      <text x={x - 45} y={y - pxRadius - 6} fill="#ef4444" fontSize="8" fontWeight="black" className="font-mono tracking-tight bg-black">
                        ⚠️ {inc.title.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Status Alert Overlay when active disruption exists */}
              {stats.disruptedCount > 0 && (
                <div className="absolute bottom-3 left-3 bg-red-950/80 backdrop-blur-md border border-red-900/50 px-3 py-2 rounded-lg flex items-center space-x-2 text-[11px] text-red-300 shadow-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce shrink-0" />
                  <span className="font-mono">Critical corridor disruption detected. Rerouting model recommended.</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono flex justify-between mt-3.5 pt-3.5 border-t border-zinc-900">
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-zinc-600" /> Mercator Grid Simulator Pro v1.4</span>
            <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-zinc-600" /> NVIDIA cuDF Map Correlation Active</span>
          </div>
        </div>

        {/* Right Side: Operational Control Widgets */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* A. Trigger Disruption Simulator Panel */}
          <div className="glass-panel rounded-xl border border-zinc-800/80 p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-3 border-b border-zinc-900 pb-3">
                <Flame className="w-4.5 h-4.5 text-red-500 fill-red-500/15" />
                <h3 className="font-bold text-white tracking-tight text-sm">Disruption Injection Portal</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Trigger structural bottlenecks or weather delays to benchmark GPU speedup ratios and evaluate automated detour solutions.
              </p>

              <div className="space-y-2.5">
                {/* Hurricane Trigger */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  id="btn-trigger-hurricane"
                  onClick={() => onTriggerDisruption('hurricane')}
                  disabled={incidents.some(i => i.type === 'hurricane')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-black/60 hover:bg-zinc-950 border border-zinc-850 text-left text-xs transition-all disabled:opacity-40 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    <div>
                      <div className="font-bold text-white group-hover:text-red-400 transition-colors">Gulf Coast Hurricane</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Maritime Channel Lock</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                    INJECT
                  </span>
                </motion.button>

                {/* Port Congestion Trigger */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  id="btn-trigger-port"
                  onClick={() => onTriggerDisruption('port_congestion')}
                  disabled={incidents.some(i => i.type === 'port_congestion')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-black/60 hover:bg-zinc-950 border border-zinc-850 text-left text-xs transition-all disabled:opacity-40 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    <div>
                      <div className="font-bold text-white group-hover:text-amber-400 transition-colors">Terminal Yard Walkout</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Port of LA Logistics Hub</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-amber-950/80 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                    INJECT
                  </span>
                </motion.button>

                {/* Customs Blockade Trigger */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  id="btn-trigger-customs"
                  onClick={() => onTriggerDisruption('customs_delay')}
                  disabled={incidents.some(i => i.type === 'customs_delay')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-black/60 hover:bg-zinc-950 border border-zinc-850 text-left text-xs transition-all disabled:opacity-40 group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <div>
                      <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Customs System Outage</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Schengen Venlo Gateway</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-blue-950/80 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded font-mono font-bold uppercase shrink-0">
                    INJECT
                  </span>
                </motion.button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-900 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
              <span>ACTIVE BOTTLENECKS: {incidents.length}</span>
              <span>STATE MATCH: VALID</span>
            </div>
          </div>

          {/* B. GPU Accelerated Pipeline Recalculator Panel */}
          <div className="glass-panel rounded-xl border border-zinc-800/80 p-5 shadow-xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-3">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4.5 h-4.5 text-blue-400" />
                  <h3 className="font-bold text-white tracking-tight text-sm">RAPIDS Ingestion Pipeline</h3>
                </div>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  CUDA 12.2
                </span>
              </div>
              
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                NVIDIA Spark-RAPIDS on GKE L4 nodes processes weather and GPS telemetry in real-time, executing in seconds instead of legacy CPU times.
              </p>

              {/* Performance Visualizer Gauge */}
              <div className="p-4 bg-black/40 rounded-lg border border-zinc-900 space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-400 font-mono">Legacy CPU Cluster Run:</span>
                  <span className="font-bold text-red-400 font-mono">38.5m (2,310s)</span>
                </div>
                <div className="w-full bg-zinc-950 border border-zinc-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-red-400 h-full w-full opacity-60 rounded-full"></div>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1.5">
                  <span className="text-blue-400 font-bold font-mono">GKE L4 GPU Nodes:</span>
                  <span className="font-bold text-blue-400 font-mono">{gpuMetric.rapidsTimeSeconds} seconds</span>
                </div>
                <div className="w-full bg-zinc-950 border border-zinc-900 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className={`bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-[1500ms] ${
                      isGpuRunning ? 'w-full animate-pulse' : 'w-[5%]'
                    }`}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                id="btn-run-gpu-pipeline"
                onClick={onRunGpuPipeline}
                disabled={isGpuRunning}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-lg text-xs font-mono transition-all disabled:opacity-50 shadow-lg shadow-blue-600/10 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                <span>{isGpuRunning ? 'PROCESSING TFLOPS...' : 'RUN RAPIDS PIPELINE (14.2M ROWS)'}</span>
              </motion.button>

              <div className="mt-3 text-[9px] text-zinc-500 font-mono flex justify-between">
                <span>Processed: {gpuMetric.recordsProcessed.toLocaleString()} rows</span>
                <span>Throughput: {gpuMetric.throughputMsGpu.toLocaleString()}/ms</span>
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 3. Bottom Cargo Fleet Registry List */}
      <motion.div variants={itemVariants} className="bg-[#0d0d11]/90 backdrop-blur-md rounded-xl border border-zinc-800/80 p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-800/60 pb-4 mb-4 gap-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Active Lane Registry</h3>
            <p className="text-xs text-zinc-400">Direct operational telemetry of trans-national logistics corridors</p>
          </div>
          <span className="text-[11px] bg-zinc-950/80 px-3 py-1 rounded border border-zinc-850 text-zinc-300 font-mono font-bold inline-block self-start sm:self-auto">
            {shipments.length} Active Shipments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="text-[10px] uppercase bg-black/40 font-mono text-zinc-400 border-b border-zinc-850">
              <tr>
                <th className="p-4 font-bold tracking-wider">Cargo / Carrier</th>
                <th className="p-4 font-bold tracking-wider">Value</th>
                <th className="p-4 font-bold tracking-wider">Operational Route</th>
                <th className="p-4 font-bold tracking-wider">Telemetry Ingestion</th>
                <th className="p-4 font-bold tracking-wider">SLA Status</th>
                <th className="p-4 font-bold tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 bg-black/10">
              {shipments.map((s) => {
                let statusBadge = (
                  <span className="px-2 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold">
                    ON-TIME
                  </span>
                );
                if (s.status === 'delayed') {
                  statusBadge = (
                    <span className="px-2 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono font-bold">
                      DELAY (+{s.delayHours}H)
                    </span>
                  );
                } else if (s.status === 'disrupted') {
                  statusBadge = (
                    <span className="px-2 py-0.5 text-[10px] rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-bold animate-pulse">
                      BLOCKED
                    </span>
                  );
                }

                return (
                  <tr 
                    key={s.id} 
                    className="hover:bg-zinc-950/40 transition-colors duration-200"
                    onMouseEnter={() => setHoveredShipment(s.id)}
                    onMouseLeave={() => setHoveredShipment(null)}
                  >
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{s.code}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{s.carrier}</div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-100 font-mono">
                      {formatUSD(s.value)}
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-white font-semibold">{s.origin} → {s.destination}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Atmosphere: {s.weatherCondition}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-zinc-950 border border-zinc-900 h-1.5 rounded-full overflow-hidden shrink-0">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full" style={{ width: `${s.progress}%` }}></div>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 font-bold">{s.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {statusBadge}
                    </td>
                    <td className="p-4">
                      {s.status === 'disrupted' ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          id={`btn-reroute-solve-${s.id}`}
                          onClick={() => onSelectShipment(s.id)}
                          className="flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold font-mono transition-all shadow-md animate-pulse cursor-pointer"
                        >
                          <span>SOLVE REROUTE</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          id={`btn-reroute-view-${s.id}`}
                          onClick={() => onSelectShipment(s.id)}
                          className="flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-[10px] font-mono transition-all border border-zinc-850 cursor-pointer"
                        >
                          <span>VIEW DETAILS</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
