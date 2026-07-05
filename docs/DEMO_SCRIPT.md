# LIVE DEMO SCRIPT

This document provides a minute-by-minute guide for presenting the live **AegisRoute Operations Hub** application to investors, clients, or hackathon judges.

---

## 🎭 Presentation Timeline

*   **Total Duration**: 5 Minutes
*   **Roles**:
    *   **Speaker**: Narrates the business case, explains technical benchmarks, and handles Q&A.
    *   **Driver**: Operates the keyboard and mouse, clicks through the UI tabs, and runs simulations.

---

## ⏱️ Minute-by-Minute Click-Path & Script

### Minute 0:00 - 1:00 | The Hook & Global Map Views
*   **Driver Action**: Share the browser tab displaying the **Overview Tab** of AegisRoute.
*   **Speaker Script**:
    > "Welcome. This is the AegisRoute Operations Hub—a unified, high-performance platform built for global logistics dispatchers and fleet coordinators. As you can see, our global fleet is currently steaming along standard international corridors. However, our weather sensors have just detected active hazards: Blizzard Centroid Alpha in the North Pacific, and a major Port Congestion backlog at the Port of Shanghai. Let's look at the top-left KPI cards. Our Fleet Health Index is holding at 88%, and our active fuel consumption index is stable. But look at the red warnings on our shipping feed. Our primary ship, *Aegis Pacifica*, is currently steaming directly into a severe hazard zone, threat-indexed at 95% critical."

---

### Minute 1:00 - 2:00 | The Bottleneck & GPU Recalculation
*   **Driver Action**: Hover over the red `DISRUPTED` badge on the *Aegis Pacifica* card in the lane roster, then click the **"Run GPU Recalculation"** button in the top right.
*   **Speaker Script**:
    > "Under the hood, we are tracking 14.2 Million GPS coordinates. Normally, a standard CPU-bound database would take over 38 minutes to run the spatial point-in-polygon queries needed to identify which shipments are in danger. Watch what happens when I trigger our GPU ingestion pipeline. By loading these columns directly into the VRAM of an NVIDIA L4 GPU on GKE, our vectorized cuDF engine completes the entire calculation in **1.15 seconds**—a **2,000x speedup**. The system instantly confirms that *Aegis Pacifica* is indeed within the hazard boundary, prompting us to take immediate action."

---

### Minute 2:00 - 3:30 | Route Optimization & Gemini AI Solver
*   **Driver Action**: Click on the **Route Optimizer Tab** in the sidebar. Select **"Aegis Pacifica"** from the left-hand column and click **"Optimize Route"**.
*   **Speaker Script**:
    > "Let’s resolve this. We click over to our Route Optimizer Tab, select the disrupted vessel, and invoke the Gemini AI Detour Solver. In the background, AegisRoute connects securely to Google Gemini 3.5 Flash using the official, server-side GenAI SDK. We inject the ship's coordinates, cargo sensitivity profile—in this case, cold-chain pharmaceuticals—and SLA deadlines directly into the context window.
    > 
    > Look at the map update. The original route, marked in red, heading directly through the hazard zone, is replaced by an optimized detour path, plotted in solid green.
    > 
    > On the right, Gemini returns structured data with strict JSON formatting: we saved 300 miles, reduced expected delays by 4.5 hours, and preserved our temperature-control SLA, earning a Carbon Rating of A. Underneath, Gemini provides a clear, natural-language explanation of its reasoning, validating the safety and efficiency of the detour."

---

### Minute 3:30 - 4:15 | Automated Alerts & Compliance Reports
*   **Driver Action**: Click **"Approve & Transmit Detour"** inside the Route Optimizer, and then navigate to the **Notification Console** and **Reporting Tab**.
*   **Speaker Script**:
    > "Once we click approve, our secure backend transmits the waypoints directly to the ship's navigation system. Simultaneously, the Notification Console drafts and sends automated SMS alerts to field coordinators and publishes updates to our internal team Slack channels. 
    > 
    > Next, we jump to the Reporting Tab. To meet international ESG and insurance requirements, our system compiles these optimization metrics into a downloadable PDF report, Excel sheets, and raw CSV datasets, ensuring complete auditability and compliance."

---

### Minute 4:15 - 5:00 | Security Verification & Wrap-Up
*   **Driver Action**: Navigate to the **Security Hub** tab, show the Active Session Logs and Audit Trails, and then transition to the **Test Center Tab** to run the validation tests.
*   **Speaker Script**:
    > "Finally, let's look at the Security Hub. AegisRoute implements zero-trust security: all actions, token generations, and route approvals are written to an immutable, cryptographically-chained database audit trail to prevent route hijacking.
    > 
    > To prove our platform is enterprise-ready, we run our interactive Test Center. The system executes our automated QA suites in real-time, verifying our math models, Express routes, and RBAC security policies. All 51 assertions pass flawlessly with **94.2% code coverage**.
    > 
    > This is AegisRoute: combining parallel GPU computing with advanced GenAI to build secure, intelligent, and highly resilient supply chains. Thank you."
