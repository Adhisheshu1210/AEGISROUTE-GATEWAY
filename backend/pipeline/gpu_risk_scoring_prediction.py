# -*- coding: utf-8 -*-
"""
AegisRoute Enterprise Platform - Component 2: GPU-Accelerated Risk Scoring & Delay Prediction Pipeline
Module: gpu_risk_scoring_prediction.py
Description: Parallelized geospatial joins, geodetic Haversine calculations, weather/traffic matching,
             risk scoring, delay predictions, and priority ranking executed on NVIDIA GPUs via Spark RAPIDS 
             and stored securely in Google Cloud BigQuery.

License: Apache-2.0
"""

import sys
import time
import logging
import math
from typing import Callable, Any
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
logger = logging.getLogger("AegisRoute.GPURiskScoring")


def retry_on_failure(max_retries: int = 3, backoff_seconds: int = 2) -> Callable:
    """
    Decorator pattern providing robust, distributed retry mechanisms 
    with exponential backoff for GKE/BigQuery I/O operations.
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> Any:
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    wait_time = backoff_seconds * (2 ** (retries - 1))
                    logger.warning(
                        f"Execution failed for {func.__name__} (Attempt {retries}/{max_retries}). "
                        f"Retrying in {wait_time}s... Error: {str(e)}"
                    )
                    time.sleep(wait_time)
            logger.error(f"Critical: Maximum retries ({max_retries}) reached for {func.__name__}.")
            raise RuntimeError(f"Max retries exceeded for {func.__name__}")
        return wrapper
    return decorator


def init_gpu_spark_session(app_name: str = "AegisRoute-GPU-Risk-Scoring-Pipeline") -> SparkSession:
    """
    Initializes a SparkSession pre-configured for the NVIDIA RAPIDS Accelerator 
    and Google Cloud BigQuery connector.
    """
    logger.info("Initializing GPU SparkSession with BigQuery connectors and CUDA pooling configurations.")
    
    builder = SparkSession.builder \
        .appName(app_name) \
        .config("spark.master", "yarn") \
        .config("spark.submit.deployMode", "cluster") \
        # 1. Enable BigQuery connector for high-throughput GCS proxy reads/writes
        .config("spark.datasource.bigquery.tempGcsBucket", "aegisroute-bigquery-temp-bucket") \
        # 2. Enable NVIDIA RAPIDS SQL Plugin for CUDA GPU compilation
        .config("spark.plugins", "com.nvidia.spark.SQLPlugin") \
        .config("spark.executor.resource.gpu.amount", "1") \
        .config("spark.task.resource.gpu.amount", "0.25") \
        # 3. Memory Allocation optimizations for spatial cross-joins
        .config("spark.rapids.memory.gpu.allocator.allocator", "ARENA") \
        .config("spark.rapids.memory.gpu.pooling.enabled", "true") \
        .config("spark.rapids.memory.gpu.pooling.initialSize", "8G") \
        .config("spark.rapids.sql.concurrentGPUTasks", "2") \
        # 4. Enable RAPIDS-specific geospatial optimization configs
        .config("spark.rapids.sql.explain", "ALL") \
        .config("spark.rapids.sql.variable.float.reproducibility", "false")

    return builder.getOrCreate()


@retry_on_failure(max_retries=3, backoff_seconds=3)
def write_to_bigquery(df, table_id: str):
    """
    Writes a Spark DataFrame directly into Google Cloud BigQuery 
    using the optimized Spark-BigQuery Connector.
    Uses the retry decorator to handle transient network issues or rate limits.
    """
    logger.info(f"Initiating bulk write to BigQuery Table: {table_id}")
    
    # Write using direct GCS staging, bypassing slow row-by-row API streams
    df.write \
        .format("bigquery") \
        .option("table", table_id) \
        .option("writeMethod", "direct") \
        .mode("append") \
        .save()
        
    logger.info(f"BigQuery bulk write completed successfully for table: {table_id}")


def run_prediction_and_risk_scoring(gcs_parquet_input: str, bq_output_table: str):
    """
    Main pipeline execution. Matches millions of GPS telemetry points against weather boundaries,
    computes complex geodetic distances, scores logistical lane risks, and predicts delays and ETAs.
    """
    start_pipeline_time = time.time()
    spark = init_gpu_spark_session()
    
    logger.info("Step 1: Reading clean telematics Parquet buffers from GCS")
    # Leverages GPU Parquet Reader: parses column structures on GPU memory instantly
    df_telemetry = spark.read.parquet(gcs_parquet_input)

    # =========================================================================
    # A. GEOSPATIAL JOIN & HA VERSINE DISTANCE CALCULATIONS (Accelerated by GPU CUDA)
    # =========================================================================
    logger.info("Step 2: Executing geodetic Haversine distance computations on GPU registers")
    
    # Earth average radius in kilometers
    EARTH_RADIUS_KM = 6371.0

    # Define weather and port incident centroids (emulating dynamic inputs)
    # Blizzard Hazard Centroid
    blizzard_lat = 41.8781
    blizzard_lng = -87.6298
    blizzard_radius_km = 350.0

    # Convert degrees to radians and compute Haversine formula
    # All trigonometric (sin, cos, atan2) and vector operations compile natively 
    # into CUDA kernels (PTX), running on parallel threads in micro-seconds.
    df_spatial = df_telemetry.withColumn(
        "dist_to_blizzard_km",
        F.lit(2.0) * F.lit(EARTH_RADIUS_KM) * F.asin(
            F.sqrt(
                F.pow(F.sin(F.radians(F.col("latitude") - F.lit(blizzard_lat)) / F.lit(2.0)), 2) +
                F.cos(F.radians(F.lit(blizzard_lat))) * F.cos(F.radians(F.col("latitude"))) *
                F.pow(F.sin(F.radians(F.col("longitude") - F.lit(blizzard_lng)) / F.lit(2.0)), 2)
            )
        )
    )

    # =========================================================================
    # B. WEATHER & TRAFFIC MATCHING WITH RISK SCORING (Accelerated by GPU Conditional Grids)
    # =========================================================================
    logger.info("Step 3: Evaluating weather / traffic intersections & compiling Risk Scores")
    
    # Risk Factor Formula (Compiles on GPU registers):
    # Base risk starts from 10.0. Adds 60.0 points if inside severe blizzard radius.
    # Adds up to 30.0 points proportionally to port congestion index or local speeds.
    df_risk = df_spatial.withColumn(
        "is_inside_hazard_zone",
        F.when(F.col("dist_to_blizzard_km") <= F.lit(blizzard_radius_km), F.lit(True)).otherwise(F.lit(False))
    ).withColumn(
        "risk_score",
        F.round(
            F.when(F.col("is_inside_hazard_zone") == F.lit(True), F.lit(65.0)).otherwise(F.lit(10.0)) +
            F.when(F.col("local_weather_condition").rlike("(?i)(severe|rain|storm)"), F.lit(15.0)).otherwise(F.lit(0.0)) +
            F.when(F.col("active_port_dwell_hrs") > 48.0, F.lit(20.0)).otherwise(F.lit(0.0)) +
            F.when(F.col("speed_knots") < 5.0, F.lit(10.0)).otherwise(F.lit(0.0)),
            2
        )
    )

    # =========================================================================
    # C. DELAY & ETA PREDICTION (Accelerated by GPU Math / ML Matrix)
    # =========================================================================
    logger.info("Step 4: Predicting shipping delays and ETA parameters")
    
    # Predict delay hours based on Risk Index and current remaining progress:
    # delay_hours = (risk_score / 10.0) * ( (100 - progress) / 20.0 )
    df_predicted = df_risk.withColumn(
        "predicted_delay_hours",
        F.round(
            F.when(
                F.col("risk_score") >= 50.0,
                (F.col("risk_score") / F.lit(10.0)) * ((F.lit(100.0) - F.col("progress")) / F.lit(20.0))
            ).otherwise(F.lit(0.0)),
            1
        )
    ).withColumn(
        "predicted_eta",
        # Compute exact predicted ETA: base timestamp + progress remaining hours + predicted delay hours
        F.from_unixtime(
            F.unix_timestamp(F.col("timestamp")) + 
            (((F.lit(100.0) - F.col("progress")) * F.lit(1.2) + F.col("predicted_delay_hours")) * F.lit(3600.0))
        ).cast(TimestampType())
    )

    # =========================================================================
    # D. PRIORITY RANKING (Accelerated by GPU Sort-In-VRAM)
    # =========================================================================
    logger.info("Step 5: Performing dense priority ranking across fleet supply lanes")
    
    # Rank active shipments in parallel. High value, high risk, and delayed items
    # are bubbled to the top. This dense rank executes via parallel VRAM sort keys.
    from pyspark.sql.window import Window
    window_spec = Window.partitionBy("priority").orderBy(F.col("risk_score").desc(), F.col("value").desc())
    
    df_ranked = df_predicted.withColumn(
        "dispatch_priority_rank",
        F.dense_rank().over(window_spec)
    )

    # Select and structure final database columns matching BigQuery enterprise schema
    df_final_reporting = df_ranked.select(
        F.col("vehicle_id").alias("shipment_id"),
        F.col("code").alias("cargo_code"),
        F.col("carrier"),
        F.col("value").cast(DoubleType()).alias("cargo_value_usd"),
        F.col("priority"),
        F.col("progress").cast(IntegerType()),
        F.col("latitude").alias("current_latitude"),
        F.col("longitude").alias("current_longitude"),
        F.col("speed_knots"),
        F.col("local_weather_condition"),
        F.col("active_port_dwell_hrs"),
        F.col("dist_to_blizzard_km"),
        F.col("is_inside_hazard_zone"),
        F.col("risk_score"),
        F.col("predicted_delay_hours"),
        F.col("predicted_eta"),
        F.col("dispatch_priority_rank"),
        F.current_timestamp().alias("processed_at")
    )

    # =========================================================================
    # E. BULK LOAD INTO BIGQUERY WITH FAILURE RETRY HANDLERS
    # =========================================================================
    logger.info("Step 6: Writing prediction analytics results into BigQuery")
    write_to_bigquery(df_final_reporting, bq_output_table)

    duration_sec = time.time() - start_pipeline_time
    logger.info(f"SUCCESS: Risk Scoring & Delay Prediction Pipeline completed in {duration_sec:.2f} seconds total.")
    
    spark.stop()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        logger.error("Usage: gpu_risk_scoring_prediction.py <gcs_parquet_input> <bq_output_table>")
        sys.exit(1)
        
    parquet_in = sys.argv[1]
    bq_out = sys.argv[2]
    
    run_prediction_and_risk_scoring(parquet_in, bq_out)
