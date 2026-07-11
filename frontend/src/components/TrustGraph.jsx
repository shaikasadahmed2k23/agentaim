import { useMemo } from "react";
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

export default function TrustGraph({ graph, trustReport, selfId, targetId, onClose }) {
  const positioned = useMemo(() => layout(graph?.nodes || []), [graph]);
  const posById = Object.fromEntries(positioned.map((n) => [n.id, n]));
  const pathSet = new Set();
  if (trustReport?.path) {
    for (let i = 0; i < trustReport.path.length - 1; i++) {
      pathSet.add(`${trustReport.path[i]}->${trustReport.path[i + 1]}`);
    }
  }

  return (
    <XPWindow title="Web of Trust" icon="🕸️" onClose={onClose}>
      <div className="xp-body graph-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          {(graph?.edges || []).map((e, i) => {
            const from = posById[e.from];
            const to = posById[e.to];
            if (!from || !to) return null;
            const key = `${e.from}->${e.to}`;
            const highlighted = pathSet.has(key);
            const stroke = !e.valid ? "#CC3333" : highlighted ? "#1F6B2A" : "#3FA34D";
            const width = highlighted ? 3 : e.valid ? 1.6 : 1.6;
            const dash = e.valid ? "" : "4,3";
            // slight curve via quadratic path so bidirectional edges don't fully overlap
            const mx = (from.x + to.x) / 2 + (from.y - to.y) * 0.08;
            const my = (from.y + to.y) / 2 + (to.x - from.x) * 0.08;
            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={width}
                strokeDasharray={dash}
                opacity={highlighted ? 1 : 0.65}
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#7a97c7" />
            </marker>
          </defs>
          {positioned.map((n) => (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={18}
                fill={n.id === selfId || n.id === targetId ? "#FFCE00" : n.status === "blocked" ? "#ddd" : "white"}
                stroke={n.status === "blocked" ? "#333" : n.signature_count === 0 ? "#CC3333" : "#3FA34D"}
                strokeWidth={2.5}
              />
              <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14">
                {n.avatar}
              </text>
              {n.status === "blocked" && (
                <text x={n.x + 13} y={n.y - 11} textAnchor="middle" fontSize="13">🚫</text>
              )}
              <text x={n.x} y={n.y + 30} textAnchor="middle" fontSize="9" fill="#333">
                {n.name.length > 12 ? n.name.slice(0, 11) + "…" : n.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="graph-legend">
        <span><span className="legend-swatch" style={{ background: "#3FA34D" }} />verified signature</span>
        <span><span className="legend-swatch" style={{ background: "#CC3333" }} />invalid / no path</span>
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
