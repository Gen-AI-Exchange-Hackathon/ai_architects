"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import StartupInputPanel from "@/components/StartupInputPanel";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import AboutPage from "@/components/About";
import LoadingOverlay from "@/components/LoadingOverlay";
import FounderDNA from "@/components/FounderDna";
import BuzzMonitor from "@/components/BuzzMonitor";

import { auth, db } from "../firebase-config";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisSessions, setAnalysisSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeView, setActiveView] = useState("about"); // 👈 default is about
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // ✅ Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Load sessions from Firestore
  useEffect(() => {
    if (!user) return;

    const sessionsRef = collection(db, "users", user.uid, "sessions");
    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const updatedSessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        files: Array.isArray(doc.data().files) ? doc.data().files : [],
      }));

      setAnalysisSessions(updatedSessions);

      if (
        selectedSession &&
        !updatedSessions.find((s) => s.id === selectedSession.id)
      ) {
        setSelectedSession(null);
        setDashboardData(null);
      }
    });

    return () => unsubscribe();
  }, [user, selectedSession]);

  // ✅ Auth actions
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code === "auth/cancelled-popup-request") {
        console.log("Sign-in popup cancelled or pending request exists.");
      } else {
        console.error("Error during sign-in:", error);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // ✅ New Analysis flow
  const handleNewAnalysis = async (startupData, uploadedFiles = []) => {
    if (!user) throw new Error("User not logged in");

    let activeSession = selectedSession;

    // 1️⃣ Create new Firestore session if needed
    if (!activeSession || activeSession.name !== startupData.name) {
      const sessionsCollectionRef = collection(
        db,
        "users",
        user.uid,
        "sessions"
      );
      const docRef = await addDoc(sessionsCollectionRef, {
        ...startupData,
        files: [],
        status: "in-progress",
        createdAt: new Date(),
      });
      activeSession = { id: docRef.id, ...startupData, files: [] };
      setSelectedSession(activeSession);
    }

    // 2️⃣ Upload files
    let uploadedPaths = [];
    if (uploadedFiles.length > 0) {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("sessionId", activeSession.id);
      formData.append("name", startupData.name);
      formData.append("website", startupData.website);
      formData.append("pitch", startupData.pitch);
      formData.append("targetMarket", startupData.targetMarket);

      uploadedFiles.forEach((item) => {
        if (item.file) formData.append("documents", item.file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();
      uploadedPaths = result.paths || [];

      const filesWithPaths = uploadedFiles.map((item, idx) => {
        const gcsPath = uploadedPaths[idx] || "#";
        const newFileName = gcsPath.split("/").pop() || item.name;

        return {
          name: newFileName,
          originalName: item.name,
          path: gcsPath,
        };
      });

      const sessionDocRef = doc(
        db,
        "users",
        user.uid,
        "sessions",
        activeSession.id
      );
      await updateDoc(sessionDocRef, {
        files: [...(activeSession.files || []), ...filesWithPaths],
      });

      activeSession = {
        ...activeSession,
        files: [...(activeSession.files || []), ...filesWithPaths],
      };
      setSelectedSession(activeSession);
    }

    // 3️⃣ Call Dashboard API
    try {
      setActiveView("dashboard"); // 👈 switch to dashboard
      const path = uploadedPaths[0] || activeSession.files?.[0]?.path;

      if (!path) {
        console.warn("No path available for dashboard analysis.");
        return activeSession;
      }

      const mode = uploadedFiles.length > 0 ? "new" : "read";

      setDashboardLoading(true);
      const dashboardRes = await fetch(
        `/api/dashboard?path=${encodeURIComponent(path)}&mode=${mode}`,
        { method: "GET" }
      );

      if (!dashboardRes.ok) {
        const errorData = await dashboardRes.json();
        console.error("Dashboard API error:", errorData);
        throw new Error(errorData.message || "Dashboard fetch failed");
      }

      const dashboardResult = await dashboardRes.json();

      activeSession = {
        ...activeSession,
        analysis: dashboardResult.data,
        status: "completed",
      };

      setSelectedSession(activeSession);
      setDashboardData(dashboardResult.data);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setDashboardLoading(false);
    }

    return activeSession;
  };

  // ✅ Always fetch dashboard when selecting session
  const handleSessionSelect = async (session) => {
    setActiveView("dashboard"); // 👈 switch to dashboard
    setSelectedSession(session);
    setDashboardData(null);

    if (!session?.files?.length) return;

    try {
      const path = session.files[0].path;

      setDashboardLoading(true);
      const dashboardRes = await fetch(
        `/api/dashboard?path=${encodeURIComponent(path)}&mode=read`,
        { method: "GET" }
      );

      if (!dashboardRes.ok) {
        const errorData = await dashboardRes.json();
        console.error("Dashboard API error:", errorData);
        throw new Error(errorData.message || "Dashboard fetch failed");
      }

      const dashboardResult = await dashboardRes.json();
      setDashboardData(dashboardResult.data);
    } catch (err) {
      console.error("Dashboard fetch failed (read mode):", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  if (loading) return <div className="loading-state">Loading...</div>;
  if (!user) return <LoginPage onSignIn={handleSignIn} />;

  return (
    <div className="app-container">
      <Sidebar
        user={user}
        onSignOut={handleSignOut}
        sessions={analysisSessions}
        onSelectSession={handleSessionSelect}
        selectedSession={selectedSession}
        activeView={activeView}
        setActiveView={setActiveView}
      />
      <>
        {activeView === "about" && !selectedSession && (
          <div className="chat">
            <AboutPage />
          </div>
        )}
        {activeView === "chat" && (
          <div className="chat">
            <ChatWindow session={selectedSession} />
          </div>
        )}
        {activeView === "dashboard" && (
          <div className="chat" style={{ position: "relative", minHeight: "100%" }}>
            {dashboardLoading ? (
              <LoadingOverlay message="Loading Dashboard..." />
            ) : (
              <Dashboard
                user={user}
                sessions={analysisSessions}
                selectedSession={selectedSession}
                dashboardData={dashboardData}
                loading={dashboardLoading}
              />
            )}
          </div>
        )}
        {activeView === "founderDNA" && (
          <div className="chat">
            <FounderDNA session={selectedSession} />
          </div>
        )}
        {activeView === "buzzMonitor" && (
          <div className="chat">
            <BuzzMonitor session={selectedSession} />
          </div>
        )}
        <div className="input-panel-container">
          <StartupInputPanel
            onNewAnalysis={handleNewAnalysis}
            selectedSession={selectedSession}
            user={user}
          />
        </div>
      </>

    </div>
  );
}
