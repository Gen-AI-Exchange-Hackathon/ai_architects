from typing import List, Dict, Any
from google.cloud import storage
import logging

# Initialize the GCS client globally
client = storage.Client()

# Hardcode your bucket name
BUCKET_NAME = "evaluate-startup"

def list_gcs_files(relative_path: str, max_files: int = 100) -> List[Dict[str, Any]]:
    """List files in the GCS path using relative path"""
    try:
        bucket = client.bucket(BUCKET_NAME)
        
        # Use relative path as prefix
        prefix = relative_path if not relative_path.startswith('/') else relative_path[1:]
        
        # List blobs with the given prefix
        blobs = bucket.list_blobs(prefix=prefix, max_results=max_files)
        
        files = []
        for blob in blobs:
            # Skip directories (blobs ending with '/')
            if not blob.name.endswith('/'):
                files.append({
                    "name": blob.name,
                    "size": blob.size,
                    "created": blob.time_created.isoformat() if blob.time_created else None,
                    "updated": blob.updated.isoformat() if blob.updated else None,
                    "content_type": blob.content_type,
                    "md5_hash": blob.md5_hash,
                    "full_path": f"gs://{BUCKET_NAME}/{blob.name}"
                })
        
        return files
        
    except Exception as e:
        logging.error(f"Error listing files in {relative_path}: {str(e)}")
        raise
