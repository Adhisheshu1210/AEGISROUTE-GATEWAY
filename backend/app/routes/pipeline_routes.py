from fastapi import APIRouter
from app.services.gpu_pipeline_service import GPUPipelineService
from app.schemas.shipment import GPUPipelineExecutionResultSchema

router = APIRouter(prefix="/api/pipeline", tags=["NVIDIA RAPIDS Telemetry Pipeline"])


@router.post("/run", response_model=GPUPipelineExecutionResultSchema)
async def run_gpu_telemetry_pipeline():
    """
    Triggers the high-throughput NVIDIA RAPIDS cuDF GPU ingestion pipeline check.
    Computes parallel spatial intersections across 14.2M GPS data rows instantly.
    """
    # Execute the telemetry service (will fall back to CPU emulation on local scopes)
    result = GPUPipelineService.execute_telemetry_check(enable_gpu=True)
    
    return GPUPipelineExecutionResultSchema(
        success=result["success"],
        records_processed=result["records_processed"],
        legacy_cpu_seconds=result["legacy_cpu_seconds"],
        gpu_seconds=result["gpu_seconds"],
        speedup_ratio=result["speedup_ratio"],
        throughput_per_ms=result["throughput_per_ms"],
        logs=result["logs"]
    )
