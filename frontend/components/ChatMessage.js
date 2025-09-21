// ChatMessage.jsx
import React from "react";
import styles from "./ChatMessage.module.css";

export default function ChatMessage({ role, text }) {
  return (
    <div
      className={`${styles.chatMessage} ${
        role === "user" ? styles.user : styles.ai
      }`}
    >
      <p>{text}</p>
    </div>
  );
}
