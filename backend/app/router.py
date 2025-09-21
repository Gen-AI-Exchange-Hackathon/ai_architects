import asyncio
from fastapi import APIRouter, Query, HTTPException
from fastapi.concurrency import run_in_threadpool
from .controller import *

import anyio
from app.dao import get_analysis_result, get_conversation_history
from app.gemini_service import initialize_gemini_client
from google.genai import types
from fastapi.responses import StreamingResponse
import re

router = APIRouter()

@router.get("/hello")
async def hello():
    """Basic hello endpoint"""
    return get_hello()

@router.get("/generate_summary")
async def generate_content_endpoint(
    path: str = Query(..., description="Relative path in bucket (e.g., L1/L2)"),
    mode: str = Query("new", description="Mode: 'new' to generate fresh analysis, 'read' to fetch cached result")
):
    """Generate AI content from ALL files in GCS path OR retrieve cached analysis"""
    
    # Validate path format: exactly one slash separating two non-empty segments, no additional slashes
    if not re.fullmatch(r'[^/]+/[^/]+', path):
        raise HTTPException(
            status_code=400,
            detail="Invalid path format. Expected format: L1/L2 (only one slash allowed, no leading/trailing slashes)."
        )
    
    if mode == "new":
        # Run the sync function in threadpool for proper async handling
        result = await run_in_threadpool(generate_content_from_path, path)
        
        if result["status"] == "error":
            raise HTTPException(status_code=400, detail=result["message"])
        
        return result
        
    elif mode == "read":
        from app.dao import get_cached_analysis_result
        
        # Run the sync DAO function in threadpool
        cached_result = await run_in_threadpool(get_cached_analysis_result, gcs_key=path)
        
        if not cached_result:
            raise HTTPException(
                status_code=404, 
                detail=f"No cached analysis found for path: {path}. Use mode='new' to generate fresh analysis."
            )
        
        return cached_result
        
    else:
        raise HTTPException(
            status_code=400, 
            detail="Invalid mode parameter. Use 'new' or 'read'"
        )

@router.get("/gcs/list-all")
async def list_all_files_endpoint(
    path: str = Query(..., description="Relative path in bucket (e.g., L1/L2)")
):
    """List ALL files in gs://evaluate-startup/{path} with mime type detection"""
    # Run sync function in threadpool
    result = await run_in_threadpool(list_all_files_from_path, path)
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

# CHATBOT ENDPOINTS

@router.post("/chat/message")
async def chat_message(
    gcs_key: str = Query(..., description="GCS key (analysis result session ID)"),
    message: str = Query(..., description="User message")
):
    """Chat about a specific startup analysis using its GCS key as session ID"""
    
    result = await run_in_threadpool(generate_chat_response, gcs_key, message)
    
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result

@router.get("/history")
async def get_chat_history(gcs_key: str):
    """Get conversation history for a startup analysis (GCS key)"""
    
    from app.dao import get_conversation_history, get_analysis_result
    
    logging.info(f"get_chat_history called with gcs_key: {gcs_key}")
    
    # Verify analysis exists
    analysis = await run_in_threadpool(get_analysis_result, gcs_key=gcs_key)
    if not analysis:
        logging.warning(f"No analysis found for GCS key: {gcs_key}")
        raise HTTPException(status_code=404, detail="No analysis found for this GCS key")
    
    history = await run_in_threadpool(get_conversation_history, session_id=gcs_key)
    
    return {
        "status": "success",
        "gcs_key": gcs_key,
        "startup_name": analysis.get('startup_name', 'Unknown'),
        "messages": history
    }

@router.get("/chat/startup-sessions")
async def list_startup_chat_sessions():
    """Get list of startups with chat sessions"""
    
    from app.dao import get_startup_chat_sessions
    sessions = await run_in_threadpool(get_startup_chat_sessions)
    
    return {
        "status": "success",
        "sessions": sessions
    }

@router.get("/chat/available-analyses")
async def get_available_analyses():
    """Get list of all available analysis results that can be used for chat"""
    
    from app.dao import get_all_analysis_results
    analyses = await run_in_threadpool(get_all_analysis_results)
    
    return {
        "status": "success",
        "available_analyses": analyses,
        "message": "Use any gcs_key from this list to start a chat session"
    }



@router.post("/chat/stream/message")
async def chat_stream_message(
    gcs_key: str = Query(..., description="GCS key (session ID)"),
    message: str = Query(..., description="User input message")
):
    # Prepare prompt using existing conversation loading logic
    analysis = await asyncio.to_thread(get_analysis_result, gcs_key)
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this GCS key")

    conversation_history = await asyncio.to_thread(get_conversation_history, gcs_key, 10)
    context_lines = []
    for msg in conversation_history:
        role = "User" if msg['sender'] == 'user' else "Assistant"
        context_lines.append(f"{role}: {msg['message']}")
    conversation_text = "\n".join(context_lines) if context_lines else "No previous conversation."
    
    system_prompt = f"""You are an expert startup analyst assistant discussing {analysis.get('startup_name', 'Unknown')}.
STARTUP ANALYSIS SUMMARY:
{analysis.get('analysis_summary', '')}
Conversation History:
{conversation_text}
User: {message}
Assistant:"""
    
    client = initialize_gemini_client()
    
    # Define the grounding tool with Google Search
    grounding_tool = types.Tool(google_search=types.GoogleSearch())
    
    # Configure generation settings with grounding tool enabled
    config = types.GenerateContentConfig(
        tools=[grounding_tool],
        temperature=0.7,
        max_output_tokens=1000,
    )
    
    async def async_generator_wrapper(sync_generator):
        for item in sync_generator:
            yield item
    
    async def event_generator():
        try:
            sync_stream = await anyio.to_thread.run_sync(
                lambda: client.models.generate_content_stream(
                    model="gemini-2.5-flash",
                    contents=system_prompt,
                    config=config
                )
            )
            async for chunk in async_generator_wrapper(sync_stream):
                print(chunk)
                # try to yield the text or string
                if hasattr(chunk, 'text'):
                    yield chunk.text
                else:
                    yield str(chunk)
        except Exception as e:
            yield f"\n\n[Stream error: {str(e)}]"
    
    return StreamingResponse(event_generator(), media_type="text/plain")
