/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  BarChart2, 
  Cpu, 
  TrendingDown, 
  Clock, 
  Zap, 
  DollarSign, 
  Terminal, 
  ArrowRight,
  Database,
  Sliders,
  Calendar,
  Copy,
  Check,
  MapPin,
  Sparkles,
  Filter
} from 'lucide-react';

interface LookerTile {
  id: string;
  title: string;
  vizType: string;
  metric: string;
  description: string;
  vizExplanation: string;
  sql: string;
  drilldown: string;
}

export default function AnalyticsTab({ theme, token }: { theme: 'dark' | 'light'; token: string }) {
  const [activeMetricGroup, setActiveMetricGroup] = useState<'speedup' | 'dwell' | 'looker' | 'gpu-realtime'>('speedup');
  const [selectedTileId, setSelectedTileId] = useState<string>('tile-1');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  
  interface GpuHistoryItem {
    timestamp: string;
    temperature: number;
    powerDraw: number;
    utilization: number;
  }

  const [gpuHistoryData, setGpuHistoryData] = useState<GpuHistoryItem[]>([]);
  const [gpuSpecs, setGpuSpecs] = useState<any>(null);
  const [isLoadingGpu, setIsLoadingGpu] = useState<boolean>(false);

  const fetchGpuMetrics = async () => {
    if (!token) return;
    setIsLoadingGpu(true);
    try {
      const res = await fetch('/api/gpu-metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGpuHistoryData(data.history || []);
        setGpuSpecs(data);
      }
    } catch (err) {
      console.error('Failed to fetch GPU realtime history:', err);
    } finally {
      setIsLoadingGpu(false);
    }
  };

  React.useEffect(() => {
    fetchGpuMetrics();
    // Poll every 10 seconds for real-time live telemetry
    const interval = setInterval(fetchGpuMetrics, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Simulated interactive filter state for Looker Tab
  const [lookerFilterCarrier, setLookerFilterCarrier] = useState<string>('ALL');
  const [lookerFilterPriority, setLookerFilterPriority] = useState<string>('HIGH');
  const [lookerFilterRiskSlider, setLookerFilterRiskSlider] = useState<number>(50);
  const [showQueryToast, setShowQueryToast] = useState<string | null>(null);

  // Custom data for Chart A: Ingestion Speedup comparison
  const speedupData = [
    { label: '1M Rows', cpuTime: 162, gpuTime: 0.12 },
    { label: '5M Rows', cpuTime: 810, gpuTime: 0.45 },
    { label: '10M Rows', cpuTime: 1620, gpuTime: 0.88 },
    { label: '15M Rows', cpuTime: 2430, gpuTime: 1.25 }
  ];

  // Custom data for Chart B: Location Dwell/Delay Index
  const locationDwellData = [
    { location: 'LA Port', dwellHrs: 48, legacyDwellHrs: 56 },
    { location: 'Venlo Customs', dwellHrs: 18, legacyDwellHrs: 24 },
    { location: 'Houston Hub', dwellHrs: 12, legacyDwellHrs: 14 },
    { location: 'Rotterdam Port', dwellHrs: 26, legacyDwellHrs: 32 },
    { location: 'Frankfurt Gate', dwellHrs: 6, legacyDwellHrs: 8 }
  ];

  // 13-Tile Detailed looker specification definitions
  const lookerTiles: LookerTile[] = [
    {
      id: "tile-1",
      title: "Executive KPI Summary Cards",
      vizType: "KPI Single-Value Indicators",
      metric: "12 Lanes Active | $54M Exposure | 96.4% SLA Protection | -12.4% CO2 Delta",
      description: "High-density dashboard cards presenting absolute counts, cargo exposure valuations, and SLA protection performance indexes compared against the preceding 12-hour operational cycle.",
      vizExplanation: "Single value tiles with dynamic up/down trend flags and color-graded variance overlays, leveraging lookahead caching.",
      sql: `SELECT
  COUNT(DISTINCT shipment_id) AS active_shipments,
  COALESCE(SUM(CASE WHEN risk_score >= 80 THEN cargo_value_usd ELSE 0 END), 0) AS value_exposure_usd,
  ROUND(COUNTIF(predicted_delay_hours <= 4.0) * 100.0 / COUNT(shipment_id), 1) AS sla_protection_rate,
  ROUND(AVG(predicted_delay_hours), 1) AS avg_delay_hours
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
  AND carrier IN UNNEST(@filter_carrier);`,
      drilldown: "Drills down to active shipment ledger tables, segmented by alliance carriers and prioritization SLA tiers."
    },
    {
      id: "tile-2",
      title: "Live Fleet Map",
      vizType: "Geospatial Bubble-Scatter Map",
      metric: "GPS Latitude/Longitude Coordinate Plotting",
      description: "High-fidelity mapping coordinates representing current telematics locations of the active fleet. Bubble sizing reflects total container cargo valuation. Colors map to the active corridor risk scoring.",
      vizExplanation: "Renders coordinate markers over standard Looker GIS maps, customized with real-time vector boundary overlays.",
      sql: `SELECT
  shipment_id,
  cargo_code,
  carrier,
  cargo_value_usd,
  current_latitude,
  current_longitude,
  risk_score,
  is_inside_hazard_zone,
  local_weather_condition,
  dist_to_blizzard_km
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
  AND risk_score >= @param_min_risk;`,
      drilldown: "Opens route telemetry ledger, plotting local wind speed, ambient temperature, and barometric indices."
    },
    {
      id: "tile-3",
      title: "Weather Threat Proximity Heatmap",
      vizType: "Grid Density Heatmap Overlay",
      metric: "Proximity to Blizzard Centroids (km)",
      description: "Illustrates critical clusters where active logistics transits are in dangerous proximity to Blizzard or Hurricane boundaries. Uses color density to highlight transit bottlenecks.",
      vizExplanation: "Dynamic grid overlay with thermal density points mapped to active GIS storm vectors.",
      sql: `SELECT
  current_latitude,
  current_longitude,
  dist_to_blizzard_km,
  local_weather_condition,
  COUNT(shipment_id) AS fleet_density_factor
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
  AND dist_to_blizzard_km <= 350.0
GROUP BY
  current_latitude,
  current_longitude,
  dist_to_blizzard_km,
  local_weather_condition;`,
      drilldown: "Cross-filters all other dashboard tiles to isolate shipments within the selected storm coordinate boundary limits."
    },
    {
      id: "tile-4",
      title: "SLA Delay Probability",
      vizType: "Dual-Axis Column & Line Combo Chart",
      metric: "XGBoost Probability Brackets vs Latency Hours",
      description: "Groups active fleet transits into XGBoost delay probability brackets. Columns represent shipment counts, while the overlay line tracks average predicted delay hours.",
      vizExplanation: "Combo visualization grouping discrete count variables (primary axis) and continuous average duration variables (secondary axis).",
      sql: `SELECT
  CASE
    WHEN risk_score < 20.0 THEN '01: 0 - 20%'
    WHEN risk_score < 40.0 THEN '02: 20 - 40%'
    WHEN risk_score < 60.0 THEN '03: 40 - 60%'
    WHEN risk_score < 80.0 THEN '04: 60 - 80%'
    ELSE '05: 80 - 100%'
  END AS risk_probability_bracket,
  COUNT(shipment_id) AS shipment_count,
  ROUND(AVG(predicted_delay_hours), 1) AS avg_predicted_delay_hours
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
GROUP BY
  1
ORDER BY
  1 ASC;`,
      drilldown: "Opens detailed ML performance metrics, isolated by classification thresholds, precision-recall arcs, and ROC curves."
    },
    {
      id: "tile-5",
      title: "Geospatial Ingestion Pipeline Velocity",
      vizType: "Single-Value KPI Speedometer Meter",
      metric: "1.15 seconds total cuDF execution runtime",
      description: "A Looker gauge visualizing the current processing latency of our GKE NVIDIA GPU parallel threads, benchmarked directly against legacy multi-node CPU runs.",
      vizExplanation: "Standard angular gauge with customized amber, green, and blue ranges indicating GPU pipeline SLAs.",
      sql: `SELECT
  process_id,
  records_processed,
  cpu_time_seconds,
  gpu_time_seconds,
  (cpu_time_seconds / NULLIF(gpu_time_seconds, 0)) AS speedup_multiplier,
  processed_at
FROM
  \`aegisroute_dw.gpu_ingestion_log\`
ORDER BY
  processed_at DESC
LIMIT 1;`,
      drilldown: "Opens historical timeline chart of speedup ratios, detailing GKE cluster load, memory utilization, and thread block configs."
    },
    {
      id: "tile-6",
      title: "Active Risk Alerts Feed",
      vizType: "Dynamic Streaming Data Grid Table",
      metric: "Active Warning Alerts Feed with Geo Coordinates",
      description: "High-density event feed presenting critical anomalies (e.g., Blizzard proximity, port congestion, customs closures) currently impacting active lanes.",
      vizExplanation: "Streamed HTML-formatted list with inline conditional colors mapped directly to alert risk levels.",
      sql: `SELECT
  incident_id,
  title,
  type,
  description,
  impact_radius_km,
  latitude,
  longitude,
  created_at
FROM
  \`aegisroute_dw.active_disruptions\`
WHERE
  is_active = true
ORDER BY
  created_at DESC;`,
      drilldown: "Navigates directly to the Gemini Rerouting AI, pre-loading coordinates of the selected disruption event."
    },
    {
      id: "tile-7",
      title: "Rerouting SLA Savings",
      vizType: "KPI Single-Value Trend Card",
      metric: "98.4% Average Confidence | $124K Saved (Cumulative)",
      description: "Tracks active savings generated by automated detour advice. Quantifies preserved cargo value, fuel overhead mitigation, and averted demurrage penalties.",
      vizExplanation: "Single value card with green upward trend line tracking rolling 30-day cumulative financial impact.",
      sql: `SELECT
  ROUND(AVG(confidence_score) * 100.0, 1) AS avg_model_confidence,
  SUM(averted_demurrage_usd + averted_decay_usd) AS cumulative_sla_savings_usd,
  COUNT(reroute_id) AS total_successful_detours
FROM
  \`aegisroute_dw.rerouting_solutions\`
WHERE
  is_applied = true
  AND resolved_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY);`,
      drilldown: "Drills down to specific savings ledgers, sorted by supply corridors, value classes, and delay hour reductions."
    },
    {
      id: "tile-8",
      title: "Telemetry Progress Bar Gauge",
      vizType: "Horizontal Stacked Percent Bar",
      metric: "Active Shipment Telemetry Progress Percentages",
      description: "Visualizes completion progress profiles of all active high-value transits, tracking current distance relative to the total optimized path length.",
      vizExplanation: "Clustered progress bar with status color codings mapping to ETA SLA risk thresholds.",
      sql: `SELECT
  cargo_code,
  carrier,
  progress_percentage,
  predicted_delay_hours,
  CASE
    WHEN predicted_delay_hours > 4.0 THEN 'CRITICAL RISK'
    WHEN predicted_delay_hours > 0.0 THEN 'BORDER DELAY'
    ELSE 'NOMINAL'
  END AS progress_sla_status
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE();`,
      drilldown: "Opens route tracking chart with historic waypoints, tracking GPS ticks, sensor temperatures, and cargo humidity logs."
    },
    {
      id: "tile-9",
      title: "Carrier Alliance Performance Ledger",
      vizType: "Clustered Column Chart with Data Table",
      metric: "Average ETA Delay Hours by Carrier Corporation",
      description: "Compares average predicted delay hours across all integrated maritime and intermodal carriers. Isolates delays into port congestion, customs, or weather categories.",
      vizExplanation: "Clustered column chart paired with a sorted details table, highlighting worst-performing carriers in red.",
      sql: `SELECT
  carrier,
  COUNT(shipment_id) AS total_managed_lanes,
  ROUND(AVG(predicted_delay_hours), 2) AS average_delay_hours,
  ROUND(AVG(risk_score), 1) AS average_risk_score
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
GROUP BY
  carrier
ORDER BY
  average_delay_hours DESC;`,
      drilldown: "Opens carrier scorecard, detailing historical SLA compliance, container loss incidents, and carbon emission grades."
    },
    {
      id: "tile-10",
      title: "Weather Delay Proximity Timeline",
      vizType: "Clustered Line Plot with Multi-Line Overlays",
      metric: "Historical Weather Impact Duration (hours)",
      description: "Maps proximity distances to active storms against predicted route delay hours over a 30-day temporal range, visualizing the correlation curve.",
      vizExplanation: "Standard XY line plot with dual-axis overlay modeling physical proximity (X) and ETA latency (Y).",
      sql: `SELECT
  DATE(processed_at) AS report_date,
  ROUND(AVG(dist_to_blizzard_km), 1) AS avg_storm_proximity_km,
  ROUND(AVG(predicted_delay_hours), 1) AS avg_route_delay_hours
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  1
ORDER BY
  1 ASC;`,
      drilldown: "Isolates specific historic blizzard grids, displaying localized Doppler feeds and coordinate polygons."
    },
    {
      id: "tile-11",
      title: "cuDF Speedup Log History",
      vizType: "Clustered Area Chart with Layer Fills",
      metric: "Speedup Multiplier Factor Area Fill Curve",
      description: "Visualizes daily speedup multipliers of our parallel GKE GPU pipelines compared against traditional CPU engines over a 30-day historical range.",
      vizExplanation: "Layered area chart using semitransparent blue and violet fills, indicating processing volumetric throughput.",
      sql: `SELECT
  DATE(processed_at) AS processing_date,
  ROUND(AVG(cpu_time_seconds / NULLIF(gpu_time_seconds, 0)), 0) AS avg_daily_speedup_multiplier,
  SUM(records_processed) AS total_daily_records_ingested
FROM
  \`aegisroute_dw.gpu_ingestion_log\`
WHERE
  processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  1
ORDER BY
  1 ASC;`,
      drilldown: "Drills down to raw performance log files, detailing kernel warps, thread blocks, and device clock speed profiles."
    },
    {
      id: "tile-12",
      title: "Location Delay Index List",
      vizType: "Horizontal Bar Chart with Sorted Labels",
      metric: "Total Dwell / Terminal Dwell hours by Hub Node",
      description: "Identifies top transit bottlenecks by sorting average container dwell hours across global maritime hubs, intermodal hubs, and customs checkpoints.",
      vizExplanation: "Sorted horizontal bar chart highlighting bottleneck locations exceeding the 24-hour baseline threshold.",
      sql: `SELECT
  transit_hub_node,
  hub_type,
  COUNT(shipment_id) AS volume_handled,
  ROUND(AVG(dwell_hours_actual), 1) AS average_dwell_hours
FROM
  \`aegisroute_dw.predictions_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
GROUP BY
  1, 2
ORDER BY
  average_dwell_hours DESC;`,
      drilldown: "Drills down to specific port gate cameras, container stacking block charts, and local terminal yard rosters."
    },
    {
      id: "tile-13",
      title: "Carbon Emissions Delta Index",
      vizType: "Waterfall Delta Variance Bridge",
      metric: "SLA Optimization CO2 Delta (Metric Tons)",
      description: "Tracks carbon footprint delta generated by automated detour advice. Quantifies emissions averted by selecting optimal maritime paths over continuous idling.",
      vizExplanation: "Waterfall delta chart tracking sequential additions and subtractions to the carbon footprint index.",
      sql: `SELECT
  carrier,
  SUM(co2_emitted_baseline_mt) AS baseline_co2_metric_tons,
  SUM(co2_emitted_optimized_mt) AS optimized_co2_metric_tons,
  SUM(co2_emitted_baseline_mt - co2_emitted_optimized_mt) AS carbon_tons_saved
FROM
  \`aegisroute_dw.carbon_reporting\`
WHERE
  DATE(processed_at) = CURRENT_DATE()
GROUP BY
  1;`,
      drilldown: "Drills down to specific vessels, detailing engine profiles, fuel types, and historic fuel logs."
    }
  ];

  const activeTile = lookerTiles.find(t => t.id === selectedTileId) || lookerTiles[0];

  const handleCopySql = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTriggerFilter = (filterType: string, val: string) => {
    if (filterType === 'carrier') {
      setLookerFilterCarrier(val);
      setShowQueryToast(`Looker BigQuery Filter Applied: carrier_pool IN ('${val}')`);
    } else {
      setLookerFilterPriority(val);
      setShowQueryToast(`Looker BigQuery Filter Applied: priority_level = '${val}'`);
    }
    setTimeout(() => setShowQueryToast(null), 3500);
  };

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Stagger animations
  const tabVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* 1. High-Density Executive KPI Metrics Header - Snowflake & PowerBI styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Exposure Val */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800/85 shadow-xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div>
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block font-mono">ACTIVE CARGO NET EXPOSURE</span>
            <div className="text-2xl font-extrabold mt-1 text-white flex items-baseline space-x-2">
              <span>{formatUSD(54250000)}</span>
              <span className="text-xs font-semibold text-red-400 font-mono">+$4.2M (Risk Alert)</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-2.5 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              WEATHER CORRIDOR BLOCKS DETECTED
            </div>
          </div>
          <div className="p-3 bg-red-950/20 rounded-lg border border-red-900/40 group-hover:border-red-500/30 transition-all">
            <DollarSign className="w-5.5 h-5.5 text-red-500" />
          </div>
        </div>

        {/* Throughput SLA Card */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800/85 shadow-xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div>
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block font-mono">SLA DELIVERY PROTECTION RATE</span>
            <div className="text-2xl font-extrabold mt-1 text-white flex items-baseline space-x-2">
              <span>96.4%</span>
              <span className="text-xs font-semibold text-zinc-500 font-mono">vs 78.5% Legacy</span>
            </div>
            <div className="text-[10px] text-blue-400 font-mono mt-2.5 flex items-center gap-1 font-bold">
              ⚡ +17.9% LOGISTICS SLA ENHANCEMENT
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:border-blue-500/40 transition-all">
            <TrendingDown className="w-5.5 h-5.5 text-blue-400" />
          </div>
        </div>

        {/* Insight Latency SLA Card */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800/85 shadow-xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
          <div>
            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest block font-mono">SITUATIONAL INSIGHT TIMELINE</span>
            <div className="text-2xl font-extrabold mt-1 text-white flex items-baseline space-x-2">
              <span>&lt; 2 Seconds</span>
              <span className="text-xs font-semibold text-red-400 font-mono line-through">40 Minutes</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-2.5 flex items-center gap-1 font-bold">
              ⚡ ZERO DECISION-WINDOW WASTAGE
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:border-emerald-500/40 transition-all">
            <Clock className="w-5.5 h-5.5 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* Grid: SVG Performance Charts and Technical Logs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Looker Analytics Visual Dashboard Panel (Left) */}
        <div className="xl:col-span-8 bg-[#0d0d11]/90 backdrop-blur-md rounded-xl border border-zinc-800/80 p-6 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/[0.01] to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/60 pb-4 gap-3 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" /> Looker Corporate Insights Suite
              </h3>
              <p className="text-xs text-zinc-500 font-mono tracking-wide uppercase mt-0.5">Enterprise Business Intelligence Engine • Obsidian Dark Specification</p>
            </div>

            <div className="flex bg-black/60 p-1 rounded-lg border border-zinc-850 mt-2 sm:mt-0 text-[11px] font-mono font-bold flex-wrap gap-1">
              <button 
                id="tab-metric-speedup"
                onClick={() => setActiveMetricGroup('speedup')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeMetricGroup === 'speedup' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                SPEEDUP
              </button>
              <button 
                id="tab-metric-dwell"
                onClick={() => setActiveMetricGroup('dwell')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeMetricGroup === 'dwell' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                DWELL INDEX
              </button>
              <button 
                id="tab-metric-gpu-realtime"
                onClick={() => setActiveMetricGroup('gpu-realtime')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeMetricGroup === 'gpu-realtime' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-450" />
                <span>GPU REALTIME</span>
              </button>
              <button 
                id="tab-metric-looker"
                onClick={() => setActiveMetricGroup('looker')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeMetricGroup === 'looker' ? 'bg-indigo-650 text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>13 BENTO TILES</span>
              </button>
            </div>
          </div>

          {/* Toast notifications for BigQuery filters */}
          <AnimatePresence>
            {showQueryToast && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-indigo-950/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-[10px] font-mono flex items-center space-x-2 animate-pulse shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-bounce" />
                <span>{showQueryToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Render Chart depending on selected Tab */}
          <AnimatePresence mode="wait">
            {activeMetricGroup === 'speedup' && (
              <motion.div 
                key="speedup"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-zinc-400 font-mono tracking-widest uppercase">BENCHMARK: COMPUTATIONAL RUNTIME LIMITS</span>
                  <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    LOWER IS BETTER
                  </span>
                </div>

                {/* Chart container with gradient meshes */}
                <div className="bg-black/40 p-6 rounded-xl border border-zinc-900 min-h-[250px] flex items-center justify-center relative shadow-inner">
                  <svg className="w-full h-full max-h-[260px]" viewBox="0 0 700 240">
                    {/* Definitions for gorgeous gradients */}
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                      </linearGradient>
                      <linearGradient id="gpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Technical Grid Lines */}
                    <line x1="80" y1="30" x2="650" y2="30" stroke="#1f1f23" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="80" y1="90" x2="650" y2="90" stroke="#1f1f23" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="80" y1="150" x2="650" y2="150" stroke="#1f1f23" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="80" y1="210" x2="650" y2="210" stroke="#3f3f46" strokeWidth="1.5" />

                    {/* Y-Axis Labels */}
                    <text x="70" y="34" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">2,400s</text>
                    <text x="70" y="94" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">1,200s</text>
                    <text x="70" y="154" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">600s</text>
                    <text x="70" y="214" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">0s</text>

                    {/* Bars and Data points */}
                    {speedupData.map((d, i) => {
                      const barWidth = 38;
                      const groupWidth = 140;
                      const xBase = 120 + i * groupWidth;

                      const scaleHeight = (val: number) => {
                        return Math.min(180, (val / 2400) * 180);
                      };

                      const cpuHeight = scaleHeight(d.cpuTime);
                      const gpuHeight = Math.max(3, scaleHeight(d.gpuTime));

                      return (
                        <g key={i} className="group cursor-pointer">
                          {/* CPU Bar (Tall Red bar) */}
                          <motion.rect 
                            initial={{ height: 0, y: 210 }}
                            animate={{ height: cpuHeight, y: 210 - cpuHeight }}
                            transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            x={xBase} 
                            width={barWidth} 
                            fill="url(#cpuGrad)" 
                            stroke="#ef4444"
                            strokeWidth="1"
                            opacity="0.85"
                            rx="3"
                            className="hover:opacity-100 transition-all duration-300"
                          />
                          <text x={xBase + barWidth/2} y={210 - cpuHeight - 6} fill="#fca5a5" fontSize="9" textAnchor="middle" className="font-mono font-bold">
                            {d.cpuTime}s
                          </text>

                          {/* GPU Bar (Tiny Blue bar) */}
                          <motion.rect 
                            initial={{ height: 0, y: 210 }}
                            animate={{ height: gpuHeight, y: 210 - gpuHeight }}
                            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            x={xBase + barWidth + 8} 
                            width={barWidth} 
                            fill="url(#gpuGrad)" 
                            stroke="#3b82f6"
                            strokeWidth="1"
                            rx="3"
                            className="hover:fill-blue-400 transition-all duration-300"
                          />
                          <text x={xBase + barWidth + 8 + barWidth/2} y={210 - gpuHeight - 6} fill="#93c5fd" fontSize="9" textAnchor="middle" className="font-mono font-black">
                            {d.gpuTime}s
                          </text>

                          {/* X-Axis labels */}
                          <text x={xBase + barWidth + 4} y="228" fill="#a1a1aa" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-sans">
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend and explanation */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-black/40 rounded-lg border border-zinc-900 text-xs text-zinc-400 gap-2">
                  <div className="flex flex-wrap gap-4 font-mono text-[10px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-red-500 rounded border border-red-400"></span>
                      CPU SPARK SPAN
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-blue-500 rounded border border-blue-400"></span>
                      GKE L4 CUDA CORE PIPELINE
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wide">
                    Avg Speedup Ratio: ~1,940X Optimization
                  </span>
                </div>
              </motion.div>
            )}

            {activeMetricGroup === 'dwell' && (
              <motion.div 
                key="dwell"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-zinc-400 font-mono tracking-widest uppercase">BENCHMARK: LOGISTICS CONTAINER DWELL DURATION</span>
                  <span className="text-[9px] bg-blue-950/40 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    LOWER IS BETTER
                  </span>
                </div>

                {/* Chart B container with clustered columns */}
                <div className="bg-black/40 p-6 rounded-xl border border-zinc-900 min-h-[250px] flex items-center justify-center relative shadow-inner">
                  <svg className="w-full h-full max-h-[260px]" viewBox="0 0 700 240">
                    <defs>
                      <linearGradient id="legacyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#71717a" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#27272a" stopOpacity="0.2" />
                      </linearGradient>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#ea580c" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>

                    {/* Technical Grid lines */}
                    <line x1="80" y1="30" x2="650" y2="30" stroke="#1f1f23" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="80" y1="90" x2="650" y2="90" stroke="#1f1f23" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="80" y1="150" x2="650" y2="150" stroke="#1f1f23" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="80" y1="210" x2="650" y2="210" stroke="#3f3f46" strokeWidth="1.5" />

                    {/* Y Axis labels */}
                    <text x="70" y="34" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">60 hrs</text>
                    <text x="70" y="94" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">40 hrs</text>
                    <text x="70" y="154" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">20 hrs</text>
                    <text x="70" y="214" fill="#52525b" fontSize="9" textAnchor="end" className="font-mono font-bold">0 hrs</text>

                    {/* Draw horizontal bars */}
                    {locationDwellData.map((d, i) => {
                      const barWidth = 32;
                      const groupWidth = 110;
                      const xBase = 100 + i * groupWidth;

                      const scaleHeight = (val: number) => {
                        return (val / 60) * 180;
                      };

                      const legacyHeight = scaleHeight(d.legacyDwellHrs);
                      const actualHeight = scaleHeight(d.dwellHrs);

                      return (
                        <g key={i} className="group cursor-pointer">
                          {/* Legacy Dwell Bar */}
                          <motion.rect 
                            initial={{ height: 0, y: 210 }}
                            animate={{ height: legacyHeight, y: 210 - legacyHeight }}
                            transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                            x={xBase} 
                            width={barWidth} 
                            fill="url(#legacyGrad)" 
                            stroke="#52525b"
                            strokeWidth="1"
                            rx="3"
                            className="hover:opacity-100 transition-opacity"
                          />
                          <text x={xBase + barWidth/2} y={210 - legacyHeight - 6} fill="#a1a1aa" fontSize="9" textAnchor="middle" className="font-mono font-bold">
                            {d.legacyDwellHrs}h
                          </text>

                          {/* Optimized Dwell Bar */}
                          <motion.rect 
                            initial={{ height: 0, y: 210 }}
                            animate={{ height: actualHeight, y: 210 - actualHeight }}
                            transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                            x={xBase + barWidth + 6} 
                            width={barWidth} 
                            fill="url(#actualGrad)" 
                            stroke="#f59e0b"
                            strokeWidth="1"
                            rx="3"
                            className="hover:fill-amber-400 transition-colors"
                          />
                          <text x={xBase + barWidth + 6 + barWidth/2} y={210 - actualHeight - 6} fill="#fde047" fontSize="9" textAnchor="middle" className="font-mono font-black">
                            {d.dwellHrs}h
                          </text>

                          {/* X Axis label */}
                          <text x={xBase + barWidth + 3} y="228" fill="#e4e4e7" fontSize="9.5" fontWeight="bold" textAnchor="middle" className="font-sans">
                            {d.location}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend and explanation */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-black/40 rounded-lg border border-zinc-900 text-xs text-zinc-400 gap-2">
                  <div className="flex flex-wrap gap-4 font-mono text-[10px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-zinc-700 rounded border border-zinc-600"></span>
                      LEGACY AVERAGE DWELL
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-amber-500 rounded border border-amber-400"></span>
                      AEGISROUTE OPTIMIZED DWELL
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wide">
                    DWELL REDUCTION AVG: ~22% MITIGATION
                  </span>
                </div>
              </motion.div>
            )}

            {activeMetricGroup === 'gpu-realtime' && (
              <motion.div 
                key="gpu-realtime"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-zinc-450 font-mono tracking-widest uppercase">REALTIME GPU TELEMETRY: THERMAL & POWER INDEX</span>
                  <button 
                    onClick={fetchGpuMetrics}
                    disabled={isLoadingGpu}
                    className="text-[9px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-900/40 px-2 py-1 rounded font-mono font-bold uppercase transition-all shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingGpu ? 'FETCHING...' : '🔄 FORCE SYNC'}
                  </button>
                </div>

                {/* Line Chart Container using Recharts */}
                <div className="bg-black/40 p-4 rounded-xl border border-zinc-900 min-h-[300px] relative shadow-inner">
                  {gpuHistoryData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[268px] text-zinc-500 text-xs font-mono">
                      <span>Awaiting telemetry connection...</span>
                    </div>
                  ) : (
                    <div className="w-full h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gpuHistoryData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                          <XAxis 
                            dataKey="timestamp" 
                            stroke="#52525b" 
                            fontSize={9} 
                            tickLine={false}
                            fontFamily="JetBrains Mono"
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="#ef4444" 
                            fontSize={9} 
                            tickLine={false}
                            axisLine={false}
                            fontFamily="JetBrains Mono"
                            domain={[40, 90]}
                            unit="°C"
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="#10b981" 
                            fontSize={9} 
                            tickLine={false}
                            axisLine={false}
                            fontFamily="JetBrains Mono"
                            domain={[80, 350]}
                            unit="W"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#09090b', 
                              borderColor: '#27272a',
                              borderRadius: '8px',
                              fontSize: '10px',
                              fontFamily: 'JetBrains Mono',
                              color: '#f4f4f5'
                            }} 
                            labelClassName="text-zinc-500 font-bold"
                          />
                          <Legend 
                            verticalAlign="top" 
                            height={36} 
                            iconType="circle"
                            iconSize={6}
                            wrapperStyle={{ 
                              fontSize: '10px', 
                              fontFamily: 'JetBrains Mono',
                              textTransform: 'uppercase'
                            }}
                          />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="temperature" 
                            name="Core Temp (°C)" 
                            stroke="#ef4444" 
                            strokeWidth={2.5}
                            activeDot={{ r: 6 }} 
                            dot={{ r: 3 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="powerDraw" 
                            name="Power Draw (W)" 
                            stroke="#10b981" 
                            strokeWidth={2.5}
                            activeDot={{ r: 6 }} 
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Legend and explanation */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-black/40 rounded-lg border border-zinc-900 text-xs text-zinc-400 gap-2">
                  <div className="flex flex-col text-[10px] font-mono leading-relaxed">
                    <span className="text-zinc-500 font-bold">NVIDIA L4 ACCELERATOR SPECIFICATION:</span>
                    <span className="text-zinc-400">Thermal Threshold limit: <strong>85°C</strong> • Max Rated TDP Capacity: <strong>300W Max Draw</strong></span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wide">
                    STATUS: OPTIMIZED WORKLOAD COLDING
                  </span>
                </div>
              </motion.div>
            )}

            {activeMetricGroup === 'looker' && (
              <motion.div 
                key="looker"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Looker BigQuery dynamic interactive parameters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-black/40 p-4 rounded-xl border border-zinc-900">
                  
                  {/* Parameter A: Carrier Alliance filter */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">CARRIER POOL ALLIANCE</label>
                    <select 
                      value={lookerFilterCarrier}
                      onChange={(e) => handleTriggerFilter('carrier', e.target.value)}
                      className="w-full bg-zinc-950 text-white border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="ALL">ALL INTERMODAL</option>
                      <option value="Alliance-A">ALLIANCE ALFA</option>
                      <option value="Alliance-B">ALLIANCE BETA</option>
                      <option value="Independent">INDEPENDENT POOL</option>
                    </select>
                  </div>

                  {/* Parameter B: SLA Priority level */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono block">SLA ROUTING THRESHOLD</label>
                    <select 
                      value={lookerFilterPriority}
                      onChange={(e) => handleTriggerFilter('priority', e.target.value)}
                      className="w-full bg-zinc-950 text-white border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="ALL">ALL CARGO PRIORITIES</option>
                      <option value="HIGH">CRITICAL EXPOSURE ONLY</option>
                      <option value="MEDIUM">STANDARD COMMERCE</option>
                    </select>
                  </div>

                  {/* Parameter C: Risk Tolerance Slider */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 font-mono tracking-widest">
                      <span>XGBoost RISK TOLERANCE LEVEL</span>
                      <span className="text-indigo-400 font-extrabold">{lookerFilterRiskSlider}%</span>
                    </div>
                    <div className="flex items-center space-x-3 pt-1">
                      <input 
                        type="range" 
                        min="10" 
                        max="90" 
                        value={lookerFilterRiskSlider}
                        onChange={(e) => setLookerFilterRiskSlider(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-zinc-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850 shrink-0">
                        {lookerFilterRiskSlider < 50 ? 'CONSERVATIVE' : 'AGGRESSIVE'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* 13 Bento grid tiles listing with nice typography */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {lookerTiles.map((tile) => {
                    const isSelected = selectedTileId === tile.id;
                    return (
                      <button
                        id={`looker-tile-btn-${tile.id}`}
                        key={tile.id}
                        onClick={() => setSelectedTileId(tile.id)}
                        className={`p-3 rounded-lg text-left transition-all duration-300 flex flex-col justify-between min-h-[90px] border relative overflow-hidden group cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-950/15 border-indigo-500/70 shadow-lg shadow-indigo-950/30 font-bold text-white' 
                            : 'bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:bg-zinc-900/10 hover:border-zinc-800'
                        }`}
                      >
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-wider">{tile.id.toUpperCase()}</span>
                            {tile.id === 'tile-1' && <Sparkles className="w-3 h-3 text-indigo-400" />}
                            {tile.id === 'tile-2' && <MapPin className="w-3 h-3 text-indigo-400" />}
                            {tile.id === 'tile-11' && <Zap className="w-3 h-3 text-indigo-400" />}
                          </div>
                          <h4 className="text-xs font-sans font-bold line-clamp-1 group-hover:text-white transition-colors leading-tight">
                            {tile.title.replace(/^\d+\.\s*/, '')}
                          </h4>
                        </div>
                        
                        <div className="mt-2 text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400 line-clamp-2 leading-snug">
                          {tile.vizType}
                        </div>

                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-900 text-[11px] text-zinc-400 leading-normal font-sans">
                  💡 <strong>Interactive Specifications:</strong> Toggle through the <strong>13 bento-grid tiles</strong> above to inspect their precise BigQuery underlying SQL source codes, data schema descriptions, viz formats, and automated alert criteria in the right inspector panel.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live GPU Kernel Execution Logs Terminal OR Looker Inspector Tab (Right) */}
        <div className="xl:col-span-4 bg-[#0d0d11]/90 backdrop-blur-md rounded-xl border border-zinc-800/80 p-5 shadow-2xl flex flex-col justify-between min-h-[440px]">
          
          {activeMetricGroup !== 'looker' ? (
            /* Terminal Logs Mode */
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center space-x-2 border-b border-zinc-900 pb-3 mb-4">
                  <Terminal className="w-4 h-4 text-blue-450" />
                  <h3 className="font-bold text-white tracking-tight text-sm">RAPIDS cuDF Kernel Logs</h3>
                </div>
                
                <p className="text-xs text-zinc-400 mb-3.5 leading-relaxed font-sans">
                  Real-time GPU hardware registers tracking CUDA-accelerated table joins and routing matrices:
                </p>

                {/* Console output display */}
                <div className="bg-black/60 rounded-lg p-4 border border-zinc-900 font-mono text-[10px] text-zinc-300 space-y-2 h-[260px] overflow-y-auto select-none shadow-inner">
                  <div className="text-zinc-500">[{new Date().toISOString().split('T')[1].substring(0, 8)}] GEOSPATIAL PIPELINE RECONNECT</div>
                  <div className="text-blue-400">ALLOC: Unified CUDA memory block: 11.2GB mapped VRAM</div>
                  <div className="text-zinc-300">STAGE: Ingested GCS bucket index... 14.2M coordinates</div>
                  <div className="text-blue-400">WARP: Spawning 7,424 thread blocks in scheduling matrix</div>
                  <div className="text-zinc-300">EXEC: Polygon intersection analysis on storm dimensions</div>
                  <div className="text-amber-500 font-extrabold flex items-center gap-1">⚡ WARN: Intersect storm bounding box on lane 'ship-002'</div>
                  <div className="text-blue-400">KRNL: cuDF cudf::inner_join executed in 0.85s</div>
                  <div className="text-emerald-400 font-extrabold bg-emerald-500/10 px-1 rounded inline-block">SUCCESS: Grid calculations compiled in 1.15 seconds</div>
                  <div className="text-zinc-500">STAGE: Synchronized metadata with BigQuery DW registry</div>
                  <div className="text-zinc-300">Awaiting next operational telematics tick...</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                <span>NVIDIA L4 TFLOPS</span>
                <span>HOST: GKE ACCELERATED</span>
              </div>
            </div>
          ) : (
            /* Looker Inspector Spec Mode */
            <div className="flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-1">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-white tracking-tight text-sm">Looker Tile Inspector</h3>
                  </div>
                  <span className="font-mono text-[9px] bg-indigo-950/80 border border-indigo-900/50 text-indigo-300 px-2.5 py-0.5 rounded-lg uppercase font-bold shrink-0">
                    {activeTile.id}
                  </span>
                </div>

                {/* Metadata details */}
                <div className="space-y-3.5 text-xs">
                  <div>
                    <h4 className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Tile Name & ID</h4>
                    <span className="font-extrabold text-white text-sm tracking-tight">{activeTile.title}</span>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Visualization Type</h4>
                    <span className="text-indigo-400 font-mono font-bold">{activeTile.vizType}</span>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Operational Metrics</h4>
                    <p className="text-zinc-200 bg-black/50 p-2.5 rounded-lg border border-zinc-900 font-mono text-[10px] leading-relaxed">
                      {activeTile.metric}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Functional Description</h4>
                    <p className="text-zinc-400 leading-relaxed text-[11px] font-sans font-medium">
                      {activeTile.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Looker Rendering Logic</h4>
                    <p className="text-zinc-400 leading-relaxed text-[11px] font-sans font-medium">
                      {activeTile.vizExplanation}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Drilldown Sequence</h4>
                    <p className="text-zinc-400 leading-relaxed text-[11px] font-sans font-medium">
                      {activeTile.drilldown}
                    </p>
                  </div>

                  {/* SQL Section with copy */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-widest block">Underlying BigQuery SQL</label>
                      <button 
                        onClick={() => handleCopySql(activeTile.sql)}
                        className="p-1.5 hover:bg-black border border-zinc-850 rounded-lg text-zinc-450 hover:text-white text-[10px] flex items-center space-x-1 font-mono transition-colors cursor-pointer"
                      >
                        {copiedSql ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="bg-black/50 rounded-lg p-3 border border-zinc-900 font-mono text-[9px] text-zinc-300 max-h-[140px] overflow-y-auto select-all leading-relaxed shadow-inner">
                      <pre className="whitespace-pre-wrap">{activeTile.sql}</pre>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 text-[9px] text-zinc-500 font-mono flex items-center justify-between">
                <span>LOOKER SECURE HOST</span>
                <span>CATALOG: aegisroute_dw</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
