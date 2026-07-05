# MONETIZATION FRAMEWORK

AegisRoute employs a multi-tier, sustainable monetization model designed to scale alongside our customers' shipping volumes, cloud compute needs, and business requirements.

---

## 1. Subscription Licensing Tiers

Our software-as-a-service (SaaS) core platform is available under three progressive plans:

```
┌──────────────────────────────────────────────────────────────────┐
│                      AegisRoute Core SaaS                        │
├───────────────────┬──────────────────────────────┬───────────────┤
│    Standard       │          Enterprise          │   Unlimited   |
│ $4,500/mo base    │ $12,000/mo base              │ Custom Pricing|
│ Up to 50 vessels  │ Up to 250 vessels            │ Global Fleet  |
└───────────────────┴──────────────────────────────┴───────────────┘
```

### A. Professional tier ($4,500 / month flat-rate)
Designed for mid-sized regional carriers and trucking companies:
*   Includes tracking for up to **50 active vessels or 500 terrestrial fleet trucks**.
*   Full access to the React Dashboard and the Notification Console.
*   Standard multi-threaded CPU route calculation fallback.
*   Standard email and community slack channel support.

### B. Enterprise tier ($12,000 / month flat-rate)
Designed for major multi-national logistics companies and maritime operators:
*   Includes tracking for up to **250 active vessels or 2,500 fleet trucks**.
*   Full access to the high-performance **NVIDIA L4 GPU parallel calculation pipeline**.
*   Full integration with the **Google Gemini 3.5 Flash detour engine** (enforcing strict JSON schemas).
*   Built-in Compliance Reporting Tab with automated PDF, Excel, and CSV exporting tools.
*   Dedicated 24/7 technical support with a strict **30-minute SLA response window**.

### C. Sovereign Fleet tier (Custom Enterprise Agreement)
Designed for global shipping lines and government defense logistics:
*   Tracking for unlimited worldwide fleets, shipping lanes, and containers.
*   On-premise or custom virtual private cloud (VPC) deployments (GCP, AWS, Azure).
*   Custom fine-tuned Gemini models trained on internal cargo contract histories.
*   Direct API webhook integrations with legacy terminal operating systems (TOS).

---

## 2. Consumption-Based GPU API Metering

In addition to base platform subscription fees, AegisRoute meters high-volume telemetry ingestion and AI usage via a consumption-based utility model:

*   **GPU Telemetry Ingestion Invoicing**: Customers on the GPU-accelerated pipeline are billed based on the number of GPS coordinates processed through NVIDIA cuDF:
    *   **$0.05 per 1 Million records** processed.
*   **Gemini AI Solver Invoicing**: Detour path generations are billed based on token consumption (input and output tokens processed through the Google GenAI API):
    *   **$0.075 per 100 resolved route detours**.
*   **Multi-Channel Notification Gateway**: Alerts sent via external carrier systems (e.g., SMS, satellite communications) are billed based on volume:
    *   **$0.01 per SMS message** sent.
    *   **$0.15 per emergency satellite link transmission** broadcast directly to vessel navigation decks.

---

## 3. High-Margin Professional & Integration Services

To support complex enterprise migrations, AegisRoute offers specialized integration and consulting services:

1.  **Custom API Integration ($250 / hour)**: Building custom APIs and webhooks to connect AegisRoute with legacy port yard management softwares and enterprise resource planning systems (ERP, e.g., SAP, Oracle).
2.  **SLA Translation Consulting (Flat rate $35,000)**: Developing and deploying custom JSON schemas to translate unstructured cargo contracts, liability parameters, and temperature bounds into structured, machine-readable code for Gemini.
3.  **DevOps Cloud Deployment Support (Flat rate $15,000)**: Assisting enterprise IT teams with provisioning secure, GPU-enabled GKE Autopilot clusters, configuring firewalls, setting up GCS buckets, and deploying GKE secrets.
