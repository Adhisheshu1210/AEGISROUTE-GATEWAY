# -*- coding: utf-8 -*-
"""
AegisRoute Enterprise Platform - Component 1: GPU-Accelerated Ingestion Pipeline
Module: gpu_ingestion_pipeline.py
Description: Production-ready PySpark ETL pipeline running on GKE nodes utilizing the 
             NVIDIA RAPIDS Accelerator for Apache Spark. Ingests, cleans, deduplicates, 
             normalizes, enriches, and detects anomalies on high-throughput supply chain telematics.

License: Apache-2.0
"""

import sys
import logging
from typing import Dict, Any
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, 
    StructField, 
    StringType, 
    DoubleType, 
    IntegerType, 
    TimestampType,
    BooleanType
)

# Configure logging matching AegisRoute enterprise structure
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AegisRoute.PySparkGPUPipeline")


def init_gpu_spark_session(app_name: str = "AegisRoute-GPU-Ingestion-Pipeline") -> SparkSession:
    """
    Initializes a SparkSession explicitly tuned for NVIDIA RAPIDS Accelerator.
    Configures CUDA memory allocations, task concurrency, and GPU plugin extensions.
    """
    logger.info("Initializing SparkSession with NVIDIA RAPIDS Accelerator configuration")
    
    builder = SparkSession.builder \
        .appName(app_name) \
        .config("spark.master", "yarn") \
        .config("spark.submit.deployMode", "cluster") \
        # 1. Enable NVIDIA RAPIDS SQL Plugin for GPU acceleration
        .config("spark.plugins", "com.nvidia.spark.SQLPlugin") \
        # 2. Allocate GPU resources per executor (e.g., 1 dedicated GPU per Spark executor)
        .config("spark.executor.resource.gpu.amount", "1") \
        .config("spark.executor.resource.gpu.discoveryScript", "./getGpusResources.sh") \
        # 3. Configure Spark Task scheduler to map task requirements to GPU resources
        .config("spark.task.resource.gpu.amount", "0.25") \
        # 4. Configure unified virtual memory (UVM) & out-of-core memory spilling
        .config("spark.rapids.memory.gpu.allocator.allocator", "ARENA") \
        .config("spark.rapids.memory.gpu.pooling.enabled", "true") \
        .config("spark.rapids.memory.gpu.pooling.initialSize", "8G") \
        .config("spark.rapids.memory.gpu.pooling.maxSize", "14G") \
        # 5. Restrict concurrent GPU tasks per executor to prevent VRAM out-of-memory (OOM) crashes
        .config("spark.rapids.sql.concurrentGPUTasks", "2") \
        # 6. Enable explanation details to output exactly which operations run on GPU vs CPU
        .config("spark.rapids.sql.explain", "ALL") \
        # 7. Enable optimized GPU readers for Parquet, CSV, and ORC file-formats
        .config("spark.rapids.sql.reader.parquet", "true") \
        .config("spark.rapids.sql.reader.csv", "true") \
        # 8. Enable optimized GPU writer for Parquet format
        .config("spark.rapids.sql.writer.parquet", "true") \
        # 9. Force timezone settings to remain in UTC for consistent timestamps
        .config("spark.sql.session.timeZone", "UTC")

    return builder.getOrCreate()


def get_static_schemas() -> Dict[str, StructType]:
    """Defines strict schemas for all input telemetry and API streams to ensure ingestion stability."""
    
    gps_schema = StructType([
        StructField("vehicle_id", StringType(), False),
        StructField("timestamp", TimestampType(), False),
        StructField("latitude", DoubleType(), False),
        StructField("longitude", DoubleType(), False),
        StructField("speed_kmh", DoubleType(), True),
        StructField("heading", DoubleType(), True),
        StructField("coolant_temp_c", DoubleType(), True)
    ])
    
    weather_schema = StructType([
        StructField("sensor_id", StringType(), False),
        StructField("station_lat", DoubleType(), False),
        StructField("station_lng", DoubleType(), False),
        StructField("recorded_at", TimestampType(), False),
        StructField("condition", StringType(), True),
        StructField("wind_speed_ms", DoubleType(), True),
        StructField("visibility_meters", DoubleType(), True),
        StructField("precipitation_mm", DoubleType(), True)
    ])

    traffic_schema = StructType([
        StructField("segment_id", StringType(), False),
        StructField("start_lat", DoubleType(), False),
        StructField("start_lng", DoubleType(), False),
        StructField("end_lat", DoubleType(), False),
        StructField("end_lng", DoubleType(), False),
        StructField("congestion_index", DoubleType(), True), # 0.0 to 1.0 (clogged)
        StructField("avg_speed_kmh", DoubleType(), True)
    ])

    port_schema = StructType([
        StructField("port_id", StringType(), False),
        StructField("port_name", StringType(), False),
        StructField("port_lat", DoubleType(), False),
        StructField("port_lng", DoubleType(), False),
        StructField("dwell_time_avg_hours", DoubleType(), True),
        StructField("queue_vessels_count", IntegerType(), True),
        StructField("updated_at", TimestampType(), False)
    ])

    news_social_schema = StructType([
        StructField("source_id", StringType(), False),
        StructField("published_at", TimestampType(), False),
        StructField("text_content", StringType(), False),
        StructField("reported_lat", DoubleType(), True),
        StructField("reported_lng", DoubleType(), True),
        StructField("sentiment_score", DoubleType(), True)
    ])

    return {
        "gps": gps_schema,
        "weather": weather_schema,
        "traffic": traffic_schema,
        "port": port_schema,
        "news_social": news_social_schema
    }


def execute_pipeline(gcs_input_prefix: str, gcs_output_path: str):
    """
    Main Spark execution pipeline. Performs parallelized loading, validation,
    cleaning, deduplication, normalization, enrichment, and anomaly detection.
    """
    spark = init_gpu_spark_session()
    schemas = get_static_schemas()
    
    logger.info("Starting ingestion processing step")

    # =========================================================================
    # 1. LOAD & VALIDATE (Accelerated by GPU File Ingest / Parser)
    # =========================================================================
    logger.info("Step 1: Reading and parsing multiple raw data streams from Cloud Storage")
    
    # Raw multi-source ingestion paths
    gps_path = f"{gcs_input_prefix}/telemetry/gps_telematics/*.csv"
    weather_path = f"{gcs_input_prefix}/api/weather/*.json"
    traffic_path = f"{gcs_input_prefix}/api/traffic/*.parquet"
    port_path = f"{gcs_input_prefix}/api/port_dwell/*.json"
    news_social_path = f"{gcs_input_prefix}/scraped/news_social/*.json"
    csv_upload_path = f"{gcs_input_prefix}/uploads/custom_lanes/*.csv"

    # Ingest using Spark DataFrame readers (Optimized on GPU by RAPIDS reader plugins)
    df_gps = spark.read.schema(schemas["gps"]).option("header", "true").csv(gps_path)
    df_weather = spark.read.schema(schemas["weather"]).json(weather_path)
    df_traffic = spark.read.schema(schemas["traffic"]).parquet(traffic_path)
    df_port = spark.read.schema(schemas["port"]).json(port_path)
    df_news_social = spark.read.schema(schemas["news_social"]).json(news_social_path)
    
    # Ingest user manually uploaded CSV custom lanes
    df_csv_uploads = spark.read.option("header", "true").option("inferSchema", "true").csv(csv_upload_path)

    # =========================================================================
    # 2. CLEAN & DEDUPLICATE (Accelerated by GPU Row Filters & Hash Engine)
    # =========================================================================
    logger.info("Step 2: Performing cleaning and high-throughput deduplication")
    
    # 2a. Filter out corrupted records with critical coordinate voids
    df_gps_clean = df_gps.filter(
        (F.col("latitude").isNotNull()) & 
        (F.col("longitude").isNotNull()) &
        (F.col("latitude").between(-90.0, 90.0)) &
        (F.col("longitude").between(-180.0, 180.0))
    )

    # 2b. Drop exact matching duplicates or old historical signal packets
    # On RAPIDS, dropDuplicates() is executed using parallel hash sorting on VRAM
    df_gps_dedup = df_gps_clean.dropDuplicates(["vehicle_id", "timestamp"])

    # =========================================================================
    # 3. NORMALIZE & ALIGN (Accelerated by GPU String & Vector Math)
    # =========================================================================
    logger.info("Step 3: Normalizing telemetry parameters")
    
    # Normalize speed to standardized knots (1 km/h = 0.539957 knots) and enforce UTC formatting
    df_gps_normalized = df_gps_dedup \
        .withColumn("speed_knots", F.round(F.col("speed_kmh") * 0.539957, 4)) \
        .withColumn("ingested_at", F.current_timestamp()) \
        .withColumn("year", F.year(F.col("timestamp"))) \
        .withColumn("month", F.month(F.col("timestamp"))) \
        .drop("speed_kmh")

    # =========================================================================
    # 4. ENRICH & JOIN (Accelerated by GPU Broadcast & Hash Joins)
    # =========================================================================
    logger.info("Step 4: Enriching telemetry stream with real-time API indexes")

    # Broadcast smaller API lookup dimension tables (weather stations & ports) to parallel worker GPUs
    # Direct GPU-accelerated hash joins bypass slow CPU networking serialization shuffles
    df_enriched = df_gps_normalized \
        .join(F.broadcast(df_weather), 
              (F.abs(df_gps_normalized.latitude - df_weather.station_lat) < 0.25) & 
              (F.abs(df_gps_normalized.longitude - df_weather.station_lng) < 0.25), 
              "left_outer") \
        .join(F.broadcast(df_port), 
              (F.abs(df_gps_normalized.latitude - df_port.port_lat) < 0.15) & 
              (F.abs(df_gps_normalized.longitude - df_port.port_lng) < 0.15), 
              "left_outer") \
        .select(
            df_gps_normalized["*"],
            F.col("condition").alias("local_weather_condition"),
            F.col("visibility_meters").alias("weather_visibility_m"),
            F.col("port_name").alias("closest_docking_port"),
            F.col("dwell_time_avg_hours").alias("active_port_dwell_hrs")
        )

    # =========================================================================
    # 5. SPATIAL ANOMALY DETECTION (Accelerated by GPU Geospatial Geometry)
    # =========================================================================
    logger.info("Step 5: Executing parallelized mathematical anomaly detection algorithms")

    # Define bounding hazard zones (e.g., active blizzards or severe terminal labor walkouts)
    # Standard Haversine geodetic approximation calculations computed natively in GPU CUDA registers:
    # d = 2 * R * arcsin( sqrt( sin^2(d_lat/2) + cos(lat1)*cos(lat2)*sin^2(d_lon/2) ) )
    # Let's approximate using parallel Euclidean coordinate bounding to optimize pipeline scale.
    
    df_anomalies = df_enriched.withColumn(
        "is_disrupted",
        F.when(
            (F.col("local_weather_condition").rlike("(?i)(blizzard|hurricane|typhoon|severe storm)")) |
            (F.col("active_port_dwell_hrs") > 48.0) |
            (F.col("coolant_temp_c") > 105.0), # Mechanical anomaly
            F.lit(True)
        ).otherwise(F.lit(False))
    ).withColumn(
        "disruption_category",
        F.when(F.col("local_weather_condition").rlike("(?i)(blizzard|hurricane|typhoon)"), F.lit("Severe Weather"))
         .when(F.col("active_port_dwell_hrs") > 48.0, F.lit("Port Terminal Blockage"))
         .when(F.col("coolant_temp_c") > 105.0, F.lit("Vehicle Fleet Mechanical Failure"))
         .otherwise(F.lit("None"))
    )

    # =========================================================================
    # 6. CONVERT & CONSOLIDATE (Accelerated by GPU Parquet Compression Writer)
    # =========================================================================
    logger.info("Step 6: Writing clean, normalized and partitioned Parquet datasets back to GCS")
    
    # Repartition and write as compressed Parquet files (GPU-accelerated Snappy format)
    # Partitioned by year and month to preserve downstream query efficiency on BigQuery tables
    df_anomalies.write \
        .mode("overwrite") \
        .partitionBy("year", "month") \
        .parquet(gcs_output_path)

    logger.info(f"SUCCESS: PySpark GPU accelerated ingestion pipeline successfully compiled and saved. Target: {gcs_output_path}")
    
    spark.stop()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        logger.error("Usage: gpu_ingestion_pipeline.py <gcs_input_prefix> <gcs_output_path>")
        sys.exit(1)
        
    in_prefix = sys.argv[1]
    out_path = sys.argv[2]
    
    execute_pipeline(in_prefix, out_path)
