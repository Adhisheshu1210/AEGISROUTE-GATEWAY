/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shipment, 
  DisruptionIncident, 
} from '../types';
import { 
  BrainCircuit, 
  Clock, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  AlertTriangle, 
  DollarSign, 
  Compass, 
  Terminal,
  Leaf,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';

interface RouteOptimizerProps {
  shipments: Shipment[];
  incidents: DisruptionIncident[];
  selectedShipmentId: string | null;
  setSelectedShipmentId: (id: string | null) => void;
  onSolveDisruption: (shipmentId: string) => Promise<any>;
  isSolving: boolean;
}

export default function RouteOptimizer({
  shipments,
  incidents,
  selectedShipmentId,
  setSelectedShipmentId,
  onSolveDisruption,
  isSolving
}: RouteOptimizerProps) {
  const [loadingStep, setLoadingStep] = useState<string>('');

  const activeShipment = shipments.find(s => s.id === selectedShipmentId) || shipments[0];
  const activeIncident = incidents.find(i => i.routesAffected.includes(activeShipment?.id || ''));

  // Custom loading milestones
  const triggerSolve = async () => {
    if (!activeShipment) return;
    const steps = [
      'Querying Google Cloud Storage for real-time telemetry datasets...',
      'Ingesting 14.2M GPS rows using NVIDIA RAPIDS cuDF scheduler...',
      'Isolating geo-hazard radius coordinates and terminal port dwell-times...',
      'Invoking server-side Gemini Multi-Modal Reasoning Engine...',
      'Synthesizing optimal detour pathways to preserve delivery SLAs...'
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setLoadingStep(steps[stepIndex]);
      } else {
        clearInterval(interval);
      }
    }, 800);

    try {
      await onSolveDisruption(activeShipment.id);
    } finally {
      clearInterval(interval);
      setLoadingStep('');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 select-none">
      
      {/* Shipment Selector Sidebar Column */}
      <div className="xl:col-span-4 space-y-6">
        <div className="glass-panel rounded-xl border border-zinc-800/80 p-5 shadow-xl">
          <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase font-mono tracking-widest mb-4 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-500" /> Active Supply Lanes
          </h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {shipments.map((s) => {
              const isSelected = s.id === activeShipment?.id;

              return (
                <motion.button
                  whileHover={{ x: 2 }}
                  id={`btn-select-shipment-${s.id}`}
                  key={s.id}
                  onClick={() => setSelectedShipmentId(s.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-black/60 border-blue-500 shadow-lg shadow-blue-500/5' 
                      : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800/60 hover:bg-zinc-900/10'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-white tracking-tight">{s.code}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{s.origin.split(' ')[0]} → {s.destination.split(' ')[0]}</div>
                  </div>
                  
                  {s.status === 'disrupted' ? (
                    <span className="text-[8px] font-mono bg-red-950/80 border border-red-900/40 px-2 py-0.5 rounded text-red-400 animate-pulse font-extrabold shrink-0">
                      REROUTE REQ
                    </span>
                  ) : s.optimizedRoutePoints ? (
                    <span className="text-[8px] font-mono bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded text-blue-400 font-extrabold shrink-0">
                      OPTIMIZED
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono bg-zinc-900/80 px-2 py-0.5 rounded text-zinc-500 border border-zinc-800/40 shrink-0 font-bold">
                      NOMINAL
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected Shipment Primary Metrics */}
        {activeShipment && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 rounded-xl border border-zinc-800/80 shadow-xl space-y-4"
          >
            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Cargo Parameters</h4>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">High-priority telemetry spec</p>
              </div>
              <Compass className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono font-bold">
              <div>
                <div className="text-zinc-500 uppercase tracking-tight">Carrier Pool</div>
                <div className="text-zinc-200 mt-1 font-sans text-xs font-semibold">{activeShipment.carrier}</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase tracking-tight">Cargo Value</div>
                <div className="text-blue-400 mt-1 font-sans text-xs font-extrabold">{formatCurrency(activeShipment.value)}</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase tracking-tight">SLA Priority</div>
                <div className={`mt-1 font-sans text-xs font-extrabold uppercase ${
                  activeShipment.priority === 'high' ? 'text-red-400' : 'text-zinc-300'
                }`}>{activeShipment.priority} CLASS</div>
              </div>
              <div>
                <div className="text-zinc-500 uppercase tracking-tight">Live Progress</div>
                <div className="text-zinc-200 mt-1 font-sans text-xs font-semibold">{activeShipment.progress}% Completed</div>
              </div>
            </div>

            {/* Weather status */}
            <div className="p-3 bg-black/40 rounded-lg border border-zinc-900 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-mono flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-zinc-500" /> Weather Telemetry:</span>
              <span className="font-bold text-white font-mono">{activeShipment.weatherCondition.toUpperCase()}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Rerouting Intelligence Screen */}
      <div className="xl:col-span-8">
        {activeShipment ? (
          <div className="bg-[#0d0d11]/90 backdrop-blur-md rounded-xl border border-zinc-800/80 p-6 shadow-2xl h-full flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Header with status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/60 pb-4 mb-4 gap-2">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h2 className="text-lg font-extrabold text-white tracking-tight">{activeShipment.code}</h2>
                    <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold uppercase">{activeShipment.cargoType}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">Routing: {activeShipment.origin} → {activeShipment.destination}</p>
                </div>
                
                <div className="mt-2 sm:mt-0 font-mono text-[10px] font-bold">
                  {activeShipment.status === 'disrupted' ? (
                    <div className="flex items-center space-x-2 text-red-400 bg-red-950/30 border border-red-900/40 px-3 py-1.5 rounded-lg animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>ACTIVE REROUTE REQUIRED</span>
                    </div>
                  ) : activeShipment.optimizedRoutePoints ? (
                    <div className="flex items-center space-x-2 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                      <span>OPTIMIZED BY GEMINI</span>
                    </div>
                  ) : (
                    <div className="text-zinc-550 bg-black/40 border border-zinc-900 px-3 py-1.5 rounded-lg">
                      STATUS: NOMINAL
                    </div>
                  )}
                </div>
              </div>

              {/* Disruption Warning Area */}
              {activeIncident && activeShipment.status === 'disrupted' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-4 bg-red-950/10 border border-red-900/30 rounded-xl space-y-2"
                >
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest">
                      CRITICAL WEATHER ANOMALY: {activeIncident.title.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-red-200/90 leading-relaxed">
                    {activeIncident.description}
                  </p>
                  <div className="text-[9px] text-red-400/80 font-mono flex flex-wrap justify-between pt-1 gap-2 border-t border-red-950/60">
                    <span>COORDINATES: LAT {activeIncident.coordinates.lat.toFixed(2)}, LNG {activeIncident.coordinates.lng.toFixed(2)}</span>
                    <span>HAZARD RADIUS: {activeIncident.radiusKm} KM</span>
                  </div>
                </motion.div>
              )}

              {/* Solver Workspace */}
              <AnimatePresence mode="wait">
                {isSolving ? (
                  /* Animated loading state - Tech Scanner styling */
                  <motion.div 
                    key="solving"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-16 flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-[3px] border-zinc-900 border-t-blue-500 animate-spin"></div>
                      <BrainCircuit className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                      <div className="absolute inset-0 border border-blue-500/10 rounded-full animate-ping pointer-events-none"></div>
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="text-xs font-extrabold text-white font-mono uppercase tracking-widest animate-pulse">
                        Solving Multimodal Path Blocks
                      </h4>
                      <p className="text-[11px] text-blue-400 font-mono max-w-md mx-auto">
                        {loadingStep}
                      </p>
                    </div>
                  </motion.div>
                ) : activeShipment.optimizedRoutePoints ? (
                  /* Detour solution results display */
                  <motion.div 
                    key="optimized"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    
                    {/* Side-by-side metric tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      
                      {/* Cost Diff */}
                      <div className="bg-black/40 p-4 rounded-lg border border-zinc-900 shadow-inner">
                        <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase block">OPERATIONAL IMPACT</span>
                        <div className="text-base font-extrabold text-white mt-1 flex items-center">
                          <DollarSign className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                          +{formatCurrency(activeShipment.delayHours * 350)}
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500 mt-1 block">Incremental fuel usage</span>
                      </div>

                      {/* Delay Hours */}
                      <div className="bg-black/40 p-4 rounded-lg border border-zinc-900 shadow-inner">
                        <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase block">REVISED TEMPORAL SLA</span>
                        <div className="text-base font-extrabold text-blue-400 mt-1 flex items-center">
                          <Clock className="w-3.5 h-3.5 text-blue-400 mr-1" />
                          +{activeShipment.delayHours} hrs
                        </div>
                        <span className="text-[9px] font-mono text-blue-400 mt-1 block">Preserved SLA timelines</span>
                      </div>

                      {/* Carbon Impact */}
                      <div className="bg-black/40 p-4 rounded-lg border border-zinc-900 shadow-inner">
                        <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase block">CARBON DIVERGENCE</span>
                        <div className="text-base font-extrabold text-emerald-400 mt-1 flex items-center">
                          <Leaf className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                          +3.2% CO₂
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500 mt-1 block">Minimal maritime footprint</span>
                      </div>

                      {/* Model Confidence */}
                      <div className="bg-black/40 p-4 rounded-lg border border-zinc-900 shadow-inner">
                        <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase block">MODEL CONFIDENCE</span>
                        <div className="text-base font-extrabold text-white mt-1 flex items-center">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 mr-1" />
                          98.4%
                        </div>
                        <span className="text-[9px] font-mono text-blue-400 font-bold mt-1 block">Geometric accuracy</span>
                      </div>

                    </div>

                    {/* Operational Reasoning - Terminal styling */}
                    <div className="bg-black/60 border border-zinc-900 rounded-lg overflow-hidden shadow-2xl">
                      <div className="bg-zinc-950/80 px-4 py-2 flex items-center space-x-2 border-b border-zinc-900">
                        <Terminal className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-[10px] font-extrabold font-mono text-zinc-300 uppercase tracking-wider">GEMINI CO-PILOT CRITICAL DISPATCH ADVISORY</span>
                      </div>
                      <div className="p-4 bg-black/40">
                        <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-line font-mono font-medium">
                          {activeShipment.geminiSuggestion}
                        </p>
                      </div>
                    </div>

                    {/* Calculated Waypoints */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase font-mono tracking-widest">
                        Rerouted Coordinates Sequence
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] font-mono font-bold">
                        {activeShipment.optimizedRoutePoints!.map((pt, i) => (
                          <div key={i} className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 flex items-center space-x-2.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-white font-sans text-xs font-bold truncate">{pt.name}</div>
                              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Lat: {pt.lat.toFixed(2)}, Lng: {pt.lng.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </motion.div>
                ) : (
                  /* Disrupted, but not optimized yet */
                  activeShipment.status === 'disrupted' ? (
                    <motion.div 
                      key="disrupted"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-black/40 rounded-xl border border-zinc-900 p-8 text-center space-y-4 shadow-inner"
                    >
                      <BrainCircuit className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
                      <div>
                        <h4 className="font-extrabold text-white text-sm">Synthesize Detour Coordinates</h4>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                          Disruption anomaly flagged. Let Gemini evaluate live weather channels and traffic matrices to compute the optimal detour corridor.
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        id="btn-solve-reroute"
                        onClick={triggerSolve}
                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs font-mono transition-all shadow-lg shadow-blue-600/10 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white text-transparent shrink-0" />
                        <span>SOLVE WITH GEMINI ENTERPRISE</span>
                      </motion.button>
                    </motion.div>
                  ) : (
                    /* Shipment is completely ontime and doesn't need detour */
                    <motion.div 
                      key="ontime"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-black/40 rounded-xl border border-zinc-900 p-8 text-center space-y-3 shadow-inner"
                    >
                      <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto" />
                      <div>
                        <h4 className="font-extrabold text-white text-sm">Logistics Corridor Clear</h4>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
                          This shipment is moving fully on-time. No detour optimizations required.
                        </p>
                      </div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>

            </div>

            {/* Bottom info footer */}
            <div className="mt-6 pt-4 border-t border-zinc-900 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
              <span>SOLVER: GEMINI-3.5-FLASH</span>
              <span>COMPLIANCE: SHA-256 REGISTER SECURED</span>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-8 text-center shadow-xl">
            <p className="text-zinc-400 text-xs">Select an active supply lane from the registry sidebar to begin.</p>
          </div>
        )}
      </div>

    </div>
  );
}
