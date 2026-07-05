from fastapi import APIRouter, HTTPException, status
from typing import List
from app.repositories.shipment_repository import shipment_repository
from app.services.gemini_intelligence_service import GeminiIntelligenceService
from app.schemas.shipment import (
    ShipmentSchema,
    DisruptionIncidentSchema,
    RerouteSolveRequestSchema,
    RerouteSolveResponseSchema,
    WaypointSchema
)

router = APIRouter(prefix="/api", tags=["Supply Chain Shipments"])
gemini_service = GeminiIntelligenceService()


@router.get("/shipments", response_model=List[ShipmentSchema])
async def get_all_shipments():
    """Retrieves all registered supply chain shipments in-transit."""
    return [ShipmentSchema(**s.__dict__) for s in shipment_repository.list_all_shipments()]


@router.get("/incidents", response_model=List[DisruptionIncidentSchema])
async def get_all_incidents():
    """Retrieves all active geospatial disruptions."""
    return [
        DisruptionIncidentSchema(
            id=i.id,
            title=i.title,
            description=i.description,
            latitude=i.latitude,
            longitude=i.longitude,
            radiusKm=i.radiusKm,
            severity=i.severity,
            routesAffected=i.routesAffected
        )
        for i in shipment_repository.list_all_incidents()
    ]


@router.post("/reroute/solve", response_model=RerouteSolveResponseSchema)
async def trigger_reroute_solution(payload: RerouteSolveRequestSchema):
    """
    Triggers Gemini Enterprise Intelligence to solve detours.
    Finds the active disruption alert and runs optimal detour algorithms.
    """
    shipment = shipment_repository.get_shipment_by_id(payload.shipment_id)
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment with ID '{payload.shipment_id}' does not exist."
        )

    # Locate the active incident affecting this shipment
    incidents = shipment_repository.list_all_incidents()
    active_incident = next(
        (i for i in incidents if shipment.id in i.routesAffected), None
    )

    if not active_incident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipment '{payload.shipment_id}' has no active disruption incident recorded."
        )

    # Execute the Gemini Intelligence solver
    try:
        solution = gemini_service.solve_shipment_reroute(shipment, active_incident)
        
        # Parse output waypoints to standard models
        parsed_waypoints = [
            WaypointSchema(name=w["name"], lat=w["lat"], lng=w["lng"])
            for w in solution["waypoints"]
        ]

        # Update persistent repository model
        shipment_repository.update_shipment(
            shipment.id,
            status="optimized",
            optimizedRoutePoints=parsed_waypoints,
            geminiSuggestion=solution["gemini_advisory"],
            delayHours=solution["delay_hours"]
        )

        return RerouteSolveResponseSchema(
            shipment_id=shipment.id,
            status="optimized",
            delay_hours=solution["delay_hours"],
            detour_cost_impact=solution["detour_cost_impact"],
            carbon_impact_pct=solution["carbon_impact_pct"],
            gemini_advisory=solution["gemini_advisory"],
            waypoints=parsed_waypoints
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during Gemini solver execution: {str(e)}"
        )
