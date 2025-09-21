import { NextResponse } from "next/server";
import { CONFIG } from "@/config";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let rawPath = searchParams.get("path");
    let path = null;
    if (rawPath) {
      const parts = rawPath.split("/");
      path = parts.slice(0, 2).join("/");
    }
    const mode = searchParams.get("mode") || "new";

    if (!path) {
      return NextResponse.json(
        { message: "Missing required query param: path" },
        { status: 400 }
      );
    }

    // Call backend
    const response = await fetch(
      `${CONFIG.DASHBOARD_API_URL}/generate_summary?path=${encodeURIComponent(
        path
      )}&mode=${mode}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    // console.log("Dashboard API Response:", response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: "Failed to fetch dashboard data", error: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();
    // console.log("Dashboard API Result:", result);

    const extracted = result.extracted_data || {};

    // Group fields with Title Case + Emojis
    const groupedData = {
      Introduction: {
        "🏢 Company Name": extracted.company_name,
        "🔗 Website": extracted.website_url,
        "🏭 Industry": extracted.industry,
        "💰 Valuation": extracted.valuation,
        "📊 Funding Rounds": extracted.funding_rounds,
        "🏦 Type Of Funding": extracted.type_of_funding,
        "👤 Founders Info": extracted.founders_info,
        "👥 Number Of Employees": extracted.number_of_employees,
        "📍 Headquarters": extracted.headquarters,
        "⚙️ Business Model": extracted.business_model,
      },
      Financials: {
        "📈 Revenue": extracted.revenue,
        "🔁 ARR": extracted.arr,
        "💵 Profit": extracted.profit,
        "📉 Current Investors Stake": extracted.current_investors_stake,
        "🌍 TAM": extracted.tam,
        "⚠️ Liabilities": extracted.liabilities,
        "🎯 CAC": extracted.cac,
        "🔥 Burn Rate": extracted.burn_rate,
        "🛫 Runway": extracted.runway,
        "💳 Cash Reserve": extracted.cash_reserve,
        "⏳ Total Runway": extracted.total_runway,
        "🏗️ Fixed Assets": extracted.fixed_assets,
        "🛠️ Raw Materials Cost": extracted.raw_materials_cost,
        "📦 Inventory Cost": extracted.inventory_cost,
        "📢 Marketing Cost": extracted.marketing_cost,
        "⚙️ Operations Cost": extracted.operations_cost,
      },
      Risks: {
        "🚨 Risk Summary": extracted.risk_summary,
        "🏭 Operational Risks": extracted.operational_risks,
        "🙋 Customer Risks": extracted.customer_risks,
        "📊 Risk Gauge": extracted.risk_gauge,
        "ℹ️ Risk Gauge Reason": extracted.risk_gauge_reason,
      },
      "Growth Potential": {
        "🌱 Growth": extracted.growth,
        "🏙️ Expanding To Cities": extracted.expanding_to_cities,
        "⭐ USP": extracted.usp,
        "📊 Market Demand": extracted.market_demand,
        "🆕 New Products": extracted.new_products,
        "📜 Patents": extracted.patents,
        "💬 Customer Feedback": extracted.customer_feedback,
        "🚀 Innovation Rate": extracted.innovation_rate,
      },
    };

    return NextResponse.json({
      message: "Dashboard data fetched successfully",
      data: {
        startupName: result.startup_name,
        summary: result.analysis_summary.short_summary ,
        detailed_summary: result.analysis_summary.detailed_analysis_summary,
        peer_comparison_table: result.peer_comparison_table,
        extracted: groupedData,
        gcsKey: result.gcs_key,
        filesProcessed: result.files_processed,
        filesInfo: result.files_info,
        stored: result.stored_in_database,
        responseTime: result.response_time_seconds,
      },
    });
  } catch (err) {
    console.error("Dashboard API Error:", err);
    return NextResponse.json(
      { message: "Error fetching dashboard data", error: err.message },
      { status: 500 }
    );
  }
}
