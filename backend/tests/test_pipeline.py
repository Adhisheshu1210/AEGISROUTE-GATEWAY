from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Asserts that the system's infrastructure health check responds with 200."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "cuda_acceleration" in data


def test_list_all_shipments():
    """Asserts that the shipments endpoint lists populated supply lanes."""
    response = client.get("/api/shipments")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Assert shipment model schemas are integrated properly
    first_shipment = data[0]
    assert "code" in first_shipment
    assert "carrier" in first_shipment
    assert "value" in first_shipment


def test_run_gpu_pipeline():
    """Asserts that triggering the L4 GPU simulation completes successfully."""
    response = client.post("/api/pipeline/run")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["records_processed"] == 14200000
    assert data["speedup_ratio"] > 0
    assert len(data["logs"]) > 0


def test_solve_reroute_invalid_shipment():
    """Asserts that requesting to solve detour for an invalid shipment ID returns 404."""
    payload = {"shipment_id": "nonexistent-id"}
    response = client.post("/api/reroute/solve", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
