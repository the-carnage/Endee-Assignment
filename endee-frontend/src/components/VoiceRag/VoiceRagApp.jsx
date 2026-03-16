import { useState, useRef, useEffect, useCallback } from "react";
import AppHeader from "./AppHeader";
import UploadZone from "./UploadZone";
import ConversationArea from "./ConversationArea";
import MicFooter from "./MicFooter";
import "./VoiceRag.css";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const VoiceRagApp = () => {
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    const saved = localStorage.getItem("endee_subtitles");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [docLoaded, setDocLoaded] = useState(() => {
    return localStorage.getItem("endee_docLoaded") === "true";
  });
  const [appStatus, setAppStatus] = useState(() => {
    const saved = localStorage.getItem("endee_appStatus");
    return saved || "idle";
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("endee_messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [docSummary, setDocSummary] = useState(() => {
    return localStorage.getItem("endee_docSummary") || "";
  });

  const audioPlayerRef = useRef(null);
  const appStatusRef = useRef(appStatus);
  const subtitlesRef = useRef(subtitlesEnabled);
  const messagesRef = useRef(messages);

  useEffect(() => {
    appStatusRef.current = appStatus;
  }, [appStatus]);
  useEffect(() => {
    subtitlesRef.current = subtitlesEnabled;
  }, [subtitlesEnabled]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const { isRecording, audioUrl, audioExt, startRecording, stopRecording } =
    useVoiceRecorder();

  const addMessage = useCallback((role, text) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => [...prev, { role, text, time }]);
  }, []);

  const processAudioRecording = useCallback(
    async (url) => {
      setAppStatus("processing");

      try {
        const response = await fetch(url);
        const audioBlob = await response.blob();

        const formData = new FormData();
        formData.append("audio", audioBlob, `recording.${audioExt}`);

        const recentHistory = messagesRef.current
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text }));
        formData.append("history", JSON.stringify(recentHistory));

        const apiRes = await fetch(`${API_URL}/query/voice`, {
          method: "POST",
          body: formData,
        });

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => null);
          const detail = errData?.detail || `Server returned ${apiRes.status}`;
          throw new Error(detail);
        }

        const data = await apiRes.json();

        if (subtitlesRef.current && data.transcript) {
          addMessage("user", data.transcript);
        }

        if (subtitlesRef.current && data.response) {
          addMessage("ai", data.response);
        }

        setAppStatus("ready");
      } catch (error) {
        console.error("Speech processing error:", error);
        if (subtitlesRef.current) {
          const msg = error.message?.includes("Failed to load audio")
            ? "Sorry, I couldn't process that audio. Please try recording again."
            : "Sorry, I had trouble processing your voice query. Please try again.";
          addMessage("ai", msg);
        }
        setAppStatus("ready");
      }
    },
    [addMessage],
  );

  useEffect(() => {
    localStorage.setItem("endee_subtitles", JSON.stringify(subtitlesEnabled));
  }, [subtitlesEnabled]);

  useEffect(() => {
    localStorage.setItem("endee_docLoaded", docLoaded);
  }, [docLoaded]);

  useEffect(() => {
    if (appStatus === "idle" || appStatus === "ready") {
      localStorage.setItem("endee_appStatus", appStatus);
    }
  }, [appStatus]);

  useEffect(() => {
    localStorage.setItem("endee_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("endee_docSummary", docSummary);
  }, [docSummary]);

  useEffect(() => {
    if (isRecording) {
      setAppStatus("recording");
    }
  }, [isRecording]);

  useEffect(() => {
    if (audioUrl && !isRecording && appStatusRef.current === "recording") {
      processAudioRecording(audioUrl);
    }
  }, [audioUrl, isRecording, processAudioRecording]);

  const handleMicClick = () => {
    if (!docLoaded) return;

    if (appStatus === "ready" || appStatus === "idle") {
      startRecording();
    } else if (appStatus === "recording") {
      stopRecording();
    }
  };

  const processTextQuery = useCallback(
    async (text) => {
      if (!text.trim() || !docLoaded) return;

      addMessage("user", text);
      setAppStatus("processing");

      try {
        const recentHistory = messagesRef.current
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text }));

        const apiRes = await fetch(`${API_URL}/query/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, history: recentHistory }),
        });

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => null);
          const detail = errData?.detail || `Server returned ${apiRes.status}`;
          throw new Error(detail);
        }

        const data = await apiRes.json();

        if (data.response) {
          addMessage("ai", data.response);
        }

        setAppStatus("ready");
      } catch (error) {
        console.error("Text query error:", error);
        addMessage("ai", "Sorry, I had trouble processing your query. Please try again.");
        setAppStatus("ready");
      }
    },
    [addMessage, docLoaded],
  );

  const handleClearData = async () => {
    try {
      await fetch(`${API_URL}/clear`, { method: "POST" });
    } catch (e) {
      console.error("Failed to clear backend DB", e);
    }

    localStorage.clear();
    window.location.replace(window.location.pathname);
  };

  return (
    <div className="voice-rag-root">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <div className="app-wrapper">
        <AppHeader
          subtitlesEnabled={subtitlesEnabled}
          setSubtitlesEnabled={setSubtitlesEnabled}
          onClearData={handleClearData}
        />

        <UploadZone
          onUploadComplete={(isSuccess, summary) => {
            setDocLoaded(isSuccess);
            if (isSuccess && summary) {
              setDocSummary(summary);
              if (subtitlesEnabled) {
                addMessage(
                  "ai",
                  `Document loaded successfully! Here is a quick summary:\n\n${summary}`,
                );
              }
            }
            if (isSuccess && appStatus === "idle") setAppStatus("ready");
          }}
        />

        <ConversationArea
          messages={messages}
          isThinking={appStatus === "processing"}
        />

        <MicFooter
          status={appStatus}
          docLoaded={docLoaded}
          onMicClick={handleMicClick}
          onTextSubmit={processTextQuery}
        />
      </div>

      <audio ref={audioPlayerRef} style={{ display: "none" }}></audio>
    </div>
  );
};

export default VoiceRagApp;
