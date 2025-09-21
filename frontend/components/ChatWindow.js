"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./ChatWindow.module.css";
import ChatMessage from "./ChatMessage";
import { Mic, Send, X, Square } from "lucide-react";

export default function ChatWindow({ session }) {
  const [fileUrls, setFileUrls] = useState({});
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const recognitionRef = useRef(null);
  const silenceTimer = useRef(null);
  const isRecordingRef = useRef(false);


  const getGcsKey = () => {
    if (session?.files?.length > 0) {
      const firstFile = session.files.find(f => f.path && f.path !== "#");
      if (firstFile?.path) {
        const pathParts = firstFile.path.split("/");

        return pathParts.slice(0, 2).join("/");
      }
    }
    return session?.id || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const gcsKey = getGcsKey();
    if (!gcsKey) {
      setMessages([]);
      return;
    }
    loadChatHistory();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session?.files) return;

    const fetchSignedUrls = async () => {
      const urls = {};
      for (const file of session.files) {
        if (!file?.path || file.path === "#") continue;
        try {
          const res = await fetch(
            `/api/get-signed-url?path=${encodeURIComponent(file.path)}`
          );
          if (res.ok) {
            const data = await res.json();
            urls[file.path] = data.url;
          } else {
            urls[file.path] = "#";
          }
        } catch {
          urls[file.path] = "#";
        }
      }
      setFileUrls(urls);
    };

    fetchSignedUrls();
  }, [session]);

  const loadChatHistory = async () => {
    const gcsKey = getGcsKey();
    if (!gcsKey) return;
    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/chat/history?gcs_key=${encodeURIComponent(gcsKey)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && data.messages) {
          setMessages(
            data.messages.map(msg => ({
              role: msg.sender === "user" ? "user" : "ai",
              text: msg.message,
              timestamp: msg.timestamp,
            }))
          );
        }
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async messageText => {
    const gcsKey = getGcsKey();
    if (!messageText.trim() || !gcsKey || isSending) return;
  
    const userMessage = {
      role: "user",
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
    };
  
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
  
    const tempId = Date.now();
    setMessages(prev => [
      ...prev,
      { role: "ai", text: "Thinking...", id: tempId },
    ]);
  
    try {
      const response = await fetch(
        `/api/chat/message?gcs_key=${encodeURIComponent(
          gcsKey
        )}&message=${encodeURIComponent(messageText.trim())}`,
        { method: "POST" }
      );
  
      if (response.ok) {
        const data = await response.json();
  
        let aiText =
          data.bot_response ||
          data.response?.response ||
          data.response ||
          data.message ||
          JSON.stringify(data);
  
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId ? { role: "ai", text: aiText } : msg
          )
        );
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            text: "Failed to get response from server. Please try again.",
          },
        ]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          text: `Sorry, I encountered an error: ${err.message}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };
  

  const handleSubmit = e => {
    e.preventDefault();
    if (input.trim()) sendMessage(input.trim());
  };

  const handleKeyPress = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  if (!session)
    return (
      <div className={styles.placeholder}>
        <p>Select a startup from the sidebar to view its analysis, or start a new one.</p>
      </div>
    );

  return (
    <div className={styles.chatWindow}>
      <h2 className={styles.chatTitle}>{session.name} Analysis</h2>

      <div className={styles.chatMessages}>
        {isLoading ? (
          <ChatMessage role="ai" text="Loading chat history..." />
        ) : messages.length === 0 ? (
          <ChatMessage
            role="ai"
            text="Your analysis is ready! You can now ask questions about the uploaded documents or request a general summary."
          />
        ) : (
          messages.map((message, index) => (
            <ChatMessage key={index} role={message.role} text={message.text} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.chatInput}>
        <input
          type="text"
          placeholder="Write your request..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || !input.trim()}>
          <Send size={20} />
        </button>
        <button type="button" onClick={() => toggleRecording()} disabled={isSending}>
          {isRecording ? <X size={20} /> : <Mic size={20} />}
        </button>
      </form>
    </div>
  );
}
