import XPWindow from "./XPWindow";

export default function BuddyList({ agents, selectedId, onSelect, onOpenProfile, onAddAgent, onAddRogue, onClose }) {
  const online = agents.filter((a) => a.status === "online");
  const away = agents.filter((a) => a.status === "away");
  const blocked = agents.filter((a) => a.status === "blocked");

  const Row = (a) => (
    <div
      key={a.id}
      className={`buddy-row ${selectedId === a.id ? "selected" : ""}`}
      onClick={() => onSelect(a.id)}
      onDoubleClick={() => onOpenProfile(a.id)}
      title="Click to select, double-click for profile"
    >
      <span className={`status-dot ${a.status === "blocked" ? "blocked" : a.status}`} />
      <span className="buddy-avatar">{a.avatar}</span>
      <span className="buddy-meta">
        <span className="buddy-name">
          {a.name} {a.warn_level > 0 && <span className="warn-badge">⚠️{a.warn_level}</span>}
        </span>
        <span className="buddy-sub">
          {a.status === "blocked" ? "Blocked" : a.status === "online" ? "Online" : "Away"}
        </span>
      </span>
      <span className={`sig-badge ${a.signature_count === 0 ? "zero" : ""}`}>
        {a.signature_count ?? 0} sig
      </span>
    </div>
  );

  return (
    <XPWindow title="AgentAIM — Buddy List" icon="🟢" onClose={onClose}>
      <div className="xp-body buddy-list-body">
        {online.length > 0 && (
          <>
            <div className="buddy-group-label">Buddies Online ({online.length})</div>
            {online.map(Row)}
          </>
        )}
        {away.length > 0 && (
          <>
            <div className="buddy-group-label">Away ({away.length})</div>
            {away.map(Row)}
          </>
        )}
        {blocked.length > 0 && (
          <>
            <div className="buddy-group-label blocked-label">Blocked ({blocked.length})</div>
            {blocked.map(Row)}
          </>
        )}
        <div className="buddy-list-footer">
          <button className="add-agent-btn" onClick={onAddAgent}>+ Add a new agent</button>
          <button className="rogue-btn" onClick={onAddRogue}>⚠️ Inject rogue agent (demo)</button>
        </div>
      </div>
    </XPWindow>
  );
}
