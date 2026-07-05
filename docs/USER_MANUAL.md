# USER MANUAL

Welcome to the **AegisRoute Operations Hub**. This manual is designed to guide logistics dispatchers, fleet directors, and vessel pilots through the core workflows of real-time supply chain disruption detection and AI-driven path optimization.

---

## 🎨 Visual Themes & Main Sidebar

The AegisRoute interface uses a high-contrast Obsidian Slate theme. You can navigate the platform using the vertical menu on the left:

*   **Overview Tab** (Map Pin icon): View the live operations map, current fleet health indices, real-time telemetry metrics, and trigger controls.
*   **Route Optimizer Tab** (Compass icon): View detailed, side-by-side maps and charts comparing disrupted routes to Gemini-generated detours.
*   **Analytics Tab** (Cpu icon): Track live system throughput metrics, GPU core temps, and emission rating charts.
*   **Notification Tab** (Bell icon): Access contact template presets, SMS gateway pipelines, and escalation routing trees.
*   **Reports Tab** (FileText icon): Generate, review, and download PDF audit logs, Excel sheets, and CSV metrics.
*   **Security Tab** (ShieldCheck icon): Manage API tokens, active session footprints, and review system action logs.
*   **Tests Tab** (Flame icon): Run automated code validation tests and compile coverage reports.

---

## 🚀 Key Operational Workflows

### Workflow 1: Running the High-Throughput Ingestion Pipeline
To analyze massive telemetry datasets and identify active disruptions across global transit routes:

1.  Navigate to the **Overview Tab**.
2.  Locate the **NVIDIA RAPIDS Ingest Control Panel** in the top right.
3.  Click the blue **"Run GPU Recalculation"** button.
4.  The system maps 14.2 Million GPS rows directly onto CUDA cores, completes collision-checking calculations in ~1.15 seconds, and updates the **Operational Telematics Status** grid. Any intercepted lanes will highlight as `DISRUPTED` in red.

---

### Workflow 2: Solving an Active Shipping Disruption
When a lane status flags as `DISRUPTED` (e.g., due to a Category 5 hurricane or local port backlog):

```
[Disrupted Alert Red] ──> [Click "Optimize Route"] ──> [Gemini Thinks] ──> [Detour Map Plots Green]
```

1.  Navigate to the **Route Optimizer Tab**.
2.  Locate the list of **Disrupted Shipments** on the left.
3.  Click **"Optimize Route"** on the affected vessel (e.g., *Aegis Pacifica*).
4.  The platform connects securely to **Gemini 3.5 Flash**, passing cargo metadata, SLA bounds, and weather coordinates.
5.  Within seconds, the map updates to display:
    *   The original route track (marked in **dashed coral red**).
    *   The newly optimized, safe detour track (marked in **solid emerald green**).
6.  Review the key metrics card on the right:
    *   **Distance Difference**: Total detour distance offset.
    *   **ETA Change**: SLA impact in hours.
    *   **Carbon Offset**: Reductions in CO2 kilograms, graded against standard ESG ratings (A, B, C, D).
7.  Read the **Gemini Decision Reasoning** text block for a detailed justification of the path.
8.  Click **"Approve & Transmit Detour"** to send the waypoints directly to the ship's navigation console and trigger multi-channel team alerts.

---

### Workflow 3: Configuring Notifications & Escalation Trees
Ensure all logistics personnel are immediately notified when detours are approved:

1.  Navigate to the **Notification Console**.
2.  Select a template preset (e.g., *Weather Alert* or *SLA Escalation*).
3.  Modify the message body inside the text editor.
4.  Confirm destination parameters: SMS gateways, Slack channel webhooks, and SMTP email parameters.
5.  Under **Multi-Factor Escalation**, configure contact groups. For critical SLA threats, set the escalation timer to trigger alternative routes if dispatchers do not respond within 15 minutes.
6.  Click **"Save Configuration"** to deploy your alerting workflow.

---

### Workflow 4: Exporting Compliance and ESG Audits
Export your optimization metrics for environmental regulators and insurers:

1.  Navigate to the **Reporting Tab**.
2.  Under **Document Exports**, select your desired file format:
    *   **PDF Summary**: High-fidelity, styled executive briefs.
    *   **Excel Audits**: Multi-sheet spreadsheets tracking fuel calculations, routes, and financial savings.
    *   **CSV Dataset**: Raw telemetry dumps.
3.  Select your reporting timeframe and click **"Generate & Export"**.
4.  Download the compiled file from your browser's download queue.
