import logging
import sys
import json
from datetime import datetime


class JSONFormatter(logging.Formatter):
    """
    Custom logging formatter returning structured, single-line JSON records.
    Optimized for modern log aggregators like GCP Cloud Logging, Elastic, or Datadog.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        # Include trace/exception info if active
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


def configure_logging():
    """
    Sets up the unified root logging configurations to capture application-wide actions.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Clean existing handlers to avoid redundant logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console stream handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)

    # Disable excessive log spam from external networking engines
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
