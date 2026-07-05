from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class WaypointModel:
    """Represents a geospatial node along a transportation supply path."""
    name: str
    lat: float
    lng: float


@dataclass
class ShipmentModel:
    """Represents a physical supply chain cargo lane under active GKE supervision."""
    id: str
    code: str
    carrier: str
    value: float
    priority: str  # high, medium, low
    progress: int  # 0 to 100% completed
    weatherCondition: str
    cargoType: str
    origin: str
    destination: str
    status: str  # on-time, delayed, disrupted
    delayHours: int = 0
    optimizedRoutePoints: Optional[List[WaypointModel]] = None
    geminiSuggestion: Optional[str] = None


@dataclass
class DisruptionIncidentModel:
    """Represents a hazardous situational alert impacting delivery timelines."""
    id: str
    title: str
    description: str
    latitude: float
    longitude: float
    radiusKm: float
    severity: str  # high, warning
    routesAffected: List[str] = field(default_factory=list)
