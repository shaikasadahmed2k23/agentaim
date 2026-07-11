export default function XPWindow({ title, icon, subtitle, children, className = "", onClose }) {
  return (
    <div className={`xp-window ${className}`}>
      <div className="xp-titlebar">
        <div className="title-left">
          <span>{icon}</span>
          <span>{title}</span>
          {subtitle && <span className="chat-header-status">— {subtitle}</span>}
        </div>
        <div className="xp-buttons">
          <span className="xp-btn">_</span>
          <span className="xp-btn">□</span>
          <span
            className="xp-btn"
            onClick={onClose}
            style={onClose ? { cursor: "pointer" } : undefined}
          >
            ×
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
