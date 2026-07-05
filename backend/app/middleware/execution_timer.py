import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger("AegisRoute.Middleware")


class ExecutionTimerMiddleware(BaseHTTPMiddleware):
    """
    HTTP middleware registering duration of API execution pipelines.
    Guarantees performance observability across the entire architecture.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        
        # Execute down-stream handlers
        response = await call_next(request)
        
        duration = time.time() - start_time
        duration_ms = round(duration * 1000, 2)
        
        # Inject execution latency headers for UI instrumentation
        response.headers["X-Execution-Latency-Ms"] = str(duration_ms)
        
        # Structured log capture
        logger.info(
            f"API Request processed: {request.method} {request.url.path} | "
            f"Status: {response.status_code} | Latency: {duration_ms}ms"
        )
        
        return response
