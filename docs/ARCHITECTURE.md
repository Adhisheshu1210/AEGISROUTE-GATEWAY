# SYSTEM ARCHITECTURE DOCUMENT

## 1. Executive System Topology

AegisRoute is engineered as a secure, full-stack, enterprise-grade cloud native platform. The architecture is split into three main layers:
1.  **High-Performance React-Vite Frontend Applet**: Renders high-density GIS maps, live operational lanes, real-time telemetry execution graphs, notification centers, and a security auditing console.
2.  **High-Throughput Python FastAPI Backend Services**: Handles massive telemetry ingestion, GPU-accelerated spatial calculations, and Google GenAI orchestration.
3.  **Executive Streamlit Operations Portal**: Provides business intelligence (BI) views, Looker-style visual KPI grids, and direct simulation controls.

```
                    ┌──────────────────────────────┐
                    │      React-Vite Client       │
                    │   (3000 Ingress UI Applet)   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼ [JSON over HTTPS / WebSocket]
┌──────────────────────────────────────────────────────────────────┐
│                      Enterprise Service Mesh                     │
│               (GKE Autopilot / Cloud Run Ingress)                │
└──────┬────────────────────────────────────────────────────┬──────┘
       │                                                    │
       ▼ [FastAPI Internal Routing]                         ▼ [Streamlit BI]
┌──────────────────────────────┐            ┌──────────────────────────────┐
│       FastAPI Backend        │            │    Streamlit Portal (8501)   │
│   (Port 8000 Container)      │            │   Interactive GIS & Logs    │
└──────┬──────────────┬────────┘            └──────────────────────────────┘
       │              │
       │              ▼ [Google GenAI SDK]
       │       ┌──────────────────────┐
       │       │    Gemini 3.5 AI     │
       │       │    Detour Solver     │
       │       └──────────────────────┘
       ▼ [NV-Link / PCIe]
┌──────────────────────────────┐
│    NVIDIA L4 GPU (VRAM)      │
│  Massive cuDF Parallelism    │
└──────────────────────────────┘
```

---

## 2. File Architecture Directory Map

The platform codebase is structured in a highly modular, decoupled, and clean layout:

```text
/ (Workspace Root)
├── package.json                    # Node dependencies & automation scripts
├── tsconfig.json                   # Strict TypeScript compiler presets
├── vite.config.ts                  # Vite build tool and dev configurations
├── index.html                      # HTML5 Canvas container
├── server.ts                       # Express.js developer preview gateway
├── src/                            # React-Vite Frontend application
│   ├── main.tsx                    # System boots & renders App.tsx
│   ├── App.tsx                     # Global layout state & tab orchestration
│   ├── types.ts                    # Consolidated TypeScript schema definitions
│   ├── index.css                   # Tailwind CSS global import directives
│   └── components/                 # Decoupled interface tabs
│       ├── Sidebar.tsx             # Main dashboard navigation menu
│       ├── OverviewTab.tsx         # Real-time GIS map, fleet cards, pipeline triggers
│       ├── RouteOptimizer.tsx      # Gemini detour spatial visualizer and details
│       ├── AnalyticsTab.tsx        # Spark-RAPIDS charts & real-time cuDF metrics
│       ├── NotificationConsole.tsx # Multi-channel alerting templates & workflows
│       ├── ReportingTab.tsx        # Enterprise PDF, Excel, and CSV export panel
│       ├── SecurityHub.tsx         # Identity tokens, active session logs, audit trail
│       ├── TestCenterTab.tsx       # Interactive automated QA suite runner
│       └── LoginScreen.tsx         # SSO-bypass secure system entry gate
│
├── backend/                        # High-Performance Python Services
│   ├── Dockerfile                  # NVIDIA RAPIDS base container blueprint
│   ├── requirements.txt            # Locked pip packages (fastapi, google-genai, cuDF)
│   ├── streamlit_app.py            # Premium Streamlit Glassmorphic Portal
│   ├── app/                        # FastAPI REST Application
│   │   ├── main.py                 # Core initialization, CORs, and routing registry
│   │   ├── config/                 # Settings manager and JSON logging formatter
│   │   ├── middleware/             # HTTP execution latency tracker
│   │   ├── models/                 # Domain dataclass definitions
│   │   ├── schemas/                # Strict Pydantic serialization contracts
│   │   ├── repositories/           # Seed datasets and data storage mock abstractions
│   │   ├── services/               # GPU Pipelines & Gemini integration modules
│   │   └── routes/                 # REST controllers (shipment & telemetry)
│   └── tests/                      # Python automated test suite
│
└── tests/                          # Integrated QA Validation Suite (TS)
    ├── test_harness_util.ts        # Custom test suite reporting mechanisms
    ├── unit.test.ts                # Carbon formulas, rating structures, and JWT tests
    ├── integration.test.ts         # REST API and Express router mocking checks
    ├── performance.bench.ts        # High-volume execution speedup computations
    ├── gpu_benchmark.test.ts       # NVIDIA L4 core, memory bandwidth, and thermal specs
    ├── load.test.ts                # High-concurrency traffic spike simulations
    ├── security.test.ts            # RBAC roles (Driver, Manager, Admin) validation
    ├── api.test.ts                 # Rest API security header checks (X-Frame-Options)
    └── run_all_tests.ts            # Consolidated automated runner compiling metrics
```

---

## 3. Core Software Engineering Components

### A. The Front-End (React + TypeScript + Tailwind)
*   **Decoupled State**: State is localized across tabs and shared via React props, ensuring ultra-fast rendering cycles and no infinite re-render loops.
*   **Visualizations**: Custom geospatial coordinate tracks are plotted over interactive visual graphs. Uses **Recharts** to plot high-density GPU performance logs and carbon emissions charts.
*   **Design Tokens**: Strictly adheres to a sleek obsidian-black dark theme, featuring thin glowing borders, high-contrast typography (Inter display paired with JetBrains Mono), glassmorphism-inspired components, and smooth CSS transitions.

### B. The Ingestion & Math Engine (Python FastAPI + NVIDIA cuDF)
*   **Geospatial Intersection Pipeline**: Reads high-volume parquet files directly into cuDF GPU dataframes.
*   **Math Kernel Acceleration**: By utilizing vectorized CUDA functions, the system evaluates Euclidean and Haversine equations simultaneously on thousands of GPU cores. This avoids python-level loops, achieving sub-second speeds.
*   **Structured Logging**: Consoles outputs formatted in high-observability JSON layouts, logging exact container latency, active CUDA thread maps, and memory bandwidth utilization.

### C. The Cognitive Engine (Google GenAI SDK - Gemini 3.5 Flash)
*   **Modern SDK Integration**: Uses the new official `@google/genai` (Node/TypeScript) and `google-genai` (Python) packages.
*   **JSON Schema Enforcement**: Rather than parsing unstructured text, AegisRoute enforces structural integrity by configuring Gemini to output strict JSON schemas containing exact route waypoint lists, numerical delay metrics, carbon ratings, and localized reasoning.
*   **SLA and Risk Splicing**: The service injects contract SLAs, port traffic levels, and weather severity scores directly into the prompt context, generating optimized and legally robust route detours.

---

## 4. Multi-Tier Security Controls

AegisRoute operates under a zero-trust model, maintaining total isolation and protection:
1.  **API Key Encryption**: Server keys (e.g., `GEMINI_API_KEY`) are kept on server-side variables, completely hidden from client browsers.
2.  **Role-Based Access Control (RBAC)**: Enforces specific API and UI access limitations:
    *   **Driver**: View-only telemetry access. Forbidden from triggering route modifications.
    *   **Manager**: Can trigger and approve route detours. Restricted from changing firewall rules.
    *   **Admin**: Full system access, including cryptographic keys, security configurations, and audit trailing.
3.  **Modern HTTP Security Headers**: Configures REST responses with clickjacking and MIME-sniffing protection:
    *   `X-Frame-Options: DENY`
    *   `X-Content-Type-Options: nosniff`
    *   `Content-Security-Policy (CSP)`
