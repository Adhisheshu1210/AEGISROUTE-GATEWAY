/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shipment, DisruptionIncident, GpuMetric, DashboardStats } from '../src/types';

export const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: 'ship-001',
    code: 'AEGIS-PAC-771',
    cargoType: 'Semiconductors & AI Accelerators',
    carrier: 'Pacific Triton Shipping',
    origin: 'Shanghai (PVG)',
    destination: 'Los Angeles (LAX-Port)',
    progress: 65,
    currentCoords: { lat: 31.5, lng: -142.2 },
    originalEta: '2026-07-06T18:00:00Z',
    currentEta: '2026-07-06T18:00:00Z',
    delayHours: 0,
    status: 'ontime',
    priority: 'high',
    value: 8500000,
    weatherCondition: 'Clear',
    currentRoutePoints: [
      { lat: 31.2, lng: 121.5, name: 'Shanghai Port' },
      { lat: 32.5, lng: 135.0, name: 'East China Sea Trans-point' },
      { lat: 35.0, lng: 165.0, name: 'North Pacific Great Circle' },
      { lat: 32.0, lng: -140.0, name: 'US EEZ Entry Corridor' },
      { lat: 33.7, lng: -118.2, name: 'Port of Los Angeles', isPort: true }
    ]
  },
  {
    id: 'ship-002',
    code: 'AEGIS-MID-442',
    cargoType: 'Temperature-Controlled Bio-Pharma',
    carrier: 'AeroCold Logistics',
    origin: 'Chicago Warehouse Hub',
    destination: 'New York JFK Cargo Terminal',
    progress: 40,
    currentCoords: { lat: 41.2, lng: -81.5 }, // Near Cleveland, OH
    originalEta: '2026-07-04T22:30:00Z',
    currentEta: '2026-07-04T22:30:00Z',
    delayHours: 0,
    status: 'ontime',
    priority: 'high',
    value: 3400000,
    weatherCondition: 'Cloudy',
    currentRoutePoints: [
      { lat: 41.8, lng: -87.6, name: 'Chicago Logistics Node' },
      { lat: 41.6, lng: -83.5, name: 'Toledo Interstate Nexus' },
      { lat: 41.2, lng: -81.5, name: 'Cleveland Delivery Lane' },
      { lat: 41.0, lng: -77.0, name: 'Pennsylvania Ridge Pipeline' },
      { lat: 40.6, lng: -73.7, name: 'JFK Air Freight Complex' }
    ]
  },
  {
    id: 'ship-003',
    code: 'AEGIS-ATL-109',
    cargoType: 'Aerospace Composite Turbines',
    carrier: 'Trans-Atlantic Express',
    origin: 'Frankfurt (FRA)',
    destination: 'Houston Intercontinental (IAH)',
    progress: 80,
    currentCoords: { lat: 29.5, lng: -87.5 }, // Gulf of Mexico edge
    originalEta: '2026-07-05T06:15:00Z',
    currentEta: '2026-07-05T06:15:00Z',
    delayHours: 0,
    status: 'ontime',
    priority: 'medium',
    value: 5200000,
    weatherCondition: 'Overcast',
    currentRoutePoints: [
      { lat: 50.0, lng: 8.5, name: 'Frankfurt Depot' },
      { lat: 49.0, lng: -10.0, name: 'Celtic Sea Departure Gate' },
      { lat: 35.0, lng: -45.0, name: 'Mid-Atlantic Trade Lane' },
      { lat: 26.0, lng: -80.0, name: 'Florida Straits' },
      { lat: 28.5, lng: -88.0, name: 'Gulf Transit Area' },
      { lat: 29.9, lng: -95.3, name: 'Houston Air Hub' }
    ]
  },
  {
    id: 'ship-004',
    code: 'AEGIS-EUR-938',
    cargoType: 'Lithium EV Battery Cells',
    carrier: 'EuroRail Intermodal',
    origin: 'Rotterdam Gateway Port',
    destination: 'Munich Giga-Assembly Hub',
    progress: 15,
    currentCoords: { lat: 51.2, lng: 5.8 }, // Dutch/German Border
    originalEta: '2026-07-05T02:00:00Z',
    currentEta: '2026-07-05T02:00:00Z',
    delayHours: 0,
    status: 'ontime',
    priority: 'high',
    value: 2900000,
    weatherCondition: 'Light Rain',
    currentRoutePoints: [
      { lat: 51.9, lng: 4.1, name: 'Rotterdam Port Terminal' },
      { lat: 51.2, lng: 5.8, name: 'Venlo Transit Zone' },
      { lat: 50.1, lng: 8.6, name: 'Frankfurt Gateway' },
      { lat: 49.4, lng: 11.0, name: 'Nuremberg Exchange Depot' },
      { lat: 48.1, lng: 11.5, name: 'Munich Giga-Assembly Hub' }
    ]
  },
  {
    id: 'ship-005',
    code: 'AEGIS-PAC-202',
    cargoType: 'Advanced Autonomous Systems',
    carrier: 'Apex Maritime',
    origin: 'Tokyo Port',
    destination: 'Seattle-Tacoma Int Depot',
    progress: 50,
    currentCoords: { lat: 44.5, lng: 175.5 }, // Pacific Midpoint
    originalEta: '2026-07-07T12:00:00Z',
    currentEta: '2026-07-07T12:00:00Z',
    delayHours: 0,
    status: 'ontime',
    priority: 'low',
    value: 1700000,
    weatherCondition: 'Foggy',
    currentRoutePoints: [
      { lat: 35.6, lng: 139.8, name: 'Tokyo Port' },
      { lat: 42.0, lng: 160.0, name: 'Kuroshio Extension Corridor' },
      { lat: 45.0, lng: 180.0, name: 'International Date Line Lane' },
      { lat: 47.0, lng: -140.0, name: 'Cascadia Oceanic Corridor' },
      { lat: 47.6, lng: -122.3, name: 'Seattle Terminal', isPort: true }
    ]
  }
];

export const INITIAL_INCIDENTS: DisruptionIncident[] = [
  {
    id: 'inc-001',
    type: 'storm',
    title: 'Severe Ohio Interstate Blizzard',
    location: 'Interstate 80 Corridor, Ohio',
    description: 'Sudden high-impact freeze with 15-inch snow accumulation causing 40-mile logistics blockages and jackknifed trailer conditions on arterial lanes.',
    severity: 'critical',
    coordinates: { lat: 41.1, lng: -81.0 },
    radiusKm: 150,
    routesAffected: ['ship-002'],
    timestamp: '2026-07-04T07:45:00Z'
  }
];

export const INITIAL_GPU_METRIC: GpuMetric = {
  legacyTimeMinutes: 38.5,
  rapidsTimeSeconds: 1.15,
  speedupMultiplier: 2008.7,
  recordsProcessed: 14250000,
  throughputMsGpu: 12391.3,
  activeGpuCores: 7424, // NVIDIA L4 GPU Spec
  gpuMemoryUsageGb: 11.2,
  lastRanTimestamp: '2026-07-04T08:00:00Z'
};

export function getStats(shipments: Shipment[], incidents: DisruptionIncident[]): DashboardStats {
  const totalShipments = shipments.length;
  const ontimeCount = shipments.filter(s => s.status === 'ontime').length;
  const delayedCount = shipments.filter(s => s.status === 'delayed').length;
  const disruptedCount = shipments.filter(s => s.status === 'disrupted').length;
  const activeIncidentsCount = incidents.length;
  
  const atRiskValueUsd = shipments
    .filter(s => s.status === 'delayed' || s.status === 'disrupted')
    .reduce((sum, s) => sum + s.value, 0);
    
  return {
    totalShipments,
    ontimeCount,
    delayedCount,
    disruptedCount,
    activeIncidentsCount,
    atRiskValueUsd,
    averageTimeSavedMinutes: 36.5 // Constant simulated value representation
  };
}
