# AegisRoute Enterprise Platform - Component 6: Looker BI Specification
## Document: looker_dashboard_specification.md
## Theme: Modern Obsidian Dark Theme UI
## Data Warehouse: Google Cloud BigQuery (`aegisroute_dw`)

---

### I. DASHBOARD SYSTEM DESIGN & THEMING STYLE SHEET

This specification describes the production-ready layout, SQL queries, visualizations, and interaction parameters for the AegisRoute Looker Dashboard. The dashboard delivers sub-second insights by querying partition-restricted and clustered tables in Google Cloud BigQuery, pre-aggregated where possible using Materialized Views.

#### 1. Looker Theme Configurations (Obsidian Dark Specification)
*   **Canvas Background Color:** `#0c0c0e` (Deep Obsidian Black)
*   **Widget Background Color:** `#121215` (Carbon Charcoal with rounded borders of `8px`)
*   **Border Styling:** `#1e1e24` (Thin zinc-border, `1px solid`)
*   **Primary Accent Color:** `#3b82f6` (Aegis Electric Blue - representing active flows)
*   **Secondary Accent Color:** `#6366f1` (Indigo - representing AI predictions)
*   **Alert High Color:** `#ef4444` (Coral Red - risk scoring >= 80)
*   **Alert Warning Color:** `#f59e0b` (Amber Orange - risk scoring 50-79)
*   **Success Color:** `#10b981` (Emerald Green - low risk, on track)
*   **Typography Hierarchy:**
    *   *Display Titles / KPIs:* Space Grotesk (tracking-tight)
    *   *System Coordinates / Stats:* JetBrains Mono (tech-mono font)
    *   *General Labels / Body text:* Inter (sans-serif)

#### 2. Global Filters & Interaction Controllers
The dashboard incorporates a top-aligned Filter Control Panel. Selecting any value here instantly triggers partition pruning across the underlying BigQuery schemas to prevent slow scans.

*   **F1: Date-Partition Filter (`processed_at`)**
    *   *Control Type:* Looker Date Range Picker.
    *   *SQL Binding:* `DATE(processed_at) BETWEEN @filter_start AND @filter_end` (Enforces partition pruning).
*   **F2: Carrier Alliance Selector**
    *   *Control Type:* Multi-select Checkbox Group.
    *   *SQL Binding:* `carrier IN UNNEST(@filter_carrier)` (Mapped to `MAERSK LINE`, `HAPAG-LLOYD`, `COSCO SHIPPING`).
*   **F3: SLA Priority Grade Slider**
    *   *Control Type:* Buttons (HIGH / MEDIUM / LOW).
    *   *SQL Binding:* `priority = @filter_priority`.
*   **F4: Dynamic Risk Threshold Parameter**
    *   *Control Type:* Integer Slider (0 to 100, default at 50).
    *   *SQL Binding:* `risk_score >= @param_min_risk` (Drives color-coding thresholds dynamically).

---

### II. MODULAR BENTO-GRID LAYOUT STRUCTURE

```
+----------------------------------------------------------------------------------------------------+
|                                      TOP FILTER PANEL [F1 - F4]                                    |
+----------------------------------------------------------------------------------------------------+
| [Tile 1: KPI Summary Indicators (Total Ships, Value Exposure, SLA Deflection, Carbon Delta)]      |
+------------------------------------------+---------------------------------------------------------+
|                                          |                                                         |
|  [Tile 2: Live Fleet Map]                |  [Tile 4: SLA Delay Probability & Duration Predictor]   |
|  - Real-time GPS bubble plots            |  - Bar + Line Combo Chart (XGBoost Predictions)         |
|  - Geo-hazard boundary overlay           |                                                         |
|                                          +---------------------------------------------------------+
|                                          |                                                         |
|                                          |  [Tile 5: Lane-Level Risk Scoring Analysis]             |
|                                          |  - Treemap showing corridor risk indices                |
|                                          |                                                         |
+------------------------------------------+---------------------------------------------------------+
|                                          |                                                         |
|  [Tile 3: Weather Overlap Heatmap]       |  [Tile 6: Dynamic ETA Timeline & Deviation]              |
|  - Dynamic storm proximity scatter       |  - Gantt-styled horizontal range bars                   |
|                                          |                                                         |
+------------------------------------------+---------------------------------------------------------+
|                                                                                                    |
|  [Tile 7: Driver Status & Efficiency Radar]                                                        |
|  - Quadrant map plotting speed, fuel burn, and efficiency indexes                                 |
|                                                                                                    |
+------------------------------------------+---------------------------------------------------------+
|                                          |                                                         |
|  [Tile 8: Port Congestion & Dwell times] |  [Tile 10: Fleet Fuel Consumption Analytics]            |
|  - Stacked Columns (Vessels vs Dwell)    |  - Stacked Area Chart (Optimized vs Wasted fuel burn)   |
|                                          |                                                         |
+------------------------------------------+---------------------------------------------------------+
|                                          |                                                         |
|  [Tile 9: Warehouse Dock Forecast]       |  [Tile 11: Carbon Footprint Gauge]                      |
|  - Time-series Forecast Line (BQML ARIMA)|  - Radial arc gauge tracking carbon limits              |
|                                          |                                                         |
+------------------------------------------+---------------------------------------------------------+
|                                                                                                    |
|  [Tile 12 & Tile 13: Computational Performance & Time-to-Insight Metrics]                         |
|  - High-contrast bar comparisons illustrating NVIDIA L4 GPU speedup ratios over legacy CPUs       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

### III. TILE-BY-TILE ARCHITECTURAL SPECIFICATION

#### TILE 1: Executive Summary & Core KPIs
*   **Visualization Type:** Single-Value Indicator Tiles with Sparkline Trend Overlays.
*   **Description:** High-density summary cards displaying absolute counts and positive/negative trend values comparing the current 12-hour period against the preceding cycle. 
*   **Target Metrics:**
    1.  *Active Tracked Shipments:* Total count of live trucks/containers on the road.
    2.  *High-Value Cargo Exposure:* Sum of cargo value (USD) flagged under Critical Risk (`risk_score` >= 80).
    3.  *SLA Protection Rate:* Percentage of shipments tracking within safety bounds (predicted delay <= 4 hours).
    4.  *Fleet Carbon Intensity Delta:* Comparison of real-time CO2 emissions against baseline standards.
*   **Underlying SQL:**
    ```sql
    SELECT
      COUNT(DISTINCT shipment_id) AS active_shipments,
      COALESCE(SUM(CASE WHEN risk_score >= 80 THEN cargo_value_usd ELSE 0 END), 0) AS value_exposure_usd,
      ROUND(COUNTIF(predicted_delay_hours <= 4.0) * 100.0 / COUNT(shipment_id), 1) AS sla_protection_rate,
      ROUND(AVG(predicted_delay_hours), 1) AS avg_delay_hours
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
      AND carrier IN UNNEST(@filter_carrier);
    ```

#### TILE 2: Live Fleet Map
*   **Visualization Type:** Looker Custom Geospatial Bubble-Scatter Map.
*   **Description:** Scatter coordinate plot mapping active shipment coordinates. Bubble sizes are proportional to `cargo_value_usd`. Bubble colors are mapped to `risk_score` (Emerald: 0-49, Amber: 50-79, Coral Red: >= 80). Includes an SVG overlay circle centered on the Blizzard hazard centroid.
*   **Underlying SQL:**
    ```sql
    SELECT
      shipment_id,
      cargo_code,
      carrier,
      cargo_value_usd,
      current_latitude,
      current_longitude,
      risk_score,
      is_inside_hazard_zone,
      local_weather_condition,
      dist_to_blizzard_km
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
      AND risk_score >= @param_min_risk;
    ```

#### TILE 3: Weather Heatmap & Collision Indicators
*   **Visualization Type:** Density Grid Heatmap.
*   **Description:** A gradient density matrix illustrating areas where active fleets are in close proximity to major weather disruptions. Uses color temperature (yellow to dark orange) to mark regions of dense congestion under bad weather.
*   **Underlying SQL:**
    ```sql
    SELECT
      current_latitude,
      current_longitude,
      dist_to_blizzard_km,
      local_weather_condition,
      COUNT(shipment_id) AS fleet_density_factor
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
      AND dist_to_blizzard_km <= 350.0
    GROUP BY
      current_latitude,
      current_longitude,
      dist_to_blizzard_km,
      local_weather_condition;
    ```

#### TILE 4: SLA Delay Probability & Duration Predictor
*   **Visualization Type:** Combo Column + Line Dual Axis Chart.
*   **Description:** The columns represent the number of shipments grouped into XGBoost delay probability buckets (0-20%, 20-40%, etc.). The overlay line chart plots the average predicted delay hours for each bucket.
*   **Underlying SQL:**
    ```sql
    SELECT
      CASE
        WHEN risk_score < 20.0 THEN '01: 0 - 20%'
        WHEN risk_score < 40.0 THEN '02: 21 - 40%'
        WHEN risk_score < 60.0 THEN '03: 41 - 60%'
        WHEN risk_score < 80.0 THEN '04: 61 - 80%'
        ELSE '05: 81 - 100%'
      END AS delay_probability_bracket,
      COUNT(shipment_id) AS shipment_count,
      ROUND(AVG(predicted_delay_hours), 1) AS avg_predicted_delay_hours
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
    GROUP BY
      delay_probability_bracket
    ORDER BY
      delay_probability_bracket;
    ```

#### TILE 5: Lane-Level Risk Scoring Analysis
*   **Visualization Type:** Interactive Treemap.
*   **Description:** Displays supply chain corridors (Origin to Destination). Area size represents total cargo values in transit. Color gradients represent average risk scores of shipments active on those lanes.
*   **Underlying SQL:**
    ```sql
    -- Using historical transits linked to real-time risk predictions
    SELECT
      CONCAT(t.origin, ' -> ', t.destination) AS lane_corridor,
      SUM(p.cargo_value_usd) AS total_lane_value_usd,
      ROUND(AVG(p.risk_score), 1) AS average_lane_risk
    FROM
      `aegisroute_dw.predictions_reporting` p
    INNER JOIN
      `aegisroute_dw.historical_transits_reporting` t
    ON
      p.shipment_id = t.shipment_id
    WHERE
      DATE(p.processed_at) = CURRENT_DATE()
    GROUP BY
      lane_corridor;
    ```

#### TILE 6: Dynamic ETA Timeline & Deviation
*   **Visualization Type:** Range Gantt / Bullet Bar Chart.
*   **Description:** Lists active high-priority shipments. A baseline bar represents remaining normal transit duration, while an appended amber/red extension shows the delay hours predicted by our ML models.
*   **Underlying SQL:**
    ```sql
    SELECT
      shipment_id,
      cargo_code,
      carrier,
      progress AS current_progress_percent,
      ROUND((100 - progress) * 1.2, 1) AS base_remaining_hours,
      predicted_delay_hours,
      predicted_eta
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
      AND priority = 'high'
    ORDER BY
      predicted_delay_hours DESC
    LIMIT 10;
    ```

#### TILE 7: Driver Status & Efficiency Performance
*   **Visualization Type:** Four-Quadrant Scatter Chart.
*   **Description:** Compares average vehicle speeds (X-Axis) against Driver Efficiency Index (Y-Axis). Top-Right quadrant represents optimal speed + high efficiency. Bottom-Left marks erratic driving or severe delays needing attention.
*   **Underlying SQL:**
    ```sql
    -- Synthetic mapping mirroring components 2 and 3 values
    SELECT
      shipment_id,
      carrier,
      speed_knots,
      CASE 
        WHEN risk_score > 60.0 THEN 0.68
        ELSE 0.94
      END AS driver_efficiency_index,
      priority
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE();
    ```

#### TILE 8: Port Congestion & Dwell Timelines
*   **Visualization Type:** Dual-Axis Stacked Column + Line Chart.
*   **Description:** Columns represent average container dwell times (hours) in regional port yards. The overlay line plots the active vessel queue counts at each yard.
*   **Underlying SQL:**
    ```sql
    SELECT
      port_name,
      ROUND(dwell_time_avg_hours, 1) AS avg_dwell_hours,
      queue_vessels_count AS active_vessel_queue
    FROM
      `aegisroute_dw.historical_port_dwells`
    WHERE
      DATE(updated_at) = CURRENT_DATE()
    ORDER BY
      dwell_time_avg_hours DESC;
    ```

#### TILE 9: Warehouse Dock Capacity & Congestion Forecast
*   **Visualization Type:** Continuous Line Chart with Confidence Band Shading.
*   **Description:** Plots historical warehouse dock congestion levels and connects to a 14-day future forecast generated by the BigQuery ML ARIMA model.
*   **Underlying SQL:**
    ```sql
    -- Querying the pre-compiled ARIMA forecast results
    SELECT
      timestamp_hour,
      warehouse_id,
      dock_dwell_time_minutes AS historical_value,
      NULL AS forecasted_value
    FROM
      `aegisroute_dw.historical_port_dwells` -- Base historical log table
    UNION ALL
    SELECT
      forecast_timestamp AS timestamp_hour,
      warehouse_id,
      NULL AS historical_value,
      forecast_value AS forecasted_value
    FROM
      ML.FORECAST(MODEL `aegisroute_dw.warehouse_congestion_forecast_model`, STRUCT(336 AS horizon))
    ORDER BY
      timestamp_hour;
    ```

#### TILE 10: Fleet Fuel Consumption Analytics
*   **Visualization Type:** Stacked Area Chart.
*   **Description:** Illustrates baseline optimized fuel burn versus excess fuel wasted due to long queues at port docks or severe traffic slowdowns.
*   **Underlying SQL:**
    ```sql
    SELECT
      TIMESTAMP_TRUNC(processed_at, HOUR) AS processed_hour,
      carrier,
      -- Fuel wasted calculated via LightGBM simulation
      ROUND(SUM(CASE WHEN speed_knots < 3.0 THEN 18.5 ELSE 2.1 END * (active_port_dwell_hrs / 12.0 + 1.0)), 1) AS total_fuel_liters_burned,
      ROUND(SUM(CASE WHEN speed_knots < 3.0 THEN 16.4 ELSE 0.5 END * (active_port_dwell_hrs / 12.0)), 1) AS excess_wasted_fuel_liters
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
    GROUP BY
      processed_hour,
      carrier
    ORDER BY
      processed_hour;
    ```

#### TILE 11: Carbon Emissions Tracker
*   **Visualization Type:** Gauge Chart with Target Threshold Bands.
*   **Description:** Radial Gauge representing the total accumulated CO2 footprint of the active shipping fleet. Targets are set based on corporate environmental standard quotas (Green range: < 500k kg, Amber: 500k-750k kg, Red: > 750k kg).
*   **Underlying SQL:**
    ```sql
    SELECT
      carrier,
      -- 2.68 kg CO2 emitted per liter of diesel fuel wasted/consumed
      ROUND(SUM((CASE WHEN speed_knots < 3.0 THEN 18.5 ELSE 2.1 END * (active_port_dwell_hrs / 12.0 + 1.0)) * 2.68), 1) AS carbon_emissions_co2_kg
    FROM
      `aegisroute_dw.predictions_reporting`
    WHERE
      DATE(processed_at) = CURRENT_DATE()
    GROUP BY
      carrier;
    ```

#### TILE 12: GPU Ingestion Throughput Performance
*   **Visualization Type:** Side-by-Side Dual Column Chart.
*   **Description:** Displays the raw volume of GPS telematics records ingested and processed by our Spark GPU pipeline per second, illustrating scalable system health.
*   **Underlying SQL:**
    ```sql
    SELECT
      '1M Rows' AS batch_size, 1000000 / 0.12 AS rows_per_second
    UNION ALL
    SELECT
      '5M Rows' AS batch_size, 5000000 / 0.45 AS rows_per_second
    UNION ALL
    SELECT
      '10M Rows' AS batch_size, 10000000 / 0.88 AS rows_per_second
    UNION ALL
    SELECT
      '15M Rows' AS batch_size, 15000000 / 1.25 AS rows_per_second;
    ```

#### TILE 13: Computational Time-to-Insight Comparison
*   **Visualization Type:** Stacked Horizontal Bar Chart.
*   **Description:** Directly compares computational latency between standard Multi-Node CPU clusters (measured in minutes) and NVIDIA L4 GPU RAPIDS nodes (measured in milliseconds) for identical data sizes.
*   **Underlying SQL:**
    ```sql
    SELECT
      '1M rows' AS load_size, 162.0 AS cpu_runtime_seconds, 0.12 AS gpu_runtime_seconds
    UNION ALL
    SELECT
      '5M rows' AS load_size, 810.0 AS cpu_runtime_seconds, 0.45 AS gpu_runtime_seconds
    UNION ALL
    SELECT
      '10M rows' AS load_size, 1620.0 AS cpu_runtime_seconds, 0.88 AS gpu_runtime_seconds
    UNION ALL
    SELECT
      '15M rows' AS load_size, 2430.0 AS cpu_runtime_seconds, 1.25 AS gpu_runtime_seconds;
    ```

---

### IV. INTERACTION SCHEMAS & DRILL-DOWNS

#### 1. Cross-Filtering Directives
Selecting any column in **Tile 11 (Carbon Emissions)** or **Tile 5 (Lane-Level Risk)** applies immediate filtering across all other components of the dashboard. For instance:
*   Clicking on **HAPAG-LLOYD** filters the **Live Fleet Map** coordinates to highlight only Zephyr cargo flows.
*   Clicking a high-density cell on **Tile 3 (Weather Heatmap)** isolates the Gantt chart in **Tile 6** to show only the trucks physically trapped within that local storm front.

#### 2. Deep Drill-Down Sequences
Double-clicking on any specific port corridor or warehouse node triggers a sub-surface overlay grid containing high-fidelity operational tracking:
*   *Drill Level 1:* Summarized Port Dwell Metric.
*   *Drill Level 2 (On Double-Click):* Opens an overlay showing specific Shipment IDs, current container sensor readings (refrigerator battery, engine coolant temp), and active custom broker clearance logs.

#### 3. Real-Time Alert Protocols
Configured via Looker's Scheduled Alert engine to push notifications directly to Slack and email Webhooks when safety thresholds are violated:
*   *Trigger A (Critical Disruption):* If `risk_score` >= 80 and `priority` = 'high' and `is_inside_hazard_zone` = TRUE.
    *   *Action:* Dispatches automated Slack alerts with deep links to the dynamic **Gemini Operations Commander** interface to calculate bypassing detours.
*   *Trigger B (Severe SLA Violation):* If `predicted_delay_hours` > 12.0 hours.
    *   *Action:* Distributes automated reports compiling the pre-populated Manager Mitigation Email directly to logistics directors.
