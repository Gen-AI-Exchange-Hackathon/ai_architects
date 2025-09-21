from typing import Dict, Any
from .gemini_service import *
import logging
import time
import json

def get_hello() -> Dict[str, Any]:
    """Return a basic hello message"""
    return {
        "status": "success",
        "message": "API test success!"
    }
    
def list_all_files_from_path(relative_path: str) -> Dict[str, Any]:
    """List all files from GCS path with mime type detection"""
    try:
        all_files = get_all_files_from_path(relative_path)
        
        # Group files by type for better organization
        files_by_type = {}
        for file in all_files:
            mime_type = file.get("detected_mime_type", "unknown")
            file_category = mime_type.split("/")[0]  # e.g., "image", "application", "text"
            
            if file_category not in files_by_type:
                files_by_type[file_category] = []
            
            files_by_type[file_category].append({
                "filename": file.get("name", "").split("/")[-1],
                "full_path": file["full_path"],
                "size": file.get("size"),
                "mime_type": mime_type,
                "content_type": file.get("content_type")
            })
        
        return {
            "status": "success",
            "relative_path": relative_path,
            "full_path": f"gs://{BUCKET_NAME}/{relative_path}",
            "total_files": len(all_files),
            "files_by_type": files_by_type
        }
        
    except Exception as e:
        logging.error(f"Error listing all files: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to list files: {str(e)}",
            "relative_path": relative_path
        }

def generate_content_from_path(relative_path: str, startup_name: str = None) -> Dict[str, Any]:
    """Generate AI content from all files in GCS path and extract startup information"""
    start_time = time.time()
    
    # Extract startup name from files if not provided
    if not startup_name:
        try:
            from app.gemini_service import get_all_files_from_path
            all_files = get_all_files_from_path(relative_path)
            
            startup_names = set()
            for file in all_files:
                filename = file.get("name", "").split("/")[-1]
                if "_" in filename:
                    name_part = filename.split("_")[0].lower().strip()
                    if name_part:
                        startup_names.add(name_part)
            
            if startup_names:
                startup_name = list(startup_names)[0]
            else:
                startup_name = relative_path.split('/')[-1] or "unknown"
                
        except Exception as e:
            startup_name = "unknown"
            logging.error(f"Could not extract startup name: {e}")
    
    # Enhanced prompt for both analysis and structured data
    enhanced_prompt = f"""
    Please analyze the startup documents AND search for additional information using these sources:
    PRIMARY: Use Google Search for current information about {startup_name or 'this company'}
    FALLBACK SOURCES (for comprehensive financial data):
    - Company investor relations pages and annual reports
    - SEC EDGAR filings (for public companies)
    - PitchBook.com for VC-backed startup data
    - CB Insights for tech startup metrics
    - Crunchbase.com for funding information
    - Industry-specific financial databases
    - Company LinkedIn pages for employee metrics
    - Market research reports and analyst coverage
    SEARCH STRATEGIES:
    - "[company_name] total runway cash burn rate"
    - "[company_name] balance sheet fixed assets"
    - "[company_name] marketing budget advertising spend"
    - "[company_name] operational expenses breakdown"
    - "[company_name] cost structure analysis"
    - "[company_name] financial statements"

    Provide THREE outputs, separated by the exact line only after outputs from 1., 2., and 3.:
    ===OUTPUT-SECTION-SEPARATOR===

    1. SHORT SUMMARY:
    Provide a concise plain-text paragraph summarizing the startup’s core business and key highlights in 1 or 2 lines.

    ===OUTPUT-SECTION-SEPARATOR===

    2. ANALYSIS SUMMARY AND STRUCTURED DATA:
    Provide a detailed analysis including financial insights, risk evaluation using the Scorecard Risk Method and other relevant frameworks.
    For the risk portion, analyze these areas: market risk, product risk, team and execution risk, regulatory risk, financial risk.
    Assign an overall risk score out of 5 (where 5 = very low risk, 1 = very high risk), using a JSON field "risk_gauge". In another JSON field "risk_gauge_reason", provide a brief summary justifying the risk score (covering all risk areas).
    Then, provide the structured data JSON below with all fields, including the two new risk keys:

    {{
        "company_name": "Search for official company name",
        "website_url": "Search for the primary official website of the company and add the link here",
        "industry": "Search for industry classification",
        "valuation": "Search latest valuation from multiple sources",
        "funding_rounds": "Search total rounds from funding databases",
        "type_of_funding": "Search funding types received",
        "founders_info": "Search founder backgrounds",
        "number_of_employees": "Search current employee count. Just give a numbers without additional text",
        "headquarters": "Search headquarters location",
        "business_model": "Analyze revenue generation model",
        "revenue": "Search annual revenue from financial reports",
        "arr": "Search/calculate annual recurring revenue",
        "profit": "Search net profit from financial statements",
        "current_investors_stake": "Search investor ownership data",
        "tam": "Search total addressable market analysis",
        "liabilities": "Search total liabilities from balance sheet",
        "cac": "Search/estimate customer acquisition cost",
        "burn_rate": "Search/calculate monthly burn rate",
        "runway": "Calculate: cash reserves ÷ monthly burn rate",
        "cash_reserve": "Search current cash and equivalents",
        "total_runway": "Calculate total runway considering funding pipeline",
        "fixed_assets": "Search fixed assets from balance sheet",
        "raw_materials_cost": "Search cost of goods sold components",
        "inventory_cost": "Search inventory values from current assets. Give numbers.",
        "marketing_cost": "Search marketing and advertising expenses. Give numbers.",
        "operations_cost": "Search operational expenses breakdown. Give numbers.",
        "risk_summary": "Analyze overall risk assessment",
        "operational_risks": "Identify operational challenges and risks",
        "customer_risks": "Assess customer-related risks",
        "growth": "Analyze growth rate and trajectory",
        "expanding_to_cities": "Search geographic expansion plans",
        "usp": "Identify unique selling proposition",
        "market_demand": "Assess market demand indicators",
        "new_products": "Search product development pipeline",
        "patents": "Search patent portfolio information",
        "customer_feedback": "Search customer satisfaction metrics",
        "innovation_rate": "Assess R&D investment and innovation pace",
        "risk_gauge": "A numeric risk score out of 5 using the Scorecard and other risk frameworks",
        "risk_gauge_reason": "A concise summary justifying the risk score, covering all risk areas"
    }}

    ===OUTPUT-SECTION-SEPARATOR===

    3. PEER COMPARISON JSON:
    Generate a JSON object for {startup_name or 'this company'} and its top 5 peer companies in the below structure:
    {{
        "comparison": {{
            "columns": ["Company Name", "Primary AI Healthcare Focus", "Most Recent Funding Round", "Total Capital Raised", "Prominent Investors", "Founding Team", "Employee Estimate", "Market Traction", "Core Technology", "Revenue Model", "Recent News"],
            "companies": [
                {{
                    "Company Name": "Company 1",
                    "Primary AI Healthcare Focus": "...",
                    "Most Recent Funding Round": "...",
                    "Total Capital Raised": "...",
                    "Prominent Investors": "...",
                    "Founding Team": "...",
                    "Employee Estimate": "...",
                    "Market Traction": "...",
                    "Core Technology": "...",
                    "Revenue Model": "...",
                    "Recent News": "..."
                }},
                ... up to 5 peer companies
            ]
        }}
    }}
    Provide ONLY the JSON object WITHOUT any additional text or explanation.

    IMPORTANT INSTRUCTIONS:
    - Search multiple authoritative sources for each financial metric
    - Use financial databases and industry reports when available
    - Calculate derived metrics (like runway) using available data
    - Apply industry benchmarks for context when specific data unavailable
    - Only use "Not specified" after exhaustive multi-source search
    - Prioritize recent and authoritative financial data sources
    - Provide ONLY plain text content without any Markdown or special formatting (no bold, italics, headings, or inline code). Use normal, unformatted text in all responses.
    - Do not add any inline source citations. Do not include grounding sources.
    - Do not include source citations or bracketed references like [Doc 1, page 4] in your output.
    """

    
    # Generate content using existing function
    from app.gemini_service import generate_from_path
    result = generate_from_path(relative_path, enhanced_prompt, enable_grounding=True)
    
    if result.get("status") != "success":
        return {
            "status": "error",
            "message": result.get("message", "Generation failed"),
            "gcs_key": relative_path,
            "startup_name": startup_name,
            "response_time_seconds": round(time.time() - start_time, 3)
        }
    
    # # Extract both analysis summary and structured data
    from app.kv_parser import extract_analysis_and_kv_pairs
    # analysis_summary, extracted_data = extract_analysis_and_kv_pairs(result["generated_content"])
    
    full_generated = result["generated_content"]


    parts = [p.strip() for p in full_generated.split("===OUTPUT-SECTION-SEPARATOR===") if p.strip()]
    short_summary = parts[0] if len(parts) > 0 else ""
    analysis_and_json_text = parts[1] if len(parts) > 1 else ""
    peer_comparison_json_text = parts[2] if len(parts) > 2 else "{}"

    analysis_summary, extracted_data = extract_analysis_and_kv_pairs(analysis_and_json_text)
    
    combined_analysis_kv = {
    "short_summary": short_summary,
    "detailed_analysis_summary": analysis_summary
    }


    try:
        peer_comparison_json = json.loads(peer_comparison_json_text)
    except Exception as e:
        logging.error(f"Failed to parse peer comparison JSON: {e}")
        peer_comparison_json = {}
    
    print(f"=== EXTRACTED ANALYSIS & DATA ===")
    # print(f"Analysis Summary Length: {len(analysis_summary)} chars")
    # print(f"Extracted KV Pairs: {extracted_data}")
    print(f"=== END EXTRACTION ===")
    
    # Store in database
    stored = False
    if startup_name and extracted_data:
        try:
            from app.dao import upsert_analysis_result
            upsert_analysis_result(
                gcs_key=relative_path,
                startup_name=startup_name,
                extracted_data=extracted_data,
                analysis_summary=combined_analysis_kv,
                files_processed=result.get("total_files_processed", 0),
                peer_comparison_table=peer_comparison_json
            )
            stored = True
            print("=== STORAGE SUCCESSFUL ===")
        except Exception as e:
            logging.error(f"Failed to store in database: {e}")
            print(f"=== STORAGE FAILED: {e} ===")
    
    response_time = round(time.time() - start_time, 3)
    
    return {
        "status": "success",
        "gcs_key": relative_path,
        "startup_name": startup_name,
        "extracted_data": extracted_data,
        "analysis_summary": combined_analysis_kv,
        "peer_comparison_table": peer_comparison_json,
        "files_processed": result.get("total_files_processed", 0),
        "files_info": result.get("files_processed", []),
        "stored_in_database": stored,
        "response_time_seconds": response_time
    }

def generate_chat_response(gcs_key: str, user_message: str) -> Dict[str, Any]:
    """Generate chatbot response using direct Gemini API with analysis summary and conversation history"""
    
    try:
        from app.chatbot_service import generate_chat_response_gemini
        return generate_chat_response_gemini(gcs_key, user_message)
        
    except Exception as e:
        logging.error(f"Error in chat response generation: {e}")
        return {
            "status": "error",
            "message": f"Failed to generate chat response: {str(e)}"
        }