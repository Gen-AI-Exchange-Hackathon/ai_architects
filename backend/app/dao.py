from typing import Dict, Any, List, Optional 
from sqlalchemy import text
from .db import engine
import logging
import json

def upsert_analysis_result(gcs_key: str, startup_name: str, extracted_data: Dict[str, Any], 
                          analysis_summary: str = None, files_processed: int = 0,
                           peer_comparison_table: str = None):
    """Store complete analysis result for a startup (one row)"""
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO analysis_results (gcs_key, startup_name, extracted_data, analysis_summary, files_processed, peer_comparison_table)
                VALUES (:gcs_key, :startup_name, :extracted_data, :analysis_summary, :files_processed, :peer_comparison_table)
                ON CONFLICT (gcs_key, startup_name)
                DO UPDATE SET 
                    extracted_data = EXCLUDED.extracted_data,
                    analysis_summary = EXCLUDED.analysis_summary,
                    files_processed = EXCLUDED.files_processed,
                    peer_comparison_table = EXCLUDED.peer_comparison_table,
                    updated_at = now()
            """), {
                "gcs_key": gcs_key,
                "startup_name": startup_name,
                "extracted_data": json.dumps(extracted_data),  # Store as JSONB
                "analysis_summary": json.dumps(analysis_summary),
                "files_processed": files_processed,
                "peer_comparison_table": json.dumps(peer_comparison_table)
            })
        
        logging.info(f"Stored analysis result for {startup_name} from {gcs_key}")
        return True
    except Exception as e:
        logging.error(f"Error storing analysis result: {e}")
        raise

def get_analysis_result(gcs_key: str = None, startup_name: str = None) -> Dict[str, Any]:
    """Get analysis result by GCS key and/or startup name - INCLUDING analysis_summary"""
    try:
        where_conditions = []
        params = {}
        
        if gcs_key:
            where_conditions.append("gcs_key = :gcs_key")
            params["gcs_key"] = gcs_key
        
        if startup_name:
            where_conditions.append("startup_name = :startup_name")
            params["startup_name"] = startup_name
        
        if not where_conditions:
            raise ValueError("Either gcs_key or startup_name is required")
            
        where_clause = " AND ".join(where_conditions)
        
        with engine.begin() as conn:
            result = conn.execute(text(f"""
                SELECT id, gcs_key, startup_name, extracted_data, analysis_summary, 
                       peer_comparison_table, files_processed, created_at, updated_at
                FROM analysis_results
                WHERE {where_clause}
            """), params).mappings().first()
        
        if not result:
            return None
            
        return dict(result)
    except Exception as e:
        logging.error(f"Error getting analysis result: {e}")
        raise

def get_cached_analysis_result(gcs_key: str) -> Dict[str, Any]:
    """Get cached analysis result by GCS key"""
    return get_analysis_result(gcs_key=gcs_key)

def get_conversation_history(session_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get conversation history for a session (gcs_key)"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
                SELECT user_message, model_response, created_at
                FROM conversations 
                WHERE session_id = :session_id
                ORDER BY created_at ASC
                LIMIT :limit
            """), {"session_id": session_id, "limit": limit}).mappings().all()
        
        # Convert to expected format (with 'message' and 'sender' keys for compatibility)
        formatted_history = []
        for row in result:
            # Add user message first
            if row['user_message']:
                formatted_history.append({
                    'message': row['user_message'],
                    'sender': 'user',
                    'created_at': row['created_at']
                })
            # Then add bot response
            if row['model_response']:
                formatted_history.append({
                    'message': row['model_response'],
                    'sender': 'assistant',
                    'created_at': row['created_at']
                })
        
        return formatted_history
    except Exception as e:
        logging.error(f"Error getting conversation history: {e}")
        return []

def store_conversation_pair(session_id: str, user_message: str, model_response: str, startup_name: str = None) -> bool:
    """Store a complete conversation pair (user question + bot response)"""
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO conversations (session_id, startup_name, gcs_key, user_message, model_response, created_at)
                VALUES (:session_id, :startup_name, :gcs_key, :user_message, :model_response, now())
            """), {
                "session_id": session_id,
                "startup_name": startup_name,
                "gcs_key": session_id,  # Using session_id as gcs_key since they're the same
                "user_message": user_message,
                "model_response": model_response
            })
        return True
    except Exception as e:
        logging.error(f"Error storing conversation pair: {e}")
        return False

def store_conversation_message(session_id: str, message: str, sender: str) -> bool:
    """Legacy function - kept for compatibility but not used with new schema"""
    # This function is called by the chatbot service but we'll handle storage differently
    return True

def get_startup_chat_sessions() -> List[Dict[str, Any]]:
    """Get list of startups with chat sessions"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
                SELECT 
                    c.session_id as gcs_key,
                    c.startup_name,
                    MIN(c.created_at) as first_chat,
                    MAX(c.created_at) as last_chat,
                    COUNT(*) as message_count
                FROM conversations c
                GROUP BY c.session_id, c.startup_name
                ORDER BY MAX(c.created_at) DESC
                LIMIT 50
            """)).mappings().all()
        
        return [dict(row) for row in result]
    except Exception as e:
        logging.error(f"Error getting startup chat sessions: {e}")
        return []

def get_all_analysis_results() -> List[Dict[str, Any]]:
    """Get list of all available analysis results for chat"""
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
                SELECT gcs_key, startup_name, created_at, files_processed
                FROM analysis_results
                ORDER BY created_at DESC
                LIMIT 100
            """)).mappings().all()
        
        return [dict(row) for row in result]
    except Exception as e:
        logging.error(f"Error getting all analysis results: {e}")
        return []
