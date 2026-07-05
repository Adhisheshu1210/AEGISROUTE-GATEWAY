-- =========================================================================
-- AegisRoute Enterprise Platform - Component 5: BigQuery Warehouse Setup
-- File: /backend/db/bigquery_setup.sql
-- Description: Production-ready DDL script establishing the full-scale analytical
--              warehouse for AegisRoute. Includes datasets, partitioned/clustered
--              tables, materialized views, scheduled queries, vector search configurations,
--              indexes, stored procedures, sample data seeds, and optimization tips.
--
-- Dialect: GoogleSQL (BigQuery Standard SQL)
-- License: Apache-2.0
-- =========================================================================

-- =========================================================================
-- 1. DATASET DEFINITIONS
-- =========================================================================

-- Dataset: Raw Ingestion Landing Area (Low retention for compliance and cost management)
CREATE SCHEMA IF NOT EXISTS `aegisroute_landing`
OPTIONS (
  location = 'us',
  description = 'Transient low-retention landing area for high-throughput raw CSV/JSON/API streaming feeds',
  default_table_expiration_days = 7.0
);

-- Dataset: Enterprise Data Warehouse (Durable analytical model with GCM/CMEK key options)
CREATE SCHEMA IF NOT EXISTS `aegisroute_dw`
OPTIONS (
  location = 'us',
  description = 'Durable analytical data warehouse storing normalized telemetry, risk scoring predictions, and dispatch recommendations',
  labels = [("department", "logistics"), ("env", "production")]
);


-- =========================================================================
-- 2. SCHEMAS & TABLE DDL (WITH PARTITIONING & CLUSTERING)
-- =========================================================================

-- Table 1: Raw Telemetry GPS Logs
-- Partitioning: Daily partitions on 'timestamp' to limit slot scan sizes during query execution.
-- Clustering: Clustered by 'vehicle_id' and 'carrier' to allow fast indexing of fleet cohorts.
CREATE TABLE IF NOT EXISTS `aegisroute_dw.telemetry_gps_ingested` (
  vehicle_id STRING NOT NULL OPTIONS(description="Unique telemetry tracker hardware ID"),
  timestamp TIMESTAMP NOT NULL OPTIONS(description="GPS coordinate broadcast timestamp"),
  latitude FLOAT64 NOT NULL,
  longitude FLOAT64 NOT NULL,
  speed_knots FLOAT64 OPTIONS(description="Standardized normalized speed parameter"),
  heading FLOAT64 OPTIONS(description="Compass heading in degrees (0.0 to 359.9)"),
  coolant_temp_c FLOAT64 OPTIONS(description="Fleet sensory engine coolant indicator"),
  local_weather_condition STRING OPTIONS(description="Geospatial-joined weather parameter at coordinates"),
  active_port_dwell_hrs FLOAT64 OPTIONS(description="Joined dry or wet port queue congestion dwell time"),
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
CLUSTER BY vehicle_id
OPTIONS (
  description = "High-throughput telemetry ingestion archive containing normalized GPS logs",
  require_partition_filter = true -- Prevents accidental full table scans which increase query costs
);

-- Table 2: Historical Transits Reporting
-- Partitioning: Partitioned by 'delivery_date' to facilitate periodic SLA compliance audits.
-- Clustering: Clustered by 'carrier' and 'status' for performant filter grouping.
CREATE TABLE IF NOT EXISTS `aegisroute_dw.historical_transits_reporting` (
  shipment_id STRING NOT NULL,
  cargo_code STRING NOT NULL,
  carrier STRING NOT NULL,
  origin STRING NOT NULL,
  destination STRING NOT NULL,
  priority STRING NOT NULL, -- HIGH, MEDIUM, LOW
  progress INT64 NOT NULL, -- 0 to 100
  actual_transit_time_minutes INT64,
  status STRING NOT NULL, -- completed, on-time, delayed, disrupted, optimized
  delivery_date DATE NOT NULL
)
PARTITION BY delivery_date
CLUSTER BY carrier, status
OPTIONS (
  description = "Archived completed and active logistical transit records for SLA analytics"
);

-- Table 3: Risk Scoring & Delay Predictions Reporting
-- Partitioning: Partitioned by hourly/daily 'processed_at' timestamps to tracking scoring drift.
-- Clustering: Clustered by 'shipment_id' and 'priority' for responsive incident room queries.
CREATE TABLE IF NOT EXISTS `aegisroute_dw.predictions_reporting` (
  shipment_id STRING NOT NULL,
  cargo_code STRING NOT NULL,
  carrier STRING NOT NULL,
  cargo_value_usd FLOAT64 NOT NULL,
  priority STRING NOT NULL,
  progress INT64 NOT NULL,
  current_latitude FLOAT64,
  current_longitude FLOAT64,
  speed_knots FLOAT64,
  local_weather_condition STRING,
  active_port_dwell_hrs FLOAT64,
  dist_to_blizzard_km FLOAT64,
  is_inside_hazard_zone BOOLEAN,
  risk_score FLOAT64 NOT NULL OPTIONS(description="Aggregated risk indicator (0 to 100)"),
  predicted_delay_hours FLOAT64 OPTIONS(description="XGBoost/LightGBM modeled SLA delay prediction"),
  predicted_eta TIMESTAMP OPTIONS(description="Dynamic calculated ETA time based on delays"),
  dispatch_priority_rank INT64,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(processed_at)
CLUSTER BY shipment_id, priority
OPTIONS (
  description = "Telemetry-scored predictive outputs updating every 5 minutes via GKE ML inference nodes"
);

-- Table 4: Warehouse Dwell Logs
-- Partitioning: Partitioned by 'logged_date'
-- Clustering: Clustered by 'warehouse_id'
CREATE TABLE IF NOT EXISTS `aegisroute_dw.historical_port_dwells` (
  port_id STRING NOT NULL,
  port_name STRING NOT NULL,
  port_lat FLOAT64,
  port_lng FLOAT64,
  dwell_time_avg_hours FLOAT64,
  queue_vessels_count INT64,
  updated_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(updated_at)
CLUSTER BY port_id;


-- =========================================================================
-- 3. MATERIALIZED VIEWS
-- =========================================================================

-- View: Daily Carrier Risk Metrics
-- Materialized views provide real-time pre-aggregations, significantly reducing
-- dashboard rendering latency for BI tools like Looker Studio or Tableau.
CREATE MATERIALIZED VIEW IF NOT EXISTS `aegisroute_dw.mv_daily_carrier_risk_metrics`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 30,
  description = "Materialized pre-aggregates containing core metrics parsed by carrier and transit date"
) AS
SELECT
  DATE(processed_at) AS analytics_date,
  carrier,
  priority,
  COUNT(DISTINCT shipment_id) AS total_tracked_fleets,
  ROUND(AVG(risk_score), 2) AS avg_risk_score,
  ROUND(SUM(cargo_value_usd), 2) AS total_exposure_usd,
  ROUND(AVG(predicted_delay_hours), 1) AS avg_predicted_delay_hrs,
  COUNTIF(is_inside_hazard_zone = TRUE) AS active_hazard_breaches
FROM
  `aegisroute_dw.predictions_reporting`
GROUP BY
  analytics_date,
  carrier,
  priority;


-- =========================================================================
-- 4. VECTOR SEARCH CONFIGURATION & INDEXES
-- =========================================================================

-- Table 5: Disruption Knowledge Base
-- Stores textual hazard analyses, previous incident post-mortems, and weather bulletins.
CREATE TABLE IF NOT EXISTS `aegisroute_dw.disruption_knowledge_base` (
  incident_id STRING NOT NULL,
  hazard_type STRING NOT NULL, -- Blizzard, Port Congestion, Landslide, Labor Walkout
  incident_text STRING NOT NULL OPTIONS(description="Full text analysis reports compiled by operations staff"),
  text_embedding ARRAY<FLOAT64> OPTIONS(description="768-dimension dense vector representation compiled via Vertex AI embeddings API"),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (
  description = "Durable disruption index holding text embeddings to support semantic Vector Searches"
);

-- CREATE VECTOR INDEX: Builds a dense KNN index directly within BigQuery
-- Allows similarity queries to run in milliseconds over millions of semantic indexes.
-- Using Cosine Distance metric for high dimensional comparisons.
CREATE OR REPLACE VECTOR INDEX `disruption_vector_index`
ON `aegisroute_dw.disruption_knowledge_base`(text_embedding)
OPTIONS(
  distance_type = 'COSINE',
  index_type = 'IVF' -- Inverted File index for fast sub-linear query scans
);


-- =========================================================================
-- 5. STORED PROCEDURES (WITH SPATIAL & ROUTING ALGORITHMS)
-- =========================================================================

CREATE OR REPLACE PROCEDURE `aegisroute_dw.sp_optimize_dispatch_risk`(
  IN min_risk_threshold FLOAT64,
  OUT total_affected_lanes INT64
)
BEGIN
  -- Stored procedure executing operational risk scoring alignments and labeling.
  -- Demonstrates enterprise data manipulation logic within BigQuery registers.
  
  -- Create or replace temporary table storing active critical exposures
  CREATE OR REPLACE TEMP TABLE critical_alerts AS
  SELECT 
    shipment_id,
    cargo_code,
    risk_score,
    predicted_delay_hours,
    CASE 
      WHEN risk_score >= 80.0 AND priority = 'high' THEN 'ESCALATE TO PILOT'
      WHEN risk_score >= 50.0 THEN 'REROUTE SUGGESTED'
      ELSE 'MONITOR'
    END AS action_status
  FROM 
    `aegisroute_dw.predictions_reporting`
  WHERE 
    risk_score >= min_risk_threshold
    AND processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 HOUR);

  -- Log action logs inside temporary telemetry output
  SELECT COUNT(*) INTO total_affected_lanes FROM critical_alerts;
  
  -- Print out audit trail for BigQuery logging monitoring console
  SELECT FORMAT("Stored Procedure Audit: Found %d active lanes violating risk threshold limit.", total_affected_lanes);
END;


-- =========================================================================
-- 6. SCHEDULED QUERIES (AS SYSTEM SQL TEMPLATES)
-- =========================================================================

/*
SCHEDULED QUERY DETAILS:
- Name: "AegisRoute-Daily-SLA-Compliance-Aggregator"
- Frequency: "Every 24 hours (01:00 UTC)"
- Destination Table: `aegisroute_dw.historical_transits_reporting`
- Write Preference: APPEND

-- SQL Query Body:
INSERT INTO `aegisroute_dw.historical_transits_reporting` (
  shipment_id, cargo_code, carrier, origin, destination, priority, progress, actual_transit_time_minutes, status, delivery_date
)
SELECT 
  shipment_id,
  cargo_code,
  carrier,
  'Venlo customs node, NL' AS origin,
  'Frankfurt Gateway, DE' AS destination,
  priority,
  progress,
  CAST(ROUND(active_port_dwell_hrs * 60.0) AS INT64) AS actual_transit_time_minutes,
  'completed' AS status,
  CURRENT_DATE() AS delivery_date
FROM 
  `aegisroute_dw.predictions_reporting`
WHERE 
  progress >= 100
  AND DATE(processed_at) = CURRENT_DATE() - 1;
*/


-- =========================================================================
-- 7. HIGH-FIDELITY SAMPLE DATA SEEDS
-- =========================================================================

-- Ingest dummy transits records to support immediate materialized view builds
INSERT INTO `aegisroute_dw.historical_transits_reporting` 
  (shipment_id, cargo_code, carrier, origin, destination, priority, progress, actual_transit_time_minutes, status, delivery_date)
VALUES
  ('ship-001', 'AEGIS-VANGUARD', 'MAERSK LINE', 'Venlo customs node, NL', 'Frankfurt Gateway, DE', 'high', 100, 480, 'completed', '2026-07-01'),
  ('ship-003', 'AEGIS-TITAN', 'COSCO SHIPPING', 'Rotterdam Port, NL', 'Hamburg Terminal, DE', 'medium', 100, 720, 'completed', '2026-07-02'),
  ('ship-004', 'AEGIS-AURA', 'HAPAG-LLOYD', 'Port of Antwerp, BE', 'Düsseldorf Depot, DE', 'low', 100, 310, 'completed', '2026-07-03');

-- Ingest mock telemetry-scored prediction records (simulates results from Components 2 & 3)
INSERT INTO `aegisroute_dw.predictions_reporting`
  (shipment_id, cargo_code, carrier, cargo_value_usd, priority, progress, current_latitude, current_longitude, speed_knots, local_weather_condition, active_port_dwell_hrs, dist_to_blizzard_km, is_inside_hazard_zone, risk_score, predicted_delay_hours, predicted_eta, dispatch_priority_rank, processed_at)
VALUES
  ('ship-002', 'AEGIS-ZEPHYR', 'HAPAG-LLOYD', 84100000.0, 'high', 68, 41.5204, -87.2341, 2.4, 'Severe Blizzard Alert', 52.5, 12.4, TRUE, 92.5, 18.5, TIMESTAMP('2026-07-05 12:00:00 UTC'), 1, CURRENT_TIMESTAMP()),
  ('ship-005', 'AEGIS-SOLARIS', 'MAERSK LINE', 32000000.0, 'medium', 45, 39.7392, -104.9903, 14.5, 'Clear Sky', 1.2, 850.0, FALSE, 12.4, 0.0, TIMESTAMP('2026-07-04 22:30:00 UTC'), 12, CURRENT_TIMESTAMP()),
  ('ship-006', 'AEGIS-HERMES', 'COSCO SHIPPING', 15400000.0, 'low', 82, 34.0522, -118.2437, 21.2, 'Light Fog', 4.5, 1200.0, FALSE, 24.8, 1.2, TIMESTAMP('2026-07-04 14:15:00 UTC'), 45, CURRENT_TIMESTAMP());

-- Ingest disruption knowledge base text reports with pre-calculated vector maps (768 Float dimensions)
INSERT INTO `aegisroute_dw.disruption_knowledge_base`
  (incident_id, hazard_type, incident_text, text_embedding, recorded_at)
VALUES
  (
    'INC-CHICAGO-BLIZZARD-912', 
    'Blizzard', 
    'Midwest winter blizzard. High-winds, freezing temperatures, highway blockages across Indiana toll nodes and local warehousing channels.',
    ARRAY[0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054, 0.012, -0.045, 0.231, 0.004, -0.112, 0.089, 0.321, -0.054],
    CURRENT_TIMESTAMP()
  );


-- =========================================================================
-- 8. ENTERPRISE BIGQUERY OPTIMIZATION AND COST-CONTROL TIPS
-- =========================================================================

/*
----------------------------------------------------------------------------
A. DENSE PARTITIONING AND CLUSTERING ADVANTAGES
----------------------------------------------------------------------------
- The table `telemetry_gps_ingested` enforces partition filters (require_partition_filter = true).
  This prevents developers or downstream BI utilities from writing standard SELECT * queries 
  without active DATE limits, mitigating massive scan overheads on multi-million row datasets.
- Clustering by `vehicle_id` guarantees that records for a single shipping lane or truck 
  are sorted and co-located together on disk blocks. Point queries filtering on specific IDs 
  will bypass reading unrelated blocks, saving up to 99% of pricing/slot costs.

----------------------------------------------------------------------------
B. BIGQUERY CAPACITY PRICING VS ON-DEMAND METRICS
----------------------------------------------------------------------------
- On-Demand Pricing: $6.25 per TB of data scanned.
- Capacity Pricing (Standard/Enterprise Editions): Leverages Slot Commitments (minimum 100 slots).
  Highly recommended for continuous streaming environments (AegisRoute pipeline) to guarantee 
  flat-rate billing and predictable cost structures.

----------------------------------------------------------------------------
C. MATERIALIZED VIEWS COMPARED TO STANDARD VIEW SCANS
----------------------------------------------------------------------------
- Materialized Views pre-compute common aggregation calculations (`mv_daily_carrier_risk_metrics`) 
  automatically as data is ingested into the base table, caching intermediate results.
- When querying the materialized view, BigQuery only scans newly added incremental rows 
  and combines them with pre-aggregated blocks, resulting in sub-second load times for 
  live operational dashboards.

----------------------------------------------------------------------------
D. VECTOR INDEX COMPILATION DETAILS
----------------------------------------------------------------------------
- The standard `CREATE VECTOR INDEX` query applies ScaNN or IVF (Inverted File) vector compression algorithms.
- Vector indices partition the embedding vectors into distinct clusters. When running a `VECTOR_SEARCH` 
  function query, the search compares coordinates only within the closest cluster directories, 
  reducing scanning complexity from O(N) to O(log N).
*/
