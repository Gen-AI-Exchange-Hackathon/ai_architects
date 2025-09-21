from typing import List, Dict, Any
from google import genai
from google.genai import types
from .gcs_service import list_gcs_files, BUCKET_NAME
import logging
import mimetypes
from docx import Document 
from google.cloud import storage
import io

def initialize_gemini_client():
    """Initialize Gemini client"""
    client = genai.Client(
        vertexai=True,
        project="startip-evaluator",
        location="global",
    )
    return client

def get_mime_type_from_filename(filename: str) -> str:
    """Detect MIME type from filename extension"""
    mime_type, _ = mimetypes.guess_type(filename)
    
    # Return detected mime type or default to binary
    return mime_type or "application/octet-stream"

def get_all_files_from_path(relative_path: str) -> List[Dict[str, Any]]:
    """Get all files from GCS path (any format)"""
    try:
        files = list_gcs_files(relative_path, max_files=100)
        
        # Add mime type information to each file
        for file in files:
            filename = file.get("name", "").split("/")[-1]  # Get just the filename
            file["detected_mime_type"] = get_mime_type_from_filename(filename)
        
        return files
        
    except Exception as e:
        logging.error(f"Error getting files from {relative_path}: {str(e)}")
        raise

def extract_text_from_docx_bytes(docx_bytes: bytes) -> str:
    """Extract plain text from .docx bytes using python-docx"""
    bio = io.BytesIO(docx_bytes)
    document = Document(bio)
    full_text = []
    for para in document.paragraphs:
        full_text.append(para.text)
    return "\n".join(full_text)

def generate_from_gcs_files(gcs_file_uris: List[str], prompt, enable_grounding) -> str:
    """Generate content from multiple GCS files with optional Google Search grounding"""
    storage_client = storage.Client()
    try:
        client = initialize_gemini_client()
        
        # Create parts for each file with dynamic mime type detection
        parts = []
        for file_uri in gcs_file_uris:
            filename = file_uri.split("/")[-1]
            mime_type = get_mime_type_from_filename(filename)
            
            if filename.lower().endswith(".docx"):
                # Extract plain text from .docx file in GCS
                try:
                    # Extract bucket and blob path from GS URI like 'gs://bucket_name/path/to/file.docx'
                    path_parts = file_uri.replace("gs://", "").split("/", 1)
                    bucket_name = path_parts[0]
                    blob_path = path_parts[1]
                    
                    bucket = storage_client.bucket(bucket_name)
                    blob = bucket.blob(blob_path)
                    docx_bytes = blob.download_as_bytes()
                    extracted_text = extract_text_from_docx_bytes(docx_bytes)
                    
                    # Add extracted text as a text part instead of URI
                    part = types.Part.from_text(text=extracted_text)
                    parts.append(part)
                    
                    print(f"Added extracted text from .docx file: {filename}")
                    continue
                except Exception as e:
                    print(f"❌ Failed to extract text from .docx {filename}: {e}")
                    logging.error(f".docx extraction error: {e}")
                    # Fallback to attaching as URI (less ideal)
            
            # For non-docx files or fallback, add as URI with mime_type
            part = types.Part.from_uri(
                file_uri=file_uri,
                mime_type=mime_type
            )
            parts.append(part)
            print(f"Added file: {filename} with mime type: {mime_type}")
        
        # Add the text prompt
        parts.append(types.Part.from_text(text=prompt))
        
        model = "gemini-2.5-pro"  # ✅ Better grounding support
        contents = [
            types.Content(
                role="user",
                parts=parts
            ),
        ]
        
        # Setup tools array - add grounding if enabled
        tools = []
        if enable_grounding:
            grounding_tool = types.Tool(
                google_search=types.GoogleSearch()
            )
            tools.append(grounding_tool)
            print("✅ Google Search grounding enabled")
        else:
            print("❌ Grounding disabled")
        
        generate_content_config = types.GenerateContentConfig(
            tools=tools,
            temperature=0.3,  # ✅ Lower temperature for factual responses
            max_output_tokens=65535,
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="OFF"
                )
            ]
            # ✅ Removed thinking_config - can interfere with grounding
        )
        
        print("🚀 Making API call with grounding...")
        
        # ✅ Use non-streaming generate_content for better grounding
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        print(f"📄 Response generated: {len(response.text)} characters")
        
        # Debug grounding metadata
        if hasattr(response, 'grounding_metadata') and response.grounding_metadata:
            print(f"🔍 Grounding metadata found: {response.grounding_metadata}")
        else:
            print("❌ No grounding metadata in response")
        
        return response.text
        
    except Exception as e:
        print(f"❌ Error generating content: {e}")
        logging.error(f"Error generating content from GCS files: {str(e)}")
        raise



def generate_from_path(relative_path: str, prompt, enable_grounding) -> Dict[str, Any]:
    """Generate content from all files in a GCS path with optional grounding"""
    try:
        # Get all files from the path
        all_files = get_all_files_from_path(relative_path)
        
        if not all_files:
            return {
                "status": "error",
                "message": f"No files found in path: {relative_path}"
            }
        
        # Extract file URIs for generation
        file_uris = [file["full_path"] for file in all_files]
        
        # Generate content from all files with grounding
        generated_content = generate_from_gcs_files(file_uris, prompt, enable_grounding)
        
        # Prepare file info for response
        file_info = []
        for file in all_files:
            filename = file.get("name", "").split("/")[-1]
            file_info.append({
                "filename": filename,
                "full_path": file["full_path"],
                "size": file.get("size"),
                "mime_type": file.get("detected_mime_type"),
                "content_type": file.get("content_type")
            })
        
        return {
            "status": "success",
            "relative_path": relative_path,
            "full_path": f"gs://{BUCKET_NAME}/{relative_path}",
            "total_files_processed": len(all_files),
            "files_processed": file_info,
            "prompt": prompt,
            "generated_content": generated_content,
            "grounding_enabled": enable_grounding
        }
        
    except Exception as e:
        logging.error(f"Error generating from path {relative_path}: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to generate content: {str(e)}",
            "relative_path": relative_path
        }

