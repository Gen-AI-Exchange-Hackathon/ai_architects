"use client";

import React from "react";
import styles from "./FounderDna.module.css";

export default function FounderDNA({ session }) {
  if (!session) {
    return (
      <div className={styles.placeholder}>
        <p>Select a startup session to analyze the founder DNA.</p>
      </div>
    );
  }

  return (
    <div className={styles.placeholder}>
      <h2>🧬 Founder DNA Analyzer</h2>
      <p>
        Coming soon: AI-powered insights into founder personality, grit, and
        leadership style based on pitch deck, market approach, and founder
        profiles.
      </p>
    </div>
  );
}
