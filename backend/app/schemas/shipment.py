from pydantic import BaseModel, Field
from typing import List, Optional


class WaypointSchema(BaseModel):
    name: str = Field(..., examples=["Midway Port Hub"])
    lat: float = Field(..., examples=[32.7157])
    lng: float = Field(..., examples=[-117.1611])


class ShipmentSchema(BaseModel):
    id: str
    code: str
    carrier: str
    value: float
    priority: str
    progress: int
    weatherCondition: str
    cargoType: str
    origin: str
    destination: str
    status: str
    delayHours: int = 0
    optimizedRoutePoints: Optional[List[WaypointSchema]] = None
    geminiSuggestion: Optional[str] = None


class DisruptionIncidentSchema(BaseModel):
    id: str
    title: str
    description: str
    latitude: float
    longitude: float
    radiusKm: float
    severity: str
    routesAffected: List[str]


class RerouteSolveRequestSchema(BaseModel):
    shipment_id: str = Field(..., examples=["ship-002"])


class RerouteSolveResponseSchema(BaseModel):
    shipment_id: str
    status: str
    delay_hours: int
    detour_cost_impact: float
    carbon_impact_pct: float
    gemini_advisory: str
    waypoints: List[WaypointSchema]


class GPUPipelineExecutionResultSchema(BaseModel):
    success: bool
    records_processed: int
    legacy_cpu_seconds: float
    gpu_seconds: float
    speedup_ratio: float
    throughput_per_ms: float
    logs: List[str]
