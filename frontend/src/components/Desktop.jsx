import { useEffect, useMemo, useState } from "react";
import App from "../App";

const PORTFOLIO_URL = "https://shaikasadahmed2k23.github.io/";
const REPO_URL = "https://github.com/shaikasadahmed2k23/agentaim";

// The chrome-shard decoration, now living at the desktop/wallpaper level
// (previously inside App.jsx) so it's part of the permanent background,
// not just the app window.
function ChromeShard() {
  return (
    <svg className="chrome-shard" viewBox="0 0 600 500" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="shardChrome1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#eef5ff" />
          <stop offset="45%" stopColor="#7db4ff" />
          <stop offset="100%" stopColor="#0d1c36" />
        </linearGradient>
        <linearGradient id="shardChrome2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4ff0ff" />
          <stop offset="60%" stopColor="#3d8bff" />
          <stop offset="100%" stopColor="#0d1c36" />
        </linearGradient>
      </defs>
      <polygon points="600,0 600,260 380,120 460,0" fill="url(#shardChrome1)" />
      <polygon points="600,260 600,500 340,340 380,120" fill="url(#shardChrome2)" />
      <polygon points="460,0 380,120 260,40 340,0" fill="url(#shardChrome1)" opacity="0.8" />
      <polygon points="340,120 380,120 340,340 230,220" fill="url(#shardChrome2)" opacity="0.55" />
      <line x1="380" y1="120" x2="600" y2="260" stroke="#eef5ff" strokeWidth="1.5" opacity="0.5" />
      <line x1="340" y1="340" x2="600" y2="260" stroke="#4ff0ff" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

// A proper wallpaper scene — soft horizon glow + a glowing orb, the same
// "sky / horizon / globe" composition the reference mood board used, done
// in AgentAIM's own chrome/cyan palette instead of a flat gradient.
function WallpaperScene() {
  return (
    <div className="os-wallpaper" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className="os-wallpaper-svg">
        <defs>
          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eafcff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#4ff0ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0d1c36" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="horizonFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d1c36" stopOpacity="0" />
            <stop offset="100%" stopColor="#050a16" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle cx="1080" cy="230" r="260" fill="url(#orbGlow)" />
        <circle cx="1080" cy="230" r="120" fill="none" stroke="#7db4ff" strokeWidth="1" opacity="0.4" />
        <circle cx="1080" cy="230" r="165" fill="none" stroke="#4ff0ff" strokeWidth="0.75" opacity="0.3" />
        <rect x="0" y="560" width="1440" height="340" fill="url(#horizonFade)" />
        <path d="M0,650 Q360,560 720,610 T1440,600 V900 H0 Z" fill="#0a1730" opacity="0.75" />
        <path d="M0,700 Q400,630 800,670 T1440,660 V900 H0 Z" fill="#081226" opacity="0.85" />
      </svg>
    </div>
  );
}

// Top-right "AgentAIM OS" status badge — a nod to the reference site's
// top-right event-info card, giving the top of the desktop some content.
function TopStatusBadge() {
  return (
    <div className="os-topbar-badge">
      <div className="os-topbar-badge-title">AGENTAIM OS</div>
      <div className="os-topbar-badge-sub">Web of trust for AI agents — RIFT 2026</div>
    </div>
  );
}

// Real GitHub mark (Octicon), used on the desktop/taskbar instead of an emoji.
function GithubGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
        -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07
        -1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21
        2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
        .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
        0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// Generic retro window frame — used for the AgentAIM app window and the
// About popup. Handles the titlebar + the 3 controls ( _ □ X ).
function RetroWindow({ title, iconSrc, iconGlyph, maximized, small, onMinimize, onMaximizeToggle, onClose, children }) {
  return (
    <div className={`retro-window ${maximized ? "maximized" : ""} ${small ? "small" : ""}`}>
      <div className="retro-titlebar">
        {iconSrc && <img className="retro-titlebar-icon" src={iconSrc} alt="" />}
        {iconGlyph && <span className="retro-titlebar-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{iconGlyph}</span>}
        <div className="retro-titlebar-title">{title}</div>
        <div className="retro-window-controls">
          {onMinimize && <button className="retro-btn" title="Minimize" onClick={onMinimize}>_</button>}
          {onMaximizeToggle && <button className="retro-btn" title="Maximize" onClick={onMaximizeToggle}>□</button>}
          <button className="retro-btn close" title="Close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="retro-window-body">{children}</div>
    </div>
  );
}

const DESKTOP_ICONS = [
  { id: "agentaim", label: "AgentAIM", iconSrc: "/favicon.png", action: "open-app" },
  { id: "portfolio", label: "Portfolio", iconGlyph: "🧑‍💻", action: "open-portfolio" },
  { id: "about", label: "About.txt", iconGlyph: "📄", action: "open-about" },
  { id: "github", label: "GitHub", iconGlyph: <GithubGlyph />, action: "open-github" },
];

export default function Desktop() {
  // 'closed' | 'open' | 'minimized' | 'maximized'
  const [appWindow, setAppWindow] = useState("closed");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const timeLabel = useMemo(
    () => now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    [now]
  );

  const runAction = (action) => {
    if (action === "open-app") {
      setAppWindow((w) => (w === "closed" ? "open" : w === "minimized" ? "open" : w));
    } else if (action === "open-portfolio") {
      window.open(PORTFOLIO_URL, "_blank", "noopener,noreferrer");
    } else if (action === "open-github") {
      window.open(REPO_URL, "_blank", "noopener,noreferrer");
    } else if (action === "open-about") {
      setAboutOpen(true);
    }
    setStartMenuOpen(false);
  };

  const handleIconClick = (id) => setSelectedIcon(id);
  const handleIconDoubleClick = (icon) => {
    setSelectedIcon(icon.id);
    runAction(icon.action);
  };

  const startMenuItems = [
    { id: "agentaim", label: "Open AgentAIM", glyph: "🛰️", action: "open-app" },
    { id: "portfolio", label: "My Portfolio", glyph: "🧑‍💻", action: "open-portfolio" },
    { id: "github", label: "View Source (GitHub)", glyph: <GithubGlyph />, action: "open-github" },
    { id: "about", label: "About AgentAIM", glyph: "📄", action: "open-about" },
  ].filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));

  const appTaskbarLabel = appWindow === "minimized" ? "AgentAIM (minimized)" : "AgentAIM";

  return (
    <div className="os-desktop" onClick={() => setSelectedIcon(null)}>
      <WallpaperScene />
      <ChromeShard />
      <TopStatusBadge />

      <div className="os-icons">
        {DESKTOP_ICONS.map((icon) => (
          <button
            key={icon.id}
            className={`os-icon ${selectedIcon === icon.id ? "selected" : ""}`}
            onClick={(e) => { e.stopPropagation(); handleIconClick(icon.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); handleIconDoubleClick(icon); }}
          >
            <span className="os-icon-glyph">
              {icon.iconSrc ? <img src={icon.iconSrc} alt="" /> : icon.iconGlyph}
            </span>
            <span className="os-icon-label">{icon.label}</span>
          </button>
        ))}
      </div>

      {(appWindow === "open" || appWindow === "maximized") && (
        <RetroWindow
          title="AgentAIM — Web of Trust for AI Agents"
          iconSrc="/favicon.png"
          maximized={appWindow === "maximized"}
          onMinimize={() => setAppWindow("minimized")}
          onMaximizeToggle={() => setAppWindow((w) => (w === "maximized" ? "open" : "maximized"))}
          onClose={() => setAppWindow("closed")}
        >
          <App />
        </RetroWindow>
      )}

      {aboutOpen && (
        <RetroWindow
          title="About.txt"
          iconGlyph="📄"
          small
          onClose={() => setAboutOpen(false)}
        >
          <div className="about-window-content">
            <h3>AgentAIM</h3>
            <p>
              A web of trust for AI agents — cryptographic key-signing, 2000s style.
              Agents sign each other's public keys after successful deals (Ed25519,
              PGP key-signing party style), and trust between agents who've never met
              is computed via BFS over verified signature paths.
            </p>
            <p>Built for RIFT 2026 — "AI's First Day Online."</p>
            <p><a href={REPO_URL} target="_blank" rel="noopener noreferrer">Source on GitHub →</a></p>
          </div>
        </RetroWindow>
      )}

      {startMenuOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">AgentAIM OS</div>
          <input
            className="start-search"
            placeholder="Search files or programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="start-menu-list">
            {startMenuItems.length === 0 && <div className="start-menu-empty">No matches.</div>}
            {startMenuItems.map((item) => (
              <button key={item.id} className="start-menu-item" onClick={() => runAction(item.action)}>
                <span className="glyph">{item.glyph}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="taskbar" onClick={(e) => e.stopPropagation()}>
        <button
          className={`start-btn ${startMenuOpen ? "active" : ""}`}
          onClick={() => setStartMenuOpen((s) => !s)}
        >
          <span className="start-btn-glyph">🛰️</span>
          Start
        </button>
        <div className="taskbar-divider" />
        <div className="taskbar-apps">
          {appWindow !== "closed" && (
            <button
              className={`taskbar-app-btn ${appWindow !== "minimized" ? "focused" : ""}`}
              onClick={() => setAppWindow((w) => (w === "minimized" ? "open" : "minimized"))}
            >
              <img src="/favicon.png" alt="" />
              {appTaskbarLabel}
            </button>
          )}
        </div>
        <div className="taskbar-clock">{timeLabel}</div>
      </div>
    </div>
  );
}