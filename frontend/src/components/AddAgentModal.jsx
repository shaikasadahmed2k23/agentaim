import { useState } from "react";
import XPWindow from "./XPWindow";

export default function AddAgentModal({ malicious, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(malicious ? "🕵️" : "🤖");
  const [bio, setBio] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), avatar, bio, malicious });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <XPWindow
          title={malicious ? "Inject Rogue Agent" : "Add New Agent"}
          icon={malicious ? "⚠️" : "➕"}
          className="modal-box"
        >
          <div className="xp-body">
            <div className="modal-field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TravelBot" />
            </div>
            <div className="modal-field">
              <label>Avatar (emoji)</label>
              <input value={avatar} onChange={(e) => setAvatar(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>Bio</label>
              <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What does it do?" />
            </div>
            {malicious && (
              <div className="modal-field" style={{ color: "#a33" }}>
                This agent will have ZERO signatures — watch it get rejected by the web of trust.
              </div>
            )}
            <div className="modal-actions">
              <button className="add-agent-btn" style={{ width: "auto" }} onClick={onClose}>Cancel</button>
              <button className="add-agent-btn" style={{ width: "auto" }} onClick={submit}>Create</button>
            </div>
          </div>
        </XPWindow>
      </div>
    </div>
  );
}
