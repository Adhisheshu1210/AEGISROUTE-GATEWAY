from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.config.logging_config import configure_logging
from app.middleware.execution_timer import ExecutionTimerMiddleware
from app.routes.shipment_routes import router as shipment_router
from app.routes.pipeline_routes import router as pipeline_router

# Configure root logs
configure_logging()


def create_app() -> FastAPI:
    """FastAPI application factory configuring and assembling all modular components."""
    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "Enterprise Real-Time Supply Chain Disruption Intelligence Platform API. "
            "Ingests high-throughput telemetry using NVIDIA RAPIDS (cuDF) "
            "and generates optimal detours with Gemini Enterprise Intelligence."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # 1. Enable Global CORS (Cross-Origin Resource Sharing)
    # Allows full interoperability between React/Vite frontends and python gateways
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Append Custom Performance Instrumentation Middleware
    app.add_middleware(ExecutionTimerMiddleware)

    # 3. Mount Modular API Routers
    app.include_router(shipment_router)
    app.include_router(pipeline_router)

    @app.get("/health", tags=["Infrastructure Monitoring"])
    async def get_health_status():
        """Basic ping endpoint for container probes."""
        return {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "cuda_acceleration": settings.ENABLE_GPU_ACCELERATION
        }

    return app


app = create_app()
