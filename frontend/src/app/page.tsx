"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import StreamingAvatar, { AvatarQuality, VoiceEmotion, TaskType } from "@heygen/streaming-avatar";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", name: "Hindi", label: "Hindi (हिंदी)" },
  { code: "te-IN", name: "Telugu", label: "Telugu (తెలుగు)" },
  { code: "ta-IN", name: "Tamil", label: "Tamil (தமிழ்)" },
  { code: "ml-IN", name: "Malayalam", label: "Malayalam (മലയാളം)" },
  { code: "kn-IN", name: "Kannada", label: "Kannada (ಕನ್ನಡ)" },
  { code: "bn-IN", name: "Bengali", label: "Bengali (বাংলা)" },
  { code: "gu-IN", name: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { code: "mr-IN", name: "Marathi", label: "Marathi (मराठी)" },
  { code: "pa-IN", name: "Punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "or-IN", name: "Odia", label: "Odia (ଓଡ଼ିଆ)" },
  { code: "en-IN", name: "English", label: "English" },
];

type AppStatus =
  | "disconnected"
  | "connected"
  | "listening"
  | "processing"
  | "transcribed"
  | "generating_audio"
  | "connecting"
  | "speaking"
  | "error";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function base64ToUrl(b64: string): string {
  return `data:audio/mpeg;base64,${b64}`;
}

function statusLabel(s: AppStatus): string {
  const map: Record<AppStatus, string> = {
    disconnected:      "Disconnected",
    connected:         "Connected — Ready",
    listening:         "🎙️ Listening...",
    processing:        "Processing Audio...",
    transcribed:       "Transcribed",
    generating_audio:  "🎵 Generating Voice...",
    connecting:        "🌐 Connecting to Avatar Stream...",
    speaking:          "🗣️ Sadhya is Speaking",
    error:             "Error",
  };
  return map[s] ?? s;
}

function statusColor(s: AppStatus) {
  if (s === "connected")                                return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (s === "listening")                                return "text-red-400    border-red-500/30    bg-red-500/10";
  if (s === "speaking")                                 return "text-blue-400   border-blue-500/30   bg-blue-500/10";
  if (["generating_audio","processing"].includes(s))    return "text-amber-400  border-amber-500/30  bg-amber-500/10";
  if (s === "error")                                    return "text-rose-400   border-rose-500/30   bg-rose-500/10";
  return "text-gray-400 border-gray-500/30 bg-gray-500/10";
}


// ─────────────────────────────────────────────────────────────
// Avatar Display (photo + video overlay)
// ─────────────────────────────────────────────────────────────
interface AvatarDisplayProps {
  photoUrl: string | null;
  audioUrl: string | null;
  remoteStream: MediaStream | null;
  status:   AppStatus;
  onSpeakEnd: () => void;
}

function AvatarDisplay({ photoUrl, audioUrl, remoteStream, status, onSpeakEnd }: AvatarDisplayProps) {
  const isSpeaking   = status === "speaking";
  const isListening  = status === "listening";
  const isGenerating = ["generating_audio","processing"].includes(status);

  return (
    <div className={`avatar-display ${isSpeaking ? "avatar-display--speaking" : ""} ${isListening ? "avatar-display--listening" : ""}`}>
      {/* Glow ring */}
      <div className={`avatar-glow ${isSpeaking ? "avatar-glow--on" : ""} ${isListening ? "avatar-glow--listen" : ""}`} />

      {/* Main media area */}
      <div className="avatar-media">
        {/* Loading spinner overlay while generating */}
        {isGenerating && (
          <div className="avatar-loading-overlay">
            <div className="avatar-spinner" />
            <span className="avatar-spinner-label">{statusLabel(status)}</span>
          </div>
        )}

        {/* REAL-TIME STREAM */}
        {remoteStream ? (
          <video
            ref={(el) => { if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream; }}
            autoPlay
            playsInline
            poster="/farmer.png"
            className={`avatar-video ${status === "speaking" ? "avatar-video--active" : "avatar-video--idle"}`}
          />
        ) : photoUrl ? (
          /* Static photo (default / fallback) */
          <img
            src={photoUrl}
            alt="Avatar"
            className={`avatar-photo ${isSpeaking ? "avatar-photo--speaking" : ""}`}
          />
        ) : (
          <div className="avatar-placeholder">
            <span className="avatar-placeholder-icon">👨‍🌾</span>
            <p className="avatar-placeholder-text">Sadhya AI Mentor<br/>Initializing Avatar...</p>
          </div>
        )}

        {/* Hidden audio element (fallback when no video) */}
        {audioUrl && (
          <audio
            key={audioUrl}
            src={audioUrl}
            autoPlay
            onEnded={onSpeakEnd}
            className="hidden"
          />
        )}

        {/* Speaking sound-wave bars */}
        {isSpeaking && (
          <div className="avatar-waves">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="avatar-wave-bar" style={{ animationDelay: `${i * 0.09}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Footer label */}
      <div className="avatar-label">
        <span className={`avatar-name ${isSpeaking ? "avatar-name--speaking" : ""}`}>
          {isSpeaking   ? "🗣️ Sadhya is Speaking..."
          : isListening  ? "👂 Listening to you..."
          : isGenerating ? statusLabel(status)
          : "Sadhya AI — Ready"}
        </span>
        {!remoteStream && <span className="avatar-name-sub">Connecting to Video Stream...</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const sessionId = useId().replace(/:/g, "");

  const [status,     setStatus]     = useState<AppStatus>("disconnected");
  const [language,   setLanguage]   = useState(SUPPORTED_LANGUAGES[1]); // Default to Telugu
  const [transcript, setTranscript] = useState("");
  const [response,   setResponse]   = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [photoUrl,   setPhotoUrl]   = useState<string | null>("/farmer.png");
  const [audioUrl,   setAudioUrl]   = useState<string | null>(null);
  const [heygenOk,   setHeygenOk]   = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef            = useRef<WebSocket | null>(null);
  const reconnectRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Streaming State
  const [remoteStream,setRemoteStream] = useState<MediaStream | null>(null);

  // HeyGen for Streaming
  const heygenAvatarRef = useRef<StreamingAvatar | null>(null);
  const [heygenSessionId, setHeygenSessionId] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  // ── WebSocket ───────────────────────────────────────────────
  const connectWS = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:8000";
    
    // Add language info to URL
    const urlParams = new URLSearchParams({
      session_id: sessionId,
      language_code: language.code,
      language_name: language.name
    });
    
    if (heygenSessionId) {
      urlParams.append("heygen_session_id", heygenSessionId);
    }

    const url = `${wsUrl}/ws/audio?${urlParams.toString()}`;
    console.log(`[WebSocket] Connecting to: ${url}`);
    
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);

      if (data.status === "processing")        { setStatus("processing"); }
      else if (data.status === "transcribed")  { setTranscript(data.text ?? ""); setStatus("transcribed"); }
      else if (data.status === "ai_response")  { setResponse(data.text ?? ""); }
      else if (data.status === "generating_audio") { setStatus("generating_audio"); }
      else if (data.status === "complete") {
        if (data.mode === "heygen") {
            console.log(`[${sessionId}] HeyGen response ready.`);
            setStatus("speaking");
        } else {
            console.log(`[${sessionId}] Fallback audio ready.`);
            setAudioUrl(data.audio_base64 ? base64ToUrl(data.audio_base64) : null);
            setStatus("speaking");
        }
      }
      else if (data.status === "error") {
        setErrorMsg(data.message ?? "Unknown error");
        setStatus("error");
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      reconnectRef.current = setTimeout(connectWS, 3000);
    };
    ws.onerror = () => { setStatus("error"); setErrorMsg("WebSocket error — retrying..."); };
  }, [sessionId, heygenSessionId, language]);

  const initHeygenStream = useCallback(async () => {
    if (!heygenOk) return;
    try {
      console.log("Initializing HeyGen Stream...");
      setStatus("connecting");
      // 1. Get token from backend
      const res = await fetch(`${backendUrl}/heygen/token`, { method: "POST" });
      const token = await res.json();

      // 2. Initialize SDK
      const avatar = new StreamingAvatar({ token });
      heygenAvatarRef.current = avatar;

      // 3. Start session
      const sessionData = await avatar.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: "Arash", // Common public male avatar ID
        // Voice is omitted. HeyGen will default to Arash's native male voice
        // which natively supports multilingual streaming tasks.
      });
      
      setHeygenSessionId(sessionData.session_id);

      avatar.on("stream_ready", (event) => {
        setRemoteStream(event.detail);
      });

      avatar.on("stream_disconnected", () => {
        setRemoteStream(null);
        setHeygenSessionId(null);
      });

      console.log("HeyGen Stream established");
      setStatus("connected");
    } catch (err: any) {
      console.error("Failed to init HeyGen stream:", err);
      // Display the actual error message to help troubleshooting
      let msg = "HeyGen connection failed";
      if (typeof err === "string") msg = err;
      else if (err?.message) msg = err.message;
      else if (typeof err === "object") msg = JSON.stringify(err);
      
      setErrorMsg(`HeyGen Stream error: ${msg}. If this persists, please verify your HeyGen Streaming Credits and API Key.`);
      setStatus("connected"); 
    }
  }, [heygenOk, backendUrl]);

  // Check health / config
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/health`);
      const data = await res.json();
      setHeygenOk(!!data.heygen_configured);
    } catch {
      setHeygenOk(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    connectWS();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
      if (heygenAvatarRef.current) {
        heygenAvatarRef.current.stopAvatar();
        heygenAvatarRef.current = null;
      }
    };
  }, [connectWS]);

  // Re-connect when language changes
  useEffect(() => {
    console.log(`[Language Change] Switching to ${language.name} (${language.code})`);
    setTranscript("");
    setResponse("");
    if (wsRef.current) {
      console.log("[WebSocket] Closing current connection to switch language...");
      wsRef.current.close();
    }
  }, [language]);

  // Initial sequence
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Once health is confirmed, init stream
  useEffect(() => {
    if (heygenOk && !heygenSessionId) {
        initHeygenStream();
    }
  }, [heygenOk, heygenSessionId, initHeygenStream]);

  // ── Recording ──────────────────────────────────────────────
  const handleStartTalking = async () => {
    if (status === "disconnected") return;
    setTranscript("");
    setResponse("");
    setErrorMsg("");
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.addEventListener("dataavailable", (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      });

      mr.start();
      setIsRecording(true);
      setStatus("listening");
    } catch {
      setStatus("error");
      setErrorMsg("Microphone access denied");
    }
  };

  const handleStopTalking = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    setStatus("processing");
  };

  const handleSpeakEnd = () => setStatus("connected");

  const isBusy = status === "speaking" || ["generating_audio","processing"].includes(status);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="page-root">
      <div className="page-bg" />
      <div className="page-grid" />

      <div className="page-inner">
        {/* ── Header ── */}
        <header className="page-header">
          <div className="logo">
            <span className="logo-icon">🌾</span>
            <div>
              <h1 className="logo-title">Sadhya AI Mentor</h1>
              <p className="logo-sub">Real-time AI Agronomist Avatar · Multi-Language · v1.1.0</p>
            </div>
          </div>
          <div className="header-right">
            <span className={`badge ${statusColor(status)}`}>
              <span className="badge-dot" />{statusLabel(status)}
            </span>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="page-main">

          {/* ── Avatar Panel ── */}
          <section className="panel panel--avatar">
            <AvatarDisplay
              photoUrl={photoUrl}
              audioUrl={audioUrl}
              remoteStream={remoteStream}
              status={status}
              onSpeakEnd={handleSpeakEnd}
            />
          </section>

          {/* ── Controls Panel ── */}
          <section className="panel panel--controls">

            {/* Language Selector */}
            <div className="language-selector" style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="language-select" style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>Select Language:</label>
              <select 
                id="language-select"
                value={language.code}
                onChange={(e) => {
                  const selected = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                  if (selected) setLanguage(selected);
                }}
                disabled={isRecording || isBusy}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  color: "white",
                  outline: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} style={{ background: "#1a1a2e", color: "white" }}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mic button */}
            <div className="mic-section">
              {isRecording && (
                <>
                  <div className="ripple ripple-1" />
                  <div className="ripple ripple-2" />
                </>
              )}
              <button
                id="mic-btn"
                onClick={isRecording ? handleStopTalking : handleStartTalking}
                disabled={status === "disconnected" || isBusy}
                className={`mic-btn ${isRecording ? "mic-btn--rec" : isBusy ? "mic-btn--busy" : "mic-btn--idle"}`}
              >
                {isRecording ? (
                  <><StopIcon /> Stop Talking</>
                ) : isBusy ? (
                  <><span className="mini-spinner" />{statusLabel(status)}</>
                ) : (
                  <><MicIcon /> Talk to Sadhya</>
                )}
              </button>
              <p className="mic-hint">
                {isRecording  ? "Click ▢ when done — Sadhya is listening"
                : isBusy      ? "Please wait..."
                : `Speak your farming question in ${language.name}`}
              </p>
            </div>

            {/* Conversation */}
            <div className="conversation">
              <div className="bubble bubble--user">
                <div className="bubble-hdr"><span>👨‍🌾</span> Farmer ({language.name})</div>
                <p className="bubble-body">
                  {transcript
                    ? `"${transcript}"`
                    : <span className="bubble-empty">Awaiting your voice input...</span>}
                </p>
              </div>

              <div className="bubble bubble--ai">
                <div className="bubble-hdr">
                  <span>🌱</span> Sadhya AI
                  {isBusy && (
                    <span className="thinking-dots"><span/><span/><span/></span>
                  )}
                </div>
                <p className="bubble-body bubble-body--ai">
                  {response
                    ? response
                    : <span className="bubble-empty">Response will appear here...</span>}
                </p>
              </div>

              {errorMsg && (
                <div className="error-box">⚠️ {errorMsg}</div>
              )}
            </div>

            {/* Tech stack badges */}
            <div className="tech-badges">
              {[
                ["🎙️","Sarvam STT"],["🤖","Gemini AI"],["🔊","Sarvam TTS"],["🎬","HeyGen Avatar"],
              ].map(([icon, label]) => (
                <div key={label} className="tech-badge">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>

          </section>
        </main>

        <footer className="page-footer">
          Powered by <strong>Sarvam AI</strong> · <strong>Gemini 1.5 Flash</strong> · <strong>HeyGen</strong>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────
function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H2c0 4.42 3.16 8.09 7 8.9V21h2v-5.07c3.84-.81 7-4.48 7-8.93h-2c0 4.08-3.06 7.44-7 7.93z"/>
    </svg>
  );
}

function StopIcon() {
  return <span style={{ display:"block",width:14,height:14,background:"white",borderRadius:3 }} />;
}
