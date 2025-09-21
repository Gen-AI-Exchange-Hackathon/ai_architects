import React from "react";
import styles from "./LoadingOverlay.module.css";

export default function LoadingOverlay({ message }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.loaderBox}>
        <div className={styles.spinner}></div>
        <p>{message}</p>
      </div>
    </div>
  );
}
