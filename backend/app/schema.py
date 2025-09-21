from sqlalchemy import text
from .db import engine
import logging

DDL = """
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Single row per startup analysis
CREATE TABLE IF NOT EXISTS analysis_results (
  id BIGSERIAL PRIMARY KEY,
  gcs_key TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  analysis_summary JSONB,
  files_processed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  peer_comparison_table JSONB,
  UNIQUE(gcs_key, startup_name)
);

-- Conversations table (unchanged)
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  startup_name TEXT,
  gcs_key TEXT,
  user_message TEXT NOT NULL,
  model_response TEXT NOT NULL,
  user_meta JSONB,
  model_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

def init_schema():
    try:
        with engine.begin() as conn:
            statements = [stmt.strip() for stmt in DDL.split(';') if stmt.strip()]
            for stmt in statements:
                conn.execute(text(stmt))
        logging.info("✅ Database schema initialized successfully")
        return True
    except Exception as e:
        logging.error(f"❌ Schema initialization failed: {e}")
        return False
