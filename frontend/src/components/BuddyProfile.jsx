import { useEffect, useState } from "react";
import XPWindow from "./XPWindow";
import { getAgentDetail, revokeSignature, exportIdentity } from "../api";

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BuddyProfile({ agentId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [revoking, setRevoking] = useState(null); // subject_id currently being revoked

  const load = () => {
    getAgentDetail(agentId).then(setData);
  };

  useEffect(() => {
    let cancelled = false;
    getAgentDetail(agentId).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => { cancelled = true; };
  }, [agentId]);

  const handleRevoke = async (subjectId) => {
    setRevoking(subjectId);
    try {
      await revokeSignature(agentId, subjectId);
      load();
      if (onChanged) await onChanged();
    } finally {
      setRevoking(null);
    }
  };

  const handleExport = async () => {
    const identity = await exportIdentity(agentId);
    downloadJson(`${agentId}-identity.json`, identity);
  };

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
                  <div key={i} className={`profile-sig-row${s.revoked ? " revoked" : ""}`}>
                    {s.revoked ? "🚫 revoked — was signed by" : "✅ signed by"}{" "}
                    <strong>{s.signer_name}</strong>
                  </div>
                ))}

                <div className="profile-section-label">
                  Signatures given ({data.signatures_given.length})
                </div>
                {data.signatures_given.length === 0 && (
                  <div className="profile-empty">This agent hasn't vouched for anyone yet.</div>
                )}
                {data.signatures_given.map((s, i) => (
                  <div key={i} className={`profile-sig-row${s.revoked ? " revoked" : ""}`}>
                    {s.revoked ? "🚫 revoked — vouched for" : "🔏 vouched for"}{" "}
                    <strong>{s.subject_name}</strong>
                    {!s.revoked && (
                      <button
                        className="revoke-link"
                        disabled={revoking === s.subject_id}
                        onClick={() => handleRevoke(s.subject_id)}
                        title="Withdraw this attestation — like a PGP revocation certificate"
                      >
                        {revoking === s.subject_id ? "revoking…" : "revoke"}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
            <div className="modal-actions">
              {data && (
                <button className="export-btn" onClick={handleExport}>⭳ Export identity</button>
              )}
              <button className="add-agent-btn" style={{ width: "auto" }} onClick={onClose}>Close</button>
            </div>
          </div>
        </XPWindow>
      </div>
    </div>
  );
}