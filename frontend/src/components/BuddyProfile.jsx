import { useEffect, useState } from "react";
import XPWindow from "./XPWindow";
import { getAgentDetail } from "../api";

export default function BuddyProfile({ agentId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAgentDetail(agentId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => { cancelled = true; };
  }, [agentId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <XPWindow
          title={data ? `${data.name} — Profile` : "Loading profile…"}
          icon={data?.avatar || "👤"}
          className="profile-box"
        >
          <div className="xp-body">
            {!data && <div className="chat-empty">Loading…</div>}
            {data && (
              <>
                <div className="profile-row">
                  <strong>{data.name}</strong>{" "}
                  {data.status === "blocked" && <span className="blocked-tag">🚫 BLOCKED</span>}
                </div>
                {data.bio && <div className="profile-bio">{data.bio}</div>}
                <div className="profile-row">
                  Warn level: <strong>{data.warn_level}</strong> / 3
                  {data.warn_level > 0 && <span className="warn-bar"> {"⚠️".repeat(data.warn_level)}</span>}
                </div>

                <div className="profile-section-label">Public key</div>
                <div className="mono profile-key">{data.public_key}</div>

                <div className="profile-section-label">Key fingerprint (randomart)</div>
                <pre className="randomart">{data.randomart}</pre>

                <div className="profile-section-label">
                  Signatures received ({data.signatures_received.length})
                </div>
                {data.signatures_received.length === 0 && (
                  <div className="profile-empty">No one has vouched for this agent yet.</div>
                )}
                {data.signatures_received.map((s, i) => (
                  <div key={i} className="profile-sig-row">
                    ✅ signed by <strong>{s.signer_name}</strong>
                  </div>
                ))}

                <div className="profile-section-label">
                  Signatures given ({data.signatures_given.length})
                </div>
                {data.signatures_given.length === 0 && (
                  <div className="profile-empty">This agent hasn't vouched for anyone yet.</div>
                )}
                {data.signatures_given.map((s, i) => (
                  <div key={i} className="profile-sig-row">
                    🔏 vouched for <strong>{s.subject_name}</strong>
                  </div>
                ))}
              </>
            )}
            <div className="modal-actions">
              <button className="add-agent-btn" style={{ width: "auto" }} onClick={onClose}>Close</button>
            </div>
          </div>
        </XPWindow>
      </div>
    </div>
  );
}
