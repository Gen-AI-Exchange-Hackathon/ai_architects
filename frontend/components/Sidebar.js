"use client";

import React, { useState } from "react";
import Image from "next/image";
import styles from "./Sidebar.module.css";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase-config";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Activity,
  Send,
  LogOut,
} from "lucide-react"; // ✅ icons

export default function Sidebar({
  user,
  onSignOut,
  sessions,
  onSelectSession,
  selectedSession,
  activeView,
  setActiveView,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState(null);
  const [founderEmail, setFounderEmail] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const userName = user?.displayName || "User";
  const userPhoto = user?.photoURL
    ? user.photoURL
    : "https://via.placeholder.com/150";

  const handleSelectSession = (session) => {
    onSelectSession(session);
  };

  const handleDeleteSessionClick = (sessionId, e) => {
    e.stopPropagation();
    setSessionToDeleteId(sessionId);
    setShowConfirmModal(true);
  };

  const confirmDeletion = async () => {
    if (!sessionToDeleteId || !user) return cancelDeletion();

    try {
      const docRef = doc(db, `users/${user.uid}/sessions`, sessionToDeleteId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session. Please try again.");
    } finally {
      setSessionToDeleteId(null);
      setShowConfirmModal(false);
    }
  };

  const cancelDeletion = () => {
    setShowConfirmModal(false);
    setSessionToDeleteId(null);
  };

  const handleSendMeetingDetails = async () => {
    if (!founderEmail || !meetingDate || !meetingTime) {
      alert("Please fill in all fields");
      return;
    }

    if (!selectedSession) {
      alert("Please select a startup session first");
      return;
    }

    alert("Meeting scheduling feature is currently under development.");
    setFounderEmail("");
    setMeetingDate("");
    setMeetingTime("");
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.profileInfo}>
        <Image
          src={userPhoto}
          alt="User Avatar"
          className={styles.avatar}
          width={40}
          height={40}
        />
        <span className={styles.username}>{userName}</span>
      </div>

      <div className={styles.sidebarBody}>
        <nav className={styles.mainNav}>
          <ul>
            <li
              className={`${styles.navItem} ${
                activeView === "dashboard" ? styles.active : ""
              }`}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={() => setActiveView("dashboard")}
              >
                <LayoutDashboard size={18} className={styles.icon} />
                Dashboard
              </button>
            </li>
            <li
              className={`${styles.navItem} ${
                activeView === "chat" ? styles.active : ""
              }`}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={() => setActiveView("chat")}
              >
                <MessageSquare size={18} className={styles.icon} />
                Chat
              </button>
            </li>
            <li
              className={`${styles.navItem} ${
                activeView === "founderDNA" ? styles.active : ""
              }`}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={() => setActiveView("founderDNA")}
              >
                <Users size={18} className={styles.icon} />
                Founder DNA
              </button>
            </li>
            <li
              className={`${styles.navItem} ${
                activeView === "buzzMonitor" ? styles.active : ""
              }`}
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={() => setActiveView("buzzMonitor")}
              >
                <Activity size={18} className={styles.icon} />
                Buzz Monitor
              </button>
            </li>
          </ul>
        </nav>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search analysis..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.chatHistory}>
          <h3 className={styles.historyTitle}>Analysis History</h3>
          <ul className={styles.historyList}>
            {sessions.length === 0 && (
              <li className={styles.emptyMessage}>No sessions yet.</li>
            )}
            {sessions.map((session) => (
              <li
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className={`${styles.historyItem} ${
                  selectedSession?.id === session.id ? styles.active : ""
                }`}
              >
                <div className={styles.historyItemContent}>
                  <h4 className={styles.historyItemName}>{session.name}</h4>
                  <span className={styles.fileCount}>
                    {session.files?.length || 0}{" "}
                    {session.files?.length === 1 ? "file" : "files"}
                  </span>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDeleteSessionClick(session.id, e)}
                  title="Delete Session"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.meetingForm}>
          <h4 className={styles.formTitle}>Schedule Meeting</h4>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Founder&apos;s Email</label>
            <input
              type="email"
              value={founderEmail}
              onChange={(e) => setFounderEmail(e.target.value)}
              placeholder="founder@startup.com"
              className={styles.formInput}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Date</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Time</label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className={styles.formInput}
              />
            </div>
          </div>

          <button
            onClick={handleSendMeetingDetails}
            className={styles.sendButton}
            disabled={!founderEmail || !meetingDate || !meetingTime}
          >
            <Send size={16} className={styles.icon} />
            Send Meeting Details
          </button>
        </div>

        <button onClick={onSignOut} className={styles.inviteButton}>
          <LogOut size={16} className={styles.icon} />
          Sign Out
        </button>
      </div>

      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <p className={styles.modalMessage}>
              Are you sure you want to delete this session?
            </p>
            <div className={styles.modalActions}>
              <button
                className={`${styles.modalButton} ${styles.confirmButton}`}
                onClick={confirmDeletion}
              >
                Yes, Delete
              </button>
              <button
                className={`${styles.modalButton} ${styles.cancelButton}`}
                onClick={cancelDeletion}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
