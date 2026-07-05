/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export type PriorityLevel = 'high' | 'medium' | 'low';
export type ShipmentStatus = 'ontime' | 'delayed' | 'disrupted';
export type IncidentType = 'hurricane' | 'storm' | 'port_congestion' | 'customs_delay' | 'road_closure' | 'accident';
export type IncidentSeverity = 'critical' | 'high' | 'medium';

export interface RoutePoint extends Coordinate {
  name?: string;
  isCustomsCheckpoint?: boolean;
  isPort?: boolean;
}

export interface Shipment {
  id: string;
  code: string;
  cargoType: string;
  carrier: string;
  origin: string;
  destination: string;
  progress: number; // 0 to 100
  currentCoords: Coordinate;
  originalEta: string;
  currentEta: string;
  delayHours: number;
  status: ShipmentStatus;
  priority: PriorityLevel;
  value: number; // in USD
  weatherCondition: string;
  currentRoutePoints: RoutePoint[];
  optimizedRoutePoints?: RoutePoint[];
  geminiSuggestion?: string;
  activeDisruptionId?: string;
}

export interface DisruptionIncident {
  id: string;
  type: IncidentType;
  title: string;
  location: string;
  description: string;
  severity: IncidentSeverity;
  coordinates: Coordinate;
  radiusKm: number;
  routesAffected: string[]; // Shipment IDs affected
  timestamp: string;
}

export interface GpuMetric {
  legacyTimeMinutes: number;
  rapidsTimeSeconds: number;
  speedupMultiplier: number;
  recordsProcessed: number;
  throughputMsGpu: number; // records per ms
  activeGpuCores: number;
  gpuMemoryUsageGb: number;
  lastRanTimestamp: string;
}

export interface GeminiRerouteResponse {
  shipmentId: string;
  originalPathDetails: string;
  recommendedPathDetails: string;
  originalDistanceMiles: number;
  recommendedDistanceMiles: number;
  originalTimeHours: number;
  recommendedTimeHours: number;
  estimatedArrivalDiffHours: number;
  estimatedCostDiffDollars: number;
  carbonEmissionDiffPercent: number;
  reasoning: string;
  confidenceScore: number;
  customsRiskRating: 'low' | 'moderate' | 'high';
  reroutePoints: RoutePoint[];
}

export interface DashboardStats {
  totalShipments: number;
  ontimeCount: number;
  delayedCount: number;
  disruptedCount: number;
  activeIncidentsCount: number;
  atRiskValueUsd: number;
  averageTimeSavedMinutes: number;
}
