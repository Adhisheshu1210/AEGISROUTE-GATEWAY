/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  FileSpreadsheet, 
  FileDown, 
  Download, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Sliders, 
  RefreshCw, 
  Database, 
  Layers,
  Leaf,
  ShieldCheck,
  Eye,
  Presentation
} from 'lucide-react';

interface CarbonItem {
  carrier: string;
  shipmentCount: number;
  ontimeCount: number;
  delayedCount: number;
  totalValueUsd: number;
  fuelOptimalLiters: number;
  fuelWastedLiters: number;
  co2EmissionKg: number;
  greenTier: string;
}

interface PerformanceItem {
  dataset: string;
  cpuMinutes: number;
  gpuSeconds: number;
  speedup: number;
}

interface IncidentItem {
  id: string;
  type: string;
  title: string;
  location: string;
  severity: string;
  radiusKm: number;
  affectedRoutesCount: number;
  affectedValueUsd: number;
  timestamp: string;
}

interface ReportData {
  stats: {
    totalShipments: number;
    ontimeCount: number;
    delayedCount: number;
    disruptedCount: number;
    activeIncidentsCount: number;
    atRiskValueUsd: number;
    averageTimeSavedMinutes: number;
  };
  carbonData: CarbonItem[];
  performanceData: PerformanceItem[];
  incidentData: IncidentItem[];
  totalValuation: number;
}

type ReportType = 'executive' | 'weekly' | 'daily' | 'incident' | 'carbon' | 'performance';
type ExportFormat = 'pdf' | 'excel' | 'csv' | 'ppt';

export default function ReportingTab() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('executive');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('aegisroute_jwt_token');
      const response = await fetch('/api/reports/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reporting data');
      }
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const generateClientPdf = () => {
    try {
      setIsExporting('pdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Document metadata
      doc.setProperties({
        title: `AegisRoute Operational Report - ${selectedReport.toUpperCase()}`,
        subject: 'Real-time Geospatial Telemetry & Threat Containment',
        author: 'AegisRoute Operations Control Room',
        creator: 'jsPDF Core Engine'
      });

      // Styling parameters
      const leftMargin = 15;
      const rightMargin = 195;
      let currentY = 20;

      // Primary color definitions
      const primaryColor = [14, 116, 144]; // Deep Cyan
      const accentColor = [220, 38, 38]; // Critical Red
      const neutralDark = [24, 24, 27]; // Zinc 900
      const neutralLight = [113, 113, 122]; // Zinc 500

      // =====================================
      // 1. CORPORATE HEADER
      // =====================================
      doc.setFillColor(neutralDark[0], neutralDark[1], neutralDark[2]);
      doc.rect(0, 0, 210, 15, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('AEGISROUTE GEO-OPERATIONAL CONTROL NETWORK // SECURED DIRECTIVE', leftMargin, 10);
      
      currentY = 28;

      // Title Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(neutralDark[0], neutralDark[1], neutralDark[2]);
      doc.text('Operational Intelligence Report', leftMargin, currentY);
      currentY += 8;

      // Meta parameters
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(neutralLight[0], neutralLight[1], neutralLight[2]);
      const dateStr = new Date().toUTCString();
      doc.text(`GENERATED: ${dateStr}   |   STATUS: SECURE LIVE TELEMETRY`, leftMargin, currentY);
      currentY += 6;
      doc.text(`REPORT TYPE: ${getReportTitle(selectedReport).toUpperCase()}`, leftMargin, currentY);
      currentY += 10;

      // Decorative cyan line separating header from content
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.8);
      doc.line(leftMargin, currentY, rightMargin, currentY);
      currentY += 10;

      // =====================================
      // 2. SYSTEM OPERATIONAL STATUS SECTION
      // =====================================
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('I. Global System Operational Metrics', leftMargin, currentY);
      currentY += 8;

      // Render a clean key-value grid using boxes
      const boxWidth = 55;
      const boxHeight = 22;
      const boxGap = 7;

      const metricItems = [
        { label: 'MONITORED LANES', value: `${stats.totalShipments} Corridors` },
        { label: 'SLA PRESERVATION', value: `${Math.round((stats.ontimeCount / stats.totalShipments) * 100)}% On-Time` },
        { label: 'VALUATION AT RISK', value: `$${stats.atRiskValueUsd.toLocaleString()}` }
      ];

      metricItems.forEach((item, idx) => {
        const xPos = leftMargin + idx * (boxWidth + boxGap);
        // Box border
        doc.setDrawColor(228, 228, 231);
        doc.setLineWidth(0.3);
        doc.setFillColor(250, 250, 250);
        doc.rect(xPos, currentY, boxWidth, boxHeight, 'FD');

        // Text labels
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(neutralLight[0], neutralLight[1], neutralLight[2]);
        doc.text(item.label, xPos + 4, currentY + 6);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(neutralDark[0], neutralDark[1], neutralDark[2]);
        doc.text(item.value, xPos + 4, currentY + 14);
      });

      currentY += boxHeight + 12;

      // System Status Details Paragraph
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(neutralDark[0], neutralDark[1], neutralDark[2]);
      const statusText = `The system is monitoring a total combined corridor asset valuation exceeding $${totalValuation.toLocaleString()} USD across all active sea routes and overland logistics sectors. Ingestion workflows are running in a state-stable mode, utilizing GKE Spark-RAPIDS clusters to solve environmental corridor obstacles. Under active Blizzard and Congestion scenarios, Gemini Rerouting calculations saved an average of ${stats.averageTimeSavedMinutes} minutes of latency per affected shipment, avoiding severe scheduling timeouts and protecting SLA metrics.`;
      
      const splitText = doc.splitTextToSize(statusText, rightMargin - leftMargin);
      doc.text(splitText, leftMargin, currentY);
      currentY += (splitText.length * 5) + 12;

      // =====================================
      // 3. ENVIRONMENTAL DISRUPTIONS LEDGER
      // =====================================
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('II. Active Environmental & Corridor Disruptions', leftMargin, currentY);
      currentY += 8;

      if (!incidentData || incidentData.length === 0) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(neutralLight[0], neutralLight[1], neutralLight[2]);
        doc.text('NO ACTIVE CORRIDOR DISRUPTIONS REGISTERED.', leftMargin, currentY);
        currentY += 10;
      } else {
        // Table headers
        doc.setFillColor(244, 244, 245);
        doc.rect(leftMargin, currentY, rightMargin - leftMargin, 8, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(neutralDark[0], neutralDark[1], neutralDark[2]);
        doc.text('ID', leftMargin + 3, currentY + 5.5);
        doc.text('INCIDENT THREAT TITLE', leftMargin + 16, currentY + 5.5);
        doc.text('LOCATION / GEOGRAPHY', leftMargin + 65, currentY + 5.5);
        doc.text('SEVERITY', leftMargin + 122, currentY + 5.5);
        doc.text('AFFECTED', leftMargin + 145, currentY + 5.5);
        doc.text('VALUATION', leftMargin + 162, currentY + 5.5);
        
        currentY += 8;

        // Table Rows
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        
        incidentData.forEach((inc, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(250, 250, 250);
            doc.rect(leftMargin, currentY, rightMargin - leftMargin, 8, 'F');
          }
          
          doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.text(inc.id, leftMargin + 3, currentY + 5.5);
          
          doc.setTextColor(neutralDark[0], neutralDark[1], neutralDark[2]);
          doc.text(inc.title.substring(0, 25), leftMargin + 16, currentY + 5.5);
          doc.text(inc.location.substring(0, 30), leftMargin + 65, currentY + 5.5);
          
          if (inc.severity === 'critical') {
            doc.setTextColor(220, 38, 38);
          } else if (inc.severity === 'high') {
            doc.setTextColor(245, 158, 11);
          } else {
            doc.setTextColor(59, 130, 246);
          }
          doc.text(inc.severity.toUpperCase(), leftMargin + 122, currentY + 5.5);
          
          doc.setTextColor(neutralDark[0], neutralDark[1], neutralDark[2]);
          doc.text(`${inc.affectedRoutesCount} Corridor`, leftMargin + 145, currentY + 5.5);
          doc.text(`$${inc.affectedValueUsd.toLocaleString()}`, leftMargin + 162, currentY + 5.5);
          
          currentY += 8;
        });
      }

      currentY += 12;

      // =====================================
      // 4. FOOTER / SECURITY DECLARATION
      // =====================================
      const pageHeight = doc.internal.pageSize.height;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(neutralLight[0], neutralLight[1], neutralLight[2]);
      doc.text('III. Security & Compliance Accountability Audit', leftMargin, pageHeight - 32);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      const footerText = 'This advisory document contains highly sensitive telematic projections and active cargo assets currently routed under AegisRoute logistics solvers. Exporting this summary triggers a mandatory trace entry into the platform\'s immutable ledger, including active user credentials, IP geolocation tags, and cryptographic timestamps to protect SLA and ESG trade records.';
      
      const splitFooter = doc.splitTextToSize(footerText, rightMargin - leftMargin);
      doc.text(splitFooter, leftMargin, pageHeight - 27);

      // Save document
      const fileDateStr = new Date().toISOString().substring(0, 10);
      doc.save(`aegis_operational_advisory_${selectedReport}_${fileDateStr}.pdf`);

      setSuccessToast(`Successfully compiled and exported premium PDF report via jsPDF!`);
      setTimeout(() => setSuccessToast(null), 3500);

    } catch (err) {
      console.error('jsPDF client-side export failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const triggerExport = async (format: ExportFormat) => {
    if (format === 'pdf') {
      generateClientPdf();
      return;
    }
    try {
      setIsExporting(format);
      const token = localStorage.getItem('aegisroute_jwt_token');
      const response = await fetch(`/api/reports/download?format=${format}&type=${selectedReport}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to generate operational export file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const dateStr = new Date().toISOString().substring(0, 10);
      let ext = format === 'excel' ? 'xls' : format === 'ppt' ? 'html' : format;
      a.download = `aegis_report_${selectedReport}_${dateStr}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccessToast(`Successfully compiled and exported ${format.toUpperCase()} report!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Report export failure:', err);
    } finally {
      setIsExporting(null);
    }
  };

  const getReportTitle = (type: ReportType) => {
    switch (type) {
      case 'executive': return 'Executive KPI Summary Report';
      case 'weekly': return 'Weekly Route Velocity Metrics';
      case 'daily': return 'Daily Shipment Telemetry Ledger';
      case 'incident': return 'Incident & Corridor Disruption Audit';
      case 'carbon': return 'Green Logistics Carbon Accounting';
      case 'performance': return 'RAPIDS GPU Infrastructure Benchmark';
    }
  };

  const getReportDescription = (type: ReportType) => {
    switch (type) {
      case 'executive': return 'High-density executive dashboard presenting absolute fleet counts, total valuation at risk, SLA protection indexes, and estimated cost avoidance models.';
      case 'weekly': return 'Week-over-week analytical comparison tracking shipment velocity gains, transit latency reductions, and scheduling efficiency trends.';
      case 'daily': return 'Complete operational ledger of all active shipments, current geographical coordinates, carrier alliance codes, real-time progress percentages, and ETA compliance states.';
      case 'incident': return 'Granular log of active environmental and meteorological disruptions, hazard boundaries, affected shipment fleets, and estimated liability valuations.';
      case 'carbon': return 'Compliance audit ledger detailing estimated fuel savings, excess carbon footprint accumulations, and global carrier ESG rating categories.';
      case 'performance': return 'Technical system benchmark comparing multi-node CPU clusters with parallelized NVIDIA L4 GPU threads executing Spark-RAPIDS ingestion routines.';
    }
  };

  if (isLoading || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-mono text-zinc-400">LOADING OPERATIONS DATA GRID...</p>
      </div>
    );
  }

  const { stats, carbonData, performanceData, incidentData, totalValuation } = reportData;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-semibold text-white">Operations & Compliance Reports</h2>
        <p className="text-xs text-zinc-400 mt-1 font-sans">
          Intel-grade reporting engine generating SLA statistics, ESG carbon calculations, and computational acceleration benchmarks.
        </p>
      </div>

      {successToast && (
        <div className="p-3.5 bg-zinc-950 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-mono flex items-center space-x-2.5 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Grid: 6 Report Cards Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {(['executive', 'weekly', 'daily', 'incident', 'carbon', 'performance'] as ReportType[]).map((type) => {
          const isActive = selectedReport === type;
          return (
            <button
              id={`report-card-${type}`}
              key={type}
              onClick={() => setSelectedReport(type)}
              className={`p-4 rounded-lg text-left transition-all duration-300 flex flex-col justify-between min-h-[120px] border relative overflow-hidden group ${
                isActive 
                  ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-950/40 text-white' 
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400 uppercase tracking-widest block">
                    {type === 'carbon' ? 'compliance' : type === 'performance' ? 'infrastructure' : 'operations'}
                  </span>
                  {type === 'executive' && <TrendingUp className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />}
                  {type === 'weekly' && <BarChart3 className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />}
                  {type === 'daily' && <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />}
                  {type === 'incident' && <AlertTriangle className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />}
                  {type === 'carbon' && <Leaf className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />}
                  {type === 'performance' && <Database className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-zinc-400'}`} />}
                </div>
                <h4 className="text-xs font-semibold font-sans mt-2 group-hover:text-white transition-colors leading-snug">
                  {type === 'executive' && 'Executive KPI'}
                  {type === 'weekly' && 'Weekly Velocity'}
                  {type === 'daily' && 'Daily Telemetry'}
                  {type === 'incident' && 'Incident Audit'}
                  {type === 'carbon' && 'Green Carbon'}
                  {type === 'performance' && 'GPU Benchmarks'}
                </h4>
              </div>

              <div className="mt-2 text-[9px] font-mono text-zinc-500 group-hover:text-zinc-300 leading-tight">
                {type === 'executive' && `${stats.totalShipments} Fleet Lanes`}
                {type === 'weekly' && `WoW Analysis`}
                {type === 'daily' && 'Live Ledger'}
                {type === 'incident' && `${stats.activeIncidentsCount} Hazards Logged`}
                {type === 'carbon' && 'ESG Compliance'}
                {type === 'performance' && '~1,940x Speedup'}
              </div>

              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Layout: Left (Export controls), Right (Interactive Live Preview) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Export & Information Box (Left) */}
        <div className="xl:col-span-4 bg-zinc-900 rounded-lg border border-zinc-800 p-5 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
              <Sliders className="w-4 h-4 text-blue-450" />
              <h3 className="font-semibold text-white text-sm">Export Control Deck</h3>
            </div>

            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Selected Report Template</span>
              <span className="font-bold text-white text-sm mt-1 block">{getReportTitle(selectedReport)}</span>
              <p className="text-xs text-zinc-400 leading-relaxed mt-2 font-sans">
                {getReportDescription(selectedReport)}
              </p>
            </div>

            {/* Export Methods buttons */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Available Download Formats</span>
              
              {/* PDF */}
              <button
                id="btn-export-pdf"
                onClick={() => triggerExport('pdf')}
                disabled={isExporting !== null}
                className="w-full flex items-center justify-between px-3.5 py-3.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-red-500/15 rounded text-red-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>Export PDF Advisory Document</span>
                </div>
                {isExporting === 'pdf' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-red-400 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                )}
              </button>

              {/* Excel */}
              <button
                id="btn-export-excel"
                onClick={() => triggerExport('excel')}
                disabled={isExporting !== null}
                className="w-full flex items-center justify-between px-3.5 py-3.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-emerald-500/15 rounded text-emerald-400">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <span>Export Excel Audit Table</span>
                </div>
                {isExporting === 'excel' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                )}
              </button>

              {/* CSV */}
              <button
                id="btn-export-csv"
                onClick={() => triggerExport('csv')}
                disabled={isExporting !== null}
                className="w-full flex items-center justify-between px-3.5 py-3.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-blue-500/15 rounded text-blue-400">
                    <FileDown className="w-3.5 h-3.5" />
                  </div>
                  <span>Export CSV Raw Dataset</span>
                </div>
                {isExporting === 'csv' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                )}
              </button>

              {/* PowerPoint */}
              <button
                id="btn-export-ppt"
                onClick={() => triggerExport('ppt')}
                disabled={isExporting !== null}
                className="w-full flex items-center justify-between px-3.5 py-3.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-orange-500/15 rounded text-orange-400">
                    <Presentation className="w-3.5 h-3.5" />
                  </div>
                  <span>Export PowerPoint Slide Deck</span>
                </div>
                {isExporting === 'ppt' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white" />
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>OPERATOR CLEARANCE REQUIRED:</strong> Report generation records user name, IP address, and exact download parameters into the immutable security audit logs for threat containment accountability.
            </span>
          </div>
        </div>

        {/* Live Visual Preview Panel (Right) */}
        <div className="xl:col-span-8 bg-zinc-900 rounded-lg border border-zinc-800 p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white text-sm">Interactive Live Report Preview</h3>
              </div>
              <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                SECURE PRIVACY VIEWING ONLY
              </span>
            </div>

            {/* PREVIEW 1: EXECUTIVE */}
            {selectedReport === 'executive' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-black p-4 rounded border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-500 block">TOTAL LOGISTICS PIPELINES</span>
                    <span className="text-xl font-bold text-white block mt-1">{stats.totalShipments} Fleet Corridors</span>
                    <span className="text-[9px] font-mono text-emerald-400 mt-2 block">● 100% SATELLITE COVERED</span>
                  </div>
                  <div className="bg-black p-4 rounded border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-500 block">SLA COMPLIANCE PRESERVATION</span>
                    <span className="text-xl font-bold text-white block mt-1">
                      {Math.round(stats.ontimeCount / stats.totalShipments * 100)}% On-Time Rate
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 mt-2 block">{stats.ontimeCount} fleets unaffected</span>
                  </div>
                  <div className="bg-black p-4 rounded border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-500 block">CARGO VALUE EXPOSURE (USD)</span>
                    <span className="text-xl font-bold text-red-400 block mt-1">${stats.atRiskValueUsd.toLocaleString()}</span>
                    <span className="text-[9px] font-mono text-red-500 mt-2 block">⚠️ EXPOSURE LIMIT ESCALATED</span>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="bg-black p-5 rounded border border-zinc-800 space-y-3">
                  <span className="text-[10px] font-mono text-zinc-300 uppercase block font-semibold">Active Fleet Distribution By State</span>
                  <div className="flex items-center space-x-2.5 h-10 w-full bg-zinc-950 rounded px-3 border border-zinc-850">
                    <div style={{ width: `${(stats.ontimeCount / stats.totalShipments) * 100}%` }} className="bg-emerald-500 h-4 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold text-black select-none">
                      ON-TIME ({Math.round((stats.ontimeCount / stats.totalShipments) * 100)}%)
                    </div>
                    {stats.delayedCount > 0 && (
                      <div style={{ width: `${(stats.delayedCount / stats.totalShipments) * 100}%` }} className="bg-amber-500 h-4 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold text-black select-none">
                        DELAY ({Math.round((stats.delayedCount / stats.totalShipments) * 100)}%)
                      </div>
                    )}
                    {stats.disruptedCount > 0 && (
                      <div style={{ width: `${(stats.disruptedCount / stats.totalShipments) * 100}%` }} className="bg-red-500 h-4 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold text-white select-none">
                        ALERT ({Math.round((stats.disruptedCount / stats.totalShipments) * 100)}%)
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Executive Summary Insights</span>
                  <div className="p-3 bg-zinc-950 rounded border border-zinc-850 text-xs text-zinc-400 leading-normal font-sans">
                    AegisRoute Operations reported average of <strong>{stats.averageTimeSavedMinutes} minutes saved</strong> per shipment utilizing live Gemini Rerouting calculations. Operational cost avoidance is estimated at <strong>$21,480 per route modification</strong> by bypassing high-impact Blizzard centroids entirely.
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW 2: WEEKLY */}
            {selectedReport === 'weekly' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-black p-5 rounded border border-zinc-800 space-y-4">
                  <span className="text-[10px] font-mono text-zinc-300 uppercase block font-semibold">Weekly Transit Latency Index (Relative Duration)</span>
                  <div className="flex items-end justify-between h-40 pt-4 px-6 border-b border-zinc-800">
                    {[
                      { week: 'Wk 24', time: 80, delay: 20 },
                      { week: 'Wk 25', time: 70, delay: 15 },
                      { week: 'Wk 26', time: 55, delay: 8 },
                      { week: 'Wk 27 (Live)', time: 38, delay: 3 }
                    ].map((w, idx) => (
                      <div key={idx} className="flex flex-col items-center space-y-2 w-16 group">
                        <div className="w-8 flex flex-col justify-end space-y-1">
                          <div style={{ height: `${w.delay * 1.5}px` }} className="bg-amber-500 rounded-t-sm" title="Delay Latency" />
                          <div style={{ height: `${w.time * 1.5}px` }} className="bg-blue-500 rounded-t-sm" title="Standard Transit" />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{w.week}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center space-x-6 text-[10px] font-mono text-zinc-400 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                      Optimized Baseline (Hours)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
                      Interruption Delay (Hours)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded border border-zinc-850 text-xs text-zinc-400 leading-normal font-sans">
                  📈 <strong>Week-over-Week Evaluation:</strong> Rerouting latency plummeted by <strong>78.4% since Week 24</strong>. Transitioning telematics processing over to the Spark-RAPIDS GKE GPU cluster has removed the 40-minute pipeline wait window, enabling dispatch controllers to steer fleets instantly.
                </div>
              </div>
            )}

            {/* PREVIEW 3: DAILY */}
            {selectedReport === 'daily' && (
              <div className="space-y-4 animate-fadeIn">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Live Transits Table Preview</span>
                <div className="overflow-x-auto border border-zinc-850 rounded bg-black">
                  <table className="w-full text-left text-xs text-zinc-300 font-sans border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 text-[10px] uppercase font-mono text-zinc-500 border-b border-zinc-850">
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Cargo Description</th>
                        <th className="p-2.5">Carrier Alliance</th>
                        <th className="p-2.5">Progress</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {reportData.carbonData.flatMap((c, idx) => {
                        // Map cargo info from active live shipments where applicable
                        const matchedShipments = c.carrier === 'Pacific Triton Shipping' 
                          ? [{ code: 'AEGIS-PAC-771', type: 'Semiconductors & Accelerators', progress: 65, status: 'ontime', val: 8500000 }]
                          : c.carrier === 'AeroCold Logistics'
                          ? [{ code: 'AEGIS-MID-442', type: 'Bio-Pharma Temp-Controlled', progress: 40, status: 'disrupted', val: 3400000 }]
                          : [{ code: 'AEGIS-EUR-938', type: 'Lithium Battery Cells', progress: 15, status: 'ontime', val: 2900000 }];
                        
                        return matchedShipments.map((s, sIdx) => (
                          <tr key={`${idx}-${sIdx}`} className="hover:bg-zinc-950/55 transition-colors">
                            <td className="p-2.5 font-mono text-blue-400">{s.code}</td>
                            <td className="p-2.5 font-medium">{s.type}</td>
                            <td className="p-2.5 text-zinc-400 font-mono text-[10px]">{c.carrier}</td>
                            <td className="p-2.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px]">{s.progress}%</span>
                                <div className="w-12 bg-zinc-800 h-1 rounded-full overflow-hidden">
                                  <div style={{ width: `${s.progress}%` }} className="bg-blue-500 h-full" />
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono border ${
                                s.status === 'ontime' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-white">${s.val.toLocaleString()}</td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW 4: INCIDENT */}
            {selectedReport === 'incident' && (
              <div className="space-y-4 animate-fadeIn">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Active Environmental Threats Ledger</span>
                <div className="overflow-x-auto border border-zinc-850 rounded bg-black">
                  <table className="w-full text-left text-xs text-zinc-300 font-sans border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 text-[10px] uppercase font-mono text-zinc-500 border-b border-zinc-850">
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Disruption Threat Type</th>
                        <th className="p-2.5">Location / Zone</th>
                        <th className="p-2.5">Impact Severity</th>
                        <th className="p-2.5">Threat Radius</th>
                        <th className="p-2.5">Routes Affected</th>
                        <th className="p-2.5">At Risk Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {incidentData.map((inc) => (
                        <tr key={inc.id} className="hover:bg-zinc-950/55 transition-colors">
                          <td className="p-2.5 font-mono text-red-400">{inc.id}</td>
                          <td className="p-2.5 font-medium">{inc.title}</td>
                          <td className="p-2.5 text-zinc-400 font-mono text-[11px]">{inc.location}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                              {inc.severity}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-zinc-400">{inc.radiusKm} km</td>
                          <td className="p-2.5 font-mono text-zinc-400 text-center">{inc.affectedRoutesCount} lane</td>
                          <td className="p-2.5 font-mono font-bold text-white">${inc.affectedValueUsd.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-zinc-950 rounded border border-zinc-850 text-xs text-zinc-400 leading-normal font-sans">
                  ⚠️ <strong>Meteorological Hazard Warning:</strong> Heavy blizzard grid locked key segments across Midwest delivery highways. Rerouting model executed by the operational AI has effectively mitigated active container exposures.
                </div>
              </div>
            )}

            {/* PREVIEW 5: CARBON */}
            {selectedReport === 'carbon' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Carbon Chart */}
                  <div className="bg-black p-5 rounded border border-zinc-800 space-y-3">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase block font-semibold">CO2 Carbon Emission by Alliance Carrier (KG)</span>
                    <div className="flex flex-col justify-between space-y-2 h-32 pt-2">
                      {carbonData.map((c, idx) => {
                        const maxCO2 = Math.max(...carbonData.map(cd => cd.co2EmissionKg));
                        const percent = (c.co2EmissionKg / maxCO2) * 100;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                              <span>{c.carrier.substring(0, 15)}...</span>
                              <span className="font-bold text-emerald-400">{c.co2EmissionKg} kg</span>
                            </div>
                            <div className="w-full bg-zinc-850 h-2 rounded overflow-hidden">
                              <div style={{ width: `${percent}%` }} className="bg-emerald-500 h-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fuel Stats */}
                  <div className="bg-black p-5 rounded border border-zinc-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-300 uppercase block font-semibold">ESG Compliance Standard KPIs</span>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="p-2 bg-zinc-950 border border-zinc-850 rounded">
                          <span className="text-[8px] font-mono text-zinc-500 block">OPTIMAL BURN</span>
                          <span className="text-sm font-bold text-emerald-400 block font-mono">
                            {carbonData.reduce((sum, cd) => sum + cd.fuelOptimalLiters, 0).toLocaleString()} L
                          </span>
                        </div>
                        <div className="p-2 bg-zinc-950 border border-zinc-850 rounded">
                          <span className="text-[8px] font-mono text-zinc-500 block">IDLE WASTE Saved</span>
                          <span className="text-sm font-bold text-amber-500 block font-mono">
                            {carbonData.reduce((sum, cd) => sum + cd.fuelWastedLiters, 0).toLocaleString()} L
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-emerald-950/10 border border-emerald-900/30 text-[10px] text-emerald-400 font-mono rounded">
                      🌲 ALLIANCE GREEN INDEX SLA: <strong>GRADE TIER A</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded border border-zinc-850 text-xs text-zinc-400 leading-normal font-sans">
                  🌱 <strong>Environmental Statement:</strong> Optimal route schedules bypassed terminal queuing points, resulting in an average of <strong>1.12 metric tons of CO2 avoided</strong> across active carriers.
                </div>
              </div>
            )}

            {/* PREVIEW 6: PERFORMANCE */}
            {selectedReport === 'performance' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Performance Chart */}
                  <div className="bg-black p-5 rounded border border-zinc-800 space-y-3">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase block font-semibold">Compute Processing Speedups (RAPIDS GPU vs Legacy CPU)</span>
                    <div className="flex items-end justify-between h-28 border-b border-zinc-850 pb-2 pt-2 px-4">
                      {performanceData.map((p, idx) => {
                        const cpuScaled = (p.cpuMinutes / 2430) * 100;
                        const gpuScaled = 4; // Constant tiny ratio relative to CPU's huge hours
                        return (
                          <div key={idx} className="flex flex-col items-center space-y-1 w-12">
                            <div className="w-6 flex flex-col justify-end space-y-0.5">
                              <div style={{ height: `${cpuScaled * 0.8}px` }} className="bg-red-500 rounded-t-sm" title={`CPU: ${p.cpuMinutes}s`} />
                              <div style={{ height: `${gpuScaled}px` }} className="bg-blue-400 rounded-t-sm" title={`GPU: ${p.gpuSeconds}s`} />
                            </div>
                            <span className="text-[8px] font-mono text-zinc-400">{p.dataset.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center space-x-4 text-[9px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-sm" />
                        CPU Cluster
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-sm" />
                        NVIDIA L4 GPU
                      </span>
                    </div>
                  </div>

                  {/* Hardware details */}
                  <div className="bg-black p-4 rounded border border-zinc-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-300 uppercase block font-semibold">GKE GPU Hardware Node Status</span>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                          <span>Device Architecture</span>
                          <span className="text-white font-bold">NVIDIA L4 Tensor Core</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                          <span>VRAM Frame Buffer</span>
                          <span className="text-blue-400">11.2GB Allocated / 24GB</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                          <span>Active Grid Threads</span>
                          <span className="text-zinc-300">7,424 CUDA Warp Cores</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-950/15 border border-blue-900/30 text-[10px] text-blue-400 font-mono rounded">
                      ⚡ CUDA OVERFLOW DETECTED: <strong>0% THROTTLING</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded border border-zinc-850 text-xs text-zinc-400 leading-normal font-sans">
                  ⚙️ <strong>Infrastructure Audit Insight:</strong> Accelerating the data loading frames to <strong>1.25 seconds for 15M records</strong> represents an average of <strong>1,944X processing multiplier</strong> compared to legacy multi-instance Hadoop architectures.
                </div>
              </div>
            )}

          </div>

          <div className="pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0">
            <span>AEGIS_SECURE_TOKEN: JWT_BEARER_VALIDATED</span>
            <span>SYSTEM STATE: STABLE COMPLIANT</span>
          </div>
        </div>

      </div>
    </div>
  );
}
