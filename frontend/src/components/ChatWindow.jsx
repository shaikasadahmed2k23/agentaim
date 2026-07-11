import { useEffect, useRef, useState } from "react";
import XPWindow from "./XPWindow";
import { openNegotiationSocket } from "../api";
import { playImReceive, playTrustAccept, playTrustReject } from "../sounds";

export default function ChatWindow({ selfAgent, targetAgent, onDealSealed, onClose }) {
  const [lines, setLines] = useState([]);
  const [context, setContext] = useState(null);
  const [showContext, setShowContext] = useState(true);
  const [negotiating, setNegotiating] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    setLines([]);
    setContext(null);
  }, [targetAgent?.id]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  if (!targetAgent) {
    return (
      <XPWindow title="AgentAIM — Instant Message" icon="💬" className="chat-window" onClose={onClose}>
        <div className="xp-body">
          <div className="chat-empty">Select a buddy from the list to start a negotiation.</div>
        </div>
      </XPWindow>
    );
  }

  const startNegotiation = () => {
    setLines([]);
    setContext(null);
    setNegotiating(true);
    const ws = openNegotiationSocket(
      selfAgent.id,
      targetAgent.id,
      (msg) => {
        if (msg.speaker === "context") {
          setContext(msg.context);
          return;
        }
        setLines((prev) => [...prev, msg]);
        if (msg.text?.includes("VERDICT: ACCEPT")) {
          playTrustAccept();
          onDealSealed && onDealSealed();
        } else if (msg.text?.includes("VERDICT: REJECT")) {
          playTrustReject();
        } else if (msg.speaker !== "system") {
          playImReceive();
        }
      },
      () => setNegotiating(false)
    );
    return ws;
  };

  const lineClass = (line) => {
    if (line.text?.includes("VERDICT: ACCEPT")) return "chat-line verdict-accept";
    if (line.text?.includes("VERDICT: REJECT")) return "chat-line verdict-reject";
    if (line.speaker === "system") return "chat-line system";
    return "chat-line";
  };

  return (
    <XPWindow
      title={`IM with ${targetAgent.name}`}
      icon={targetAgent.avatar}
      subtitle={targetAgent.status}
      className="chat-window"
      onClose={onClose}
    >
      <div className="xp-body">
        {context && (
          <div className="context-panel">
            <div className="context-header" onClick={() => setShowContext(!showContext)}>
              <span>🔍 What the AI agent saw {showContext ? "▾" : "▸"}</span>
            </div>
            {showContext && (
              <pre className="context-json">{JSON.stringify(context, null, 2)}</pre>
            )}
          </div>
        )}
        <div className="chat-log" ref={logRef}>
          {lines.length === 0 && (
            <div className="chat-empty">
              No messages yet. Click "Start negotiation" to watch {selfAgent.name} and{" "}
              {targetAgent.name} verify trust and attempt a deal — live.
            </div>
          )}
          {lines.map((line, i) => (
            <div key={i} className={lineClass(line)}>
              {line.speaker !== "system" && <span className="speaker">{line.speaker}: </span>}
              {line.text}
            </div>
          ))}
        </div>
        <div className="chat-input-bar">
          <button onClick={startNegotiation} disabled={negotiating || targetAgent.status === "blocked"}>
            {targetAgent.status === "blocked"
              ? "🚫 Blocked — negotiation refused"
              : negotiating
              ? "Negotiating…"
              : "▶ Start negotiation"}
          </button>
        </div>
      </div>
    </XPWindow>
  );
}
