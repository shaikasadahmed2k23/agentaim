import { useMemo, useState, useEffect } from "react";
import XPWindow from "./XPWindow";

const W = 300;
const H = 260;
const R = 95;
const CX = W / 2;
const CY = H / 2 + 5;

function layout(nodes) {
  const n = nodes.length || 1;
  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      ...node,
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
    };
  });
}

// same gentle quadratic curve used for every edge, factored out so the
// animated path-trace pulses can travel along an identical line
function curveD(from, to) {
  const mx = (from.x + to.x) / 2 + (from.y - to.y) * 0.08;
  const my = (from.y + to.y) / 2 + (to.x - from.x) * 0.08;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export default function TrustGraph({ graph, trustReport, selfId, targetId, sybilClusters, onClose }) {
  const positioned = useMemo(() => layout(graph?.nodes || []), [graph]);
  const posById = Object.fromEntries(positioned.map((n) => [n.id, n]));
  const pathSet = new Set();
  const pathSegments = [];
  if (trustReport?.path) {
    for (let i = 0; i < trustReport.path.length - 1; i++) {
      pathSet.add(`${trustReport.path[i]}->${trustReport.path[i + 1]}`);
      pathSegments.push([trustReport.path[i], trustReport.path[i + 1]]);
    }
  }

  const sybilNodeIds = useMemo(() => {
    const s = new Set();
    (sybilClusters || []).forEach((c) => c.members.forEach((m) => s.add(m)));
    return s;
  }, [sybilClusters]);

  // re-trigger the traveling light-pulse animation every time a new trust
  // check completes (a fresh path, or the same path re-verified)
  const [runId, setRunId] = useState(0);
  const pathKey = JSON.stringify(trustReport?.path || null);
  useEffect(() => {
    if (trustReport?.path) setRunId((r) => r + 1);
  }, [pathKey]);

  return (
    <XPWindow title="Web of Trust" icon="🕸️" onClose={onClose}>
      <div className="xp-body graph-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#4f6fa0" />
            </marker>
            <radialGradient id="nodeChrome" cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#cfe0f7" />
              <stop offset="100%" stopColor="#7d9bce" />
            </radialGradient>
            <radialGradient id="nodeSelf" cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#fff6d9" />
              <stop offset="45%" stopColor="#ffe093" />
              <stop offset="100%" stopColor="#e0a828" />
            </radialGradient>
            <radialGradient id="pulseCore" cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#4ff0ff" />
            </radialGradient>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {(graph?.edges || []).map((e, i) => {
            const from = posById[e.from];
            const to = posById[e.to];
            if (!from || !to) return null;
            const key = `${e.from}->${e.to}`;
            const highlighted = pathSet.has(key);
            const stroke = e.revoked ? "#8b93a8" : !e.valid ? "#ff5577" : highlighted ? "#0f9d6d" : "#35e6a0";
            const width = highlighted ? 3.2 : 1.8;
            const dash = e.revoked ? "2,4" : e.valid ? "" : "4,3";
            return (
              <path
                key={i}
                d={curveD(from, to)}
                fill="none"
                stroke={stroke}
                strokeWidth={width}
                strokeDasharray={dash}
                opacity={e.revoked ? 0.55 : highlighted ? 1 : 0.7}
                filter={highlighted ? "url(#glow)" : undefined}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Sybil-cluster warning rings — dashed amber halo behind flagged nodes */}
          {positioned
            .filter((n) => sybilNodeIds.has(n.id))
            .map((n) => (
              <circle
                key={`sybil-${n.id}`}
                cx={n.x}
                cy={n.y}
                r={26}
                fill="none"
                stroke="#ffb648"
                strokeWidth={2}
                strokeDasharray="3,3"
                opacity={0.85}
              />
            ))}

          {positioned.map((n) => {
            const isFocus = n.id === selfId || n.id === targetId;
            const ring = n.status === "blocked" ? "#555" : n.signature_count === 0 ? "#ff5577" : "#35e6a0";
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={19}
                  fill={isFocus ? "url(#nodeSelf)" : n.status === "blocked" ? "#c7c7c7" : "url(#nodeChrome)"}
                  stroke={ring}
                  strokeWidth={2.5}
                  filter="url(#glow)"
                />
                <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14">
                  {n.avatar}
                </text>
                {n.status === "blocked" && (
                  <text x={n.x + 13} y={n.y - 11} textAnchor="middle" fontSize="13">🚫</text>
                )}
                {sybilNodeIds.has(n.id) && (
                  <text x={n.x - 13} y={n.y - 11} textAnchor="middle" fontSize="12">🕸️</text>
                )}
                <text
                  x={n.x}
                  y={n.y + 31}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="'Inter', 'Segoe UI', sans-serif"
                  fontWeight="600"
                  fill="#1f3f7a"
                >
                  {n.name.length > 12 ? n.name.slice(0, 11) + "…" : n.name}
                </text>
              </g>
            );
          })}

          {/* traveling light-pulse tracing the BFS trust path, hop by hop */}
          {pathSegments.length > 0 && (
            <g key={runId}>
              {pathSegments.map(([f, t], i) => {
                const from = posById[f];
                const to = posById[t];
                if (!from || !to) return null;
                const d = curveD(from, to);
                return (
                  <circle
                    key={i}
                    r={4.5}
                    fill="url(#pulseCore)"
                    filter="url(#glow)"
                    className="trust-pulse"
                    style={{
                      offsetPath: `path('${d}')`,
                      animationDelay: `${i * 0.7}s`,
                    }}
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>
      <div className="graph-legend">
        <span><span className="legend-swatch" style={{ background: "#35e6a0" }} />verified signature</span>
        <span><span className="legend-swatch" style={{ background: "#ff5577" }} />invalid / no path</span>
        <span><span className="legend-swatch" style={{ background: "#8b93a8" }} />revoked</span>
      </div>

      {trustReport && (
        <div className={`trust-report ${trustReport.trusted ? "ok" : "bad"}`}>
          <div>
            <strong>{trustReport.trusted ? "✅ TRUSTED" : "❌ NOT TRUSTED"}</strong>
          </div>
          <div>{trustReport.reason}</div>
          {trustReport.path && (
            <div className="mono">path: {trustReport.path.join(" → ")}</div>
          )}
        </div>
      )}
    </XPWindow>
  );
}