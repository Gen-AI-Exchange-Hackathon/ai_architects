"use client";

import React, { useRef, useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
} from "recharts";

const TABS = [
  "🏢 Introduction",
  "💰 Financials",
  "⚠️ Risks",
  "🚀 Growth Potential",
  "📊 Peer Benchmarking",
];

export default function Dashboard({ user, dashboardData, loading }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [showDetailed, setShowDetailed] = useState(false);

  // Section refs
  const sectionRefs = {
    "🏢 Introduction": useRef(null),
    "💰 Financials": useRef(null),
    "⚠️ Risks": useRef(null),
    "🚀 Growth Potential": useRef(null),
    "📊 Peer Benchmarking": useRef(null),
  };

  // Handle click → scroll to section
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    sectionRefs[tab].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ✅ Detect scroll position & update activeTab
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first section that's visible
        const visibleSection = entries.find((entry) => entry.isIntersecting);
        if (visibleSection) {
          const tab = TABS.find(
            (t) => sectionRefs[t].current === visibleSection.target
          );
          if (tab) setActiveTab(tab);
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -70% 0px", // ✅ triggers earlier (top 30% of screen)
        threshold: 0.2, // section must be 20% visible
      }
    );

    // Observe all sections
    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const renderFields = (group) => {
    if (!group || Object.keys(group).length === 0) {
      return <p>No data available.</p>;
    }
    return (
      <div className={styles.extractedGrid}>
        {Object.entries(group).map(([key, value]) => {
          if (key === "📊 Risk Gauge" || key === "ℹ️ Risk Gauge Reason") {
            return null; // handled separately
          }
          return (
            <React.Fragment key={key}>
              <div className={styles.extractedItemKey}>{key}</div>
              <div className={styles.extractedItemValue}>
                {value && value !== "Not specified" ? String(value) : "—"}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const extracted = dashboardData?.extracted || {};

  // 🔹 If no data at all, show empty state
  if (!dashboardData || Object.keys(dashboardData).length === 0) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.placeholder}>
          <p>
            Select a startup from the sidebar to view its analysis, or start a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* 🔹 Loading Overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      )}

      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h2>Welcome, {user?.displayName || "User"}</h2>
        </div>

        {/* Tabs */}
        <nav className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Sections */}
        <main className={styles.content}>
          {/* INTRODUCTION */}
          <section ref={sectionRefs["🏢 Introduction"]} className={styles.section}>
            <h3>🏢 Introduction</h3>
            <div className={styles.extractedGrid}>
              <div className={styles.extractedItemKey}>🏢 Startup Name</div>
              <div className={styles.extractedItemValue}>
                {dashboardData.startupName || "—"}
              </div>

              <div className={styles.extractedItemKey}>🔗 Website</div>
              <div className={styles.extractedWebsite}>
                {extracted.Introduction?.["🔗 Website"] ? (
                  <a
                    href={extracted.Introduction["🔗 Website"]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {extracted.Introduction["🔗 Website"]}
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>

            {/* 🔹 Summary / Detailed Summary Toggle */}
            {dashboardData.detailed_summary ? (
              <>
                {!showDetailed ? (
                  <>
                    <p className={styles.Summary}>
                      {dashboardData.summary || "No summary available."}
                    </p>
                    <div className={styles.summaryRow}>
                      <button
                        className={styles.inviteButton}
                        onClick={() => setShowDetailed(true)}
                      >
                        Read More
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.Summary}>
                      {dashboardData.detailed_summary}
                    </p>
                    <div className={styles.summaryRow}>
                      <button
                        className={styles.inviteButton}
                        onClick={() => setShowDetailed(false)}
                      >
                        Show Less
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className={styles.introSummary}>
                {dashboardData.summary || "No summary available."}
              </p>
            )}

            {/* Other intro fields */}
            {renderFields(extracted.Introduction)}
          </section>

          {/* FINANCIALS */}
          <section ref={sectionRefs["💰 Financials"]} className={styles.section}>
            <h3>💰 Financials</h3>
            {renderFields(extracted.Financials)}
          </section>

          {/* RISKS */}
          <section ref={sectionRefs["⚠️ Risks"]} className={styles.section}>
            <h3>⚠️ Risks</h3>
            {renderFields(extracted.Risks)}

            {/* Risk Gauge Chart */}
            {extracted.Risks?.["📊 Risk Gauge"] ? (
              <div className={styles.gaugeContainer}>
                <div className={styles.gaugeChart}>
                  <h4 className={styles.gaugeTitle}>📊 Risk-o-meter</h4>

                  <div className={styles.gaugeWrapper}>
                    <RadialBarChart
                      width={260}
                      height={180}
                      cx="50%"
                      cy="100%"
                      innerRadius="70%"
                      outerRadius="110%"
                      barSize={22}
                      startAngle={180}
                      endAngle={0}
                      data={[
                        {
                          name: "Risk",
                          value: Number(extracted.Risks["📊 Risk Gauge"]),
                          fill:
                            Number(extracted.Risks["📊 Risk Gauge"]) <= 2
                              ? "#22c55e"
                              : Number(extracted.Risks["📊 Risk Gauge"]) <= 3.5
                                ? "#facc15"
                                : "#ef4444",
                        },
                      ]}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, 5]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar minAngle={15} clockWise dataKey="value" cornerRadius={10} />
                    </RadialBarChart>

                    <div className={styles.gaugeScore}>
                      <span>{extracted.Risks["📊 Risk Gauge"]} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className={styles.gaugeReason}>
                  <h4>Reason</h4>
                  <p>
                    {extracted.Risks["ℹ️ Risk Gauge Reason"] || "No reason provided."}
                  </p>
                </div>
              </div>
            ) : (
              <p>No risk gauge data available.</p>
            )}
          </section>



          {/* GROWTH POTENTIAL */}
          <section ref={sectionRefs["🚀 Growth Potential"]} className={styles.section}>
            <h3>🚀 Growth Potential</h3>
            {renderFields(extracted["Growth Potential"])}
          </section>

          {/* PEER BENCHMARKING */}
          <section ref={sectionRefs["📊 Peer Benchmarking"]} className={styles.section}>
            <h3>📊 Peer to Peer Benchmarking</h3>
            {dashboardData?.peer_comparison_table?.comparison ? (
              <div className={styles.tableWrapper}>
                <table className={styles.peerTable}>
                  <thead>
                    <tr>
                      {dashboardData.peer_comparison_table.comparison.columns.map(
                        (col, idx) => (
                          <th key={idx}>{col}</th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.peer_comparison_table.comparison.companies.map(
                      (company, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={
                            company["Company"] === dashboardData.startupName
                              ? styles.highlightRow
                              : ""
                          }
                        >
                          {dashboardData.peer_comparison_table.comparison.columns.map(
                            (col, colIdx) => (
                              <td key={colIdx}>
                                {company[col] && company[col] !== "Not specified"
                                  ? company[col]
                                  : "—"}
                              </td>
                            )
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No peer benchmarking data available.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
