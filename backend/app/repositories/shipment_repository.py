from typing import List, Optional
from app.models.shipment import ShipmentModel, DisruptionIncidentModel, WaypointModel


class ShipmentRepository:
    """
    Abstracted repository representing persistence services.
    Uses in-memory high-fidelity seed states matching standard database operations.
    """
    def __init__(self):
        # High fidelity shipments seeding matching active trans-national supply chains
        self._shipments = {
            "ship-001": ShipmentModel(
                id="ship-001",
                code="AEGIS-VANGUARD",
                carrier="MAERSK LINE",
                value=42500000.0,
                priority="high",
                progress=42,
                weatherCondition="Clear Sky",
                cargoType="Lithium Battery packs",
                origin="Venlo customs node, NL",
                destination="Frankfurt Gateway, DE",
                status="on-time"
            ),
            "ship-002": ShipmentModel(
                id="ship-002",
                code="AEGIS-ZEPHYR",
                carrier="HAPAG-LLOYD",
                value=84100000.0,
                priority="high",
                progress=68,
                weatherCondition="Severe Blizzard Alert",
                cargoType="TSMC Semiconductor Wafers",
                origin="Port of LA, USA",
                destination="Houston Distribution Hub, USA",
                status="disrupted"  # Needs active rerouting
            ),
            "ship-003": ShipmentModel(
                id="ship-003",
                code="AEGIS-TITAN",
                carrier="COSCO SHIPPING",
                value=29000000.0,
                priority="medium",
                progress=15,
                weatherCondition="Light Rain",
                cargoType="Heavy Industrial Turbines",
                origin="Rotterdam Port, NL",
                destination="Hamburg Terminal, DE",
                status="on-time"
            )
        }

        # Active incidents seeding
        self._incidents = [
            DisruptionIncidentModel(
                id="inc-001",
                title="Extreme Winter Blizzard (Chicago corridor)",
                description="Heavy blizzard causing major highway blocks and local port closures. Operations halted.",
                latitude=41.8781,
                longitude=-87.6298,
                radiusKm=350.0,
                severity="high",
                routesAffected=["ship-002"]
            )
        ]

    def list_all_shipments(self) -> List[ShipmentModel]:
        """Fetch all registered trans-national shipments."""
        return list(self._shipments.values())

    def get_shipment_by_id(self, shipment_id: str) -> Optional[ShipmentModel]:
        """Fetch a specific shipment by its ID."""
        return self._shipments.get(shipment_id)

    def list_all_incidents(self) -> List[DisruptionIncidentModel]:
        """Fetch all active disruption alerts."""
        return self._incidents

    def update_shipment(self, shipment_id: str, **kwargs) -> Optional[ShipmentModel]:
        """Updates properties of a shipment, functioning like an ORM update."""
        shipment = self.get_shipment_by_id(shipment_id)
        if not shipment:
            return None
        
        for key, val in kwargs.items():
            if hasattr(shipment, key):
                setattr(shipment, key, val)
        return shipment


# Reusable Singleton instance for application services
shipment_repository = ShipmentRepository()
