# ADMINISTRATOR & SECURITY MANUAL

This manual is written for DevOps Engineers, Security Admins, and Systems Integrators responsible for provisioning, monitoring, and auditing the AegisRoute platform.

---

## 🔐 1. Cryptographic Authentication & JWT Configuration

AegisRoute uses stateless JSON Web Token (JWT) Bearer signatures to authenticate and authorize API requests. 

```
[REST Ingress Client] ──(Valid Bearer JWT)──> [Express / FastAPI Security Gateway] ──> [Success]
[REST Ingress Client] ──(Expired/No Bearer)──> [Express / FastAPI Security Gateway] ──> [401 Unauthorized]
```

### Signature Token Parameters
*   **Algorithm**: HMAC-SHA256
*   **Default Lifetime**: 3600 seconds (1 hour)
*   **Audience Mapping Claims**:
    *   `sub`: Unique User Identifier (UUID)
    *   `role`: Clearance mapping (`Admin`, `Manager`, or `Driver`)
    *   `name`: Human-readable identifier.

### Rotating Session Secrets
To rotate session-signing keys in production, update your environment configuration files without stopping the server:
1.  Generate a high-entropy cryptographically secure key:
    ```bash
    openssl rand -hex 32
    ```
2.  Update the `JWT_SECRET` parameter inside your environment secrets manager (e.g., GKE Secret Manager or Cloud Run Environment Settings).
3.  Trigger a soft container rolling restart to load the new keys without interrupting active connections.

---

## 👥 2. Role-Based Access Controls (RBAC)

AegisRoute enforces strict role boundaries. The table below details access rights across UI components and REST endpoints:

| Component / Path | Driver Role | Manager Role | Admin Role |
| :--- | :--- | :--- | :--- |
| **Dashboard Maps & Views** | View-Only | Full Access | Full Access |
| **GPU Pipeline Trigger** | Blocked | Full Access | Full Access |
| **Gemini AI Solver** | Blocked | Full Access | Full Access |
| **Notification Overrides** | Blocked | Full Access | Full Access |
| **Security Vault Config** | Blocked | Blocked | Full Access |
| **GET `/api/shipments`** | Authorized | Authorized | Authorized |
| **POST `/api/pipeline/run`**| Blocked (403) | Authorized | Authorized |
| **POST `/api/reroute/solve`**| Blocked (403) | Authorized | Authorized |

---

## 🛡️ 3. Cloud Networking, Firewalls, & WAF Policies

Protecting high-value logistics operations requires securing network boundaries from GPS spoofing, DDoS attacks, and API exploitation.

### Web Application Firewall (WAF) Configurations
Configure your WAF (e.g., Google Cloud Armor) to block malicious traffic:
1.  **Rate Limiting**: Set rate-limiting policies to prevent brute-force attacks on sensitive endpoints:
    ```bash
    gcloud compute security-policies rules create 100 \
      --security-policy=aegisroute-armor-policy \
      --expression="request.path.matches('/api/v1/')" \
      --action=rate-based-ban \
      --rate-limit-threshold-count=120 \
      --rate-limit-threshold-interval-sec=60 \
      --ban-duration-sec=300
    ```
2.  **IP Restriction**: Restrict access to administrative pages (such as the Security Console and Key rotation routes) to internal corporate IP ranges and secure VPN gateways.

---

## 📊 4. System Health & Observability Metrics

Monitor performance, bottlenecks, and error rates across the platform:

*   **REST Latency Monitoring**: Track the `X-Execution-Latency-Ms` HTTP header returned by FastAPI. Any API endpoint averaging $> 200$ms should trigger alert notifications.
*   **NVIDIA L4 Hardware Observability**: Log GPU thermals and memory utilization directly via `nvidia-smi` scraper pipelines:
    ```bash
    # Query GPU parameters in JSON format
    nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,utilization.memory --format=csv,noheader,nounits
    ```
*   **System Action Auditing**: Review the immutable audit log in the **Security Hub** tab. All user actions, token regenerations, route approvals, and pipeline executions write a permanent record detailing the timestamp, initiator IP address, action performed, and safety status.
