"use client";

import React from "react";
import styles from "./BuzzMonitor.module.css";

export default function BuzzMonitor({ session }) {
  if (!session) {
    return (
      <div className={styles.placeholder}>
        <p>Select a startup session to monitor its buzz across news & social media.</p>
      </div>
    );
  }

  return (
    <div className={styles.placeholder}>
      <h2>📡 Buzz Monitor</h2>
      <p>
        Coming soon: Real-time tracking of news mentions, social media buzz, and
        sentiment analysis around the selected startup.
      </p>
    </div>
  );
}
