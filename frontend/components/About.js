"use client";

import React from "react";
import styles from "./About.module.css"; // optional css module

export default function AboutPage() {
  return (
    <div className={styles.aboutContainer}>
      <h2 className={styles.title}>Welcome to Foresight AI</h2>
      <p className={styles.description}>
        Upload your pitch decks and startup details to generate automated
        insights, benchmarking, and summaries.
      </p>
      <p className={styles.description}>
        Use the right panel to submit your documents and start a new analysis.  
        Once an analysis is created or selected, you’ll see your personalized
        dashboard here.
      </p>
    </div>
  );
}
