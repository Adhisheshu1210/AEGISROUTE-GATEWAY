# REST API DOCUMENTATION

AegisRoute features a secure, type-safe REST API built on the Python FastAPI framework. All API routes enforce strict schema contracts through Pydantic V2 and are designed to return predictable JSON payloads.

---

## 1. Global API Configuration

*   **Production API URL**: `https://api.aegisroute.enterprise.com/api/v1`
*   **Response Format**: `application/json`
*   **Security Header Requirement**: All mutating or sensitive requests require a secure JWT Bearer authorization header.
    ```text
    Authorization: Bearer <JWT_TOKEN_SIGNATURE>
    ```

---

## 2. API Security and Compliance Headers

All outgoing REST API gateway responses include strict HTTP security compliance headers to prevent unauthorized client hijacking and MIME manipulation:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-Execution-Latency-Ms: 145.2
```

---

## 3. Endpoints Directory & Specifications

### A. Health and System Telemetry
Check system cluster states and database connections.

*   **URL**: `/health`
*   **Method**: `GET`
*   **Authentication**: None
*   **Success Response (200 OK)**:
    ```json
    {
      "status": "healthy",
      "database": "online",
      "nodeCluster": "gke-rapids-l4-01",
      "cudaVersion": "12.0",
      "timestamp": "2026-07-04T16:32:00Z"
    }
    ```

---

### B. Ingest and Run GPU Telemetry Pipeline
Trigger the CUDA-accelerated cuDF ingestion and collision-checking loop on the NVIDIA L4 GPU.

*   **URL**: `/pipeline/run`
*   **Method**: `POST`
*   **Authentication**: Required (Role: `Admin` or `Manager`)
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "rowsProcessed": 14200000,
      "gpuExecutionTimeSeconds": 1.15,
      "speedupVsCpu": "2008x",
      "activeHazardsMatched": 3,
      "disruptedVehicleIds": [
        "AEGIS-PAC-771",
        "AEGIS-LNK-092",
        "AEGIS-COR-112"
      ],
      "metrics": {
        "dieTempCelsius": 45,
        "cudaCoresActive": 7424,
        "memoryBandwidthGbSec": 900
      }
    }
    ```

---

### C. Retrieve Active Shipments & Lanes
Fetch all registered global shipping lanes, tracking progress, and active hazard exposure states.

*   **URL**: `/shipments`
*   **Method**: `GET`
*   **Authentication**: Required (Role: `Admin`, `Manager`, or `Driver`)
*   **Success Response (200 OK)**:
    ```json
    [
      {
        "id": "AEGIS-PAC-771",
        "shipName": "Aegis Pacifica",
        "origin": "Port of Seattle",
        "destination": "Port of Yokohama",
        "progress": 65,
        "cargoType": "Cold-Chain Pharmaceuticals",
        "isDisrupted": true,
        "activeHazard": "Blizzard Centroid Alpha",
        "coordinates": {
          "lat": 41.1,
          "lng": -81.0
        }
      }
    ]
    ```

---

### D. Solve Route Disruption (Gemini AI Solver)
Submit an active shipment disruption to calculate an optimized detour waypoint coordinate set using Gemini 3.5 Flash.

*   **URL**: `/reroute/solve`
*   **Method**: `POST`
*   **Authentication**: Required (Role: `Admin` or `Manager`)
*   **Request Schema (`RerouteSolveRequestSchema`)**:
    ```json
    {
      "shipmentId": "AEGIS-PAC-771",
      "incidentId": "HAZARD-092",
      "optimizeFor": "carbon_offset"
    }
    ```
*   **Response Schema (`RerouteSolveResponseSchema` via Gemini JSON Output)**:
    ```json
    {
      "success": true,
      "shipmentId": "AEGIS-PAC-771",
      "originalDistanceMiles": 5120,
      "recommendedDistanceMiles": 4820,
      "etaDelayDifferenceHours": -4.5,
      "carbonEmissionSavingsKg": 1240.5,
      "carbonRating": "A",
      "detourWaypoints": [
        {"lat": 38.5, "lng": -83.2, "name": "Saddle Waypoint 1"},
        {"lat": 35.1, "lng": -89.4, "name": "Secure Lane Intersect 2"}
      ],
      "reasoning": "Detouring south of Blizzard Centroid Alpha. Prevents critical exposure to sub-zero container holds, safeguarding refrigerated pharmaceuticals. By reducing total transit times, the voyage cuts fuel expenditure, yielding a carbon rating of A."
    }
    ```

---

## 4. Error Envelope Specification

AegisRoute uses standardized error envelopes for failed executions. All non-200 responses return a unified payload to ensure smooth integration with consumer frontend frameworks:

### A. 401 Unauthorized (Missing or Invalid Signature JWT)
```json
{
  "error": "Unauthorized credentials signature",
  "code": "AUTH_INVALID_TOKEN",
  "timestamp": "2026-07-04T16:32:00Z"
}
```

### B. 400 Bad Request (Missing Input Schema Parameters)
```json
{
  "error": "Missing required shipmentId or incidentId attributes",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-07-04T16:32:00Z"
}
```

### C. 500 Internal Server Error (GPU Memory Allocation Failure)
```json
{
  "error": "CUDA out of memory during GPU dataframe allocation",
  "code": "HARDWARE_EXCEPTION",
  "timestamp": "2026-07-04T16:32:00Z"
}
```
