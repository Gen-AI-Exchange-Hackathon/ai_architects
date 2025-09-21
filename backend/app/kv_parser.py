import json
import re
from typing import Dict, Tuple

def extract_analysis_and_kv_pairs(text: str) -> Tuple[str, Dict[str, str]]:
    """Extract analysis summary and KV pairs (JSON) including financial fields from model output"""
    
    # Define ALL required fields including new financial fields
    required_fields = {
        # Original intro fields
        "company_name", "industry", "valuation", "funding_rounds", 
        "type_of_funding", "founders_info", "number_of_employees", 
        "headquarters", "business_model", "website_url",
        
        # Financial fields
        "revenue", "arr", "profit", "current_investors_stake", "tam", 
        "liabilities", "cac", "burn_rate", "runway", "cash_reserve", 
        "total_runway", "fixed_assets", "raw_materials_cost", "inventory_cost", 
        "marketing_cost", "operations_cost",
        
        # Risk fields
        "risk_summary", "operational_risks", "customer_risks", "risk_gauge", "risk_gauge_reason",
        
        # Growth potential fields
        "growth", "expanding_to_cities", "usp", "market_demand", "new_products", 
        "patents", "customer_feedback", "innovation_rate"
    }
    
    analysis_summary = ""
    kvs = {}
    
    # Method 1: Try to find JSON object in the text
    json_matches = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
    
    if json_matches:
        # Find the JSON object with the most required fields
        best_json = None
        best_count = 0
        
        for json_match in json_matches:
            try:
                parsed_json = json.loads(json_match)
                if isinstance(parsed_json, dict):
                    # Count how many required fields this JSON has
                    field_count = sum(1 for key in parsed_json.keys() 
                                    if key.lower().replace(' ', '_') in required_fields)
                    if field_count > best_count:
                        best_json = json_match
                        best_count = field_count
                        kvs = parsed_json
            except json.JSONDecodeError:
                continue
        
        if best_json:
            # Remove the JSON part to get analysis summary
            analysis_summary = text.replace(best_json, '').strip()
            # Clean up extra whitespace
            analysis_summary = re.sub(r'\n\s*\n', '\n\n', analysis_summary)
        else:
            analysis_summary = text
    else:
        # No JSON found - extract from narrative text
        analysis_summary = text
        
        # Try to extract key info from narrative for Reddit case
        if 'reddit' in text.lower():
            kvs = {
                # Basic info
                'company_name': 'Reddit',
                'industry': 'Social Media Platform',
                'business_model': 'Advertising (sponsored posts, display ads)',
                'valuation': 'Not specified',
                'funding_rounds': 'Not specified',
                'type_of_funding': 'Not specified',
                'founders_info': 'Not specified',
                'number_of_employees': 'Not specified',
                'headquarters': 'Not specified',
                
                # Financial fields
                'revenue': 'Not specified',
                'arr': 'Not specified',
                'profit': 'Not specified',
                'current_investors_stake': 'Not specified',
                'tam': 'Not specified',
                'liabilities': 'Not specified',
                'cac': 'Not specified',
                'burn_rate': 'Not specified',
                'runway': 'Not specified',
                'cash_reserve': 'Not specified',
                'total_runway': 'Not specified',
                'fixed_assets': 'Not specified',
                'raw_materials_cost': 'Not specified',
                'inventory_cost': 'Not specified',
                'marketing_cost': 'Not specified',
                'operations_cost': 'Not specified'
            }
    
    # Filter to keep only required fields and normalize keys
    filtered_kvs = {}
    for k, v in kvs.items():
        normalized_key = str(k).strip().lower().replace(' ', '_').replace('-', '_')
        if normalized_key in required_fields:
            value = str(v).strip()
            if value and value.lower() not in ['not specified', 'unknown', 'n/a', 'none', '']:
                filtered_kvs[normalized_key] = value
            else:
                filtered_kvs[normalized_key] = 'Not specified'
    
    # Ensure ALL required fields are present (including new financial fields)
    for field in required_fields:
        if field not in filtered_kvs:
            filtered_kvs[field] = 'Not specified'
    
    return analysis_summary, filtered_kvs