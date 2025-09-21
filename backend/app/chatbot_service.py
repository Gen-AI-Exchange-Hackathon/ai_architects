from google import genai
from google.genai import types
from typing import Dict, Any, List
import logging

def generate_chat_response_gemini(gcs_key: str, user_message: str) -> Dict[str, Any]:
    """Generate chatbot response using direct Gemini API"""
    
    try:
        from app.dao import get_analysis_result, get_conversation_history, store_conversation_pair
        from app.gemini_service import initialize_gemini_client
        
        # Get analysis summary for context
        analysis_result = get_analysis_result(gcs_key=gcs_key)
        if not analysis_result:
            return {
                "status": "error",
                "message": "No analysis found for this startup. Please generate analysis first."
            }
        
        analysis_summary = analysis_result.get('analysis_summary', '')
        startup_name = analysis_result.get('startup_name', 'Unknown Company')
        
        # Get conversation history
        conversation_history = get_conversation_history(session_id=gcs_key, limit=10)
        
        # Build conversation context
        context_lines = []
        for msg in conversation_history:
            role = "User" if msg['sender'] == 'user' else "Assistant"
            context_lines.append(f"{role}: {msg['message']}")
        
        conversation_context = "\n".join(context_lines) if context_lines else "No previous conversation."
        
        # Create comprehensive system prompt
        system_prompt = f"""You are an expert startup analyst assistant discussing {startup_name}.
                STARTUP ANALYSIS SUMMARY (your primary knowledge base):
                {analysis_summary}
                CONVERSATION HISTORY:
                {conversation_context}
                Based on this analysis summary and conversation history, provide accurate, insightful responses about this startup. Provide your answers as plain text only without any markdown, citations, references, or formatting. Reference specific details from the analysis when relevant.
                """

        
        # Initialize Gemini client
        client = initialize_gemini_client()
        # Define the grounding tool with Google Search
        grounding_tool = types.Tool(google_search=types.GoogleSearch())

        # Configure generation settings with grounding tool enabled
        config = types.GenerateContentConfig(
            tools=[grounding_tool],
            temperature=0.7,
            max_output_tokens=1000,
        )
        
        # SIMPLIFIED: Use string contents and `config` as dictionary instead of generation_config
        full_prompt = f"{system_prompt}\n\nUser: {user_message}\n\nAssistant:"
        
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=full_prompt,
            config=config 
        )
        
        bot_response = response.text.strip()
        
        # Store conversation pair (single row with both user message and bot response)
        store_conversation_pair(gcs_key, user_message, bot_response, startup_name)
        
        return {
            "status": "success",
            "session_id": gcs_key,
            "startup_name": startup_name,
            "user_message": user_message,
            "bot_response": bot_response,
            "has_analysis_context": bool(analysis_summary)
        }
        
    except Exception as e:
        logging.error(f"Error in chat response generation: {e}")
        return {
            "status": "error",
            "message": f"Failed to generate chat response: {str(e)}"
        }
