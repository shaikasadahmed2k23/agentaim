const BASE = import.meta.env.VITE_API_URL || "http://localhost:8811";
const WS_BASE = BASE.replace(/^http/, "ws");

export async function getAgents() {
  const res = await fetch(`${BASE}/api/agents`);
  return res.json();
}

export async function getGraph() {
  const res = await fetch(`${BASE}/api/graph`);
  return res.json();
}

export async function getTrust(fromId, toId) {
  const res = await fetch(`${BASE}/api/trust/${fromId}/${toId}`);
  return res.json();
}

export async function getAgentDetail(agentId) {
  const res = await fetch(`${BASE}/api/agents/${agentId}`);
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${BASE}/api/reset`, { method: "POST" });
  return res.json();
}

export async function createAgent({ name, avatar, bio, malicious }) {
  const res = await fetch(`${BASE}/api/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatar, bio, malicious }),
  });
  return res.json();
}

export async function revokeSignature(signerId, subjectId) {
  const res = await fetch(`${BASE}/api/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signer_id: signerId, subject_id: subjectId }),
  });
  return res.json();
}

export async function getSybilClusters(selfId) {
  const res = await fetch(`${BASE}/api/sybil-clusters?self_id=${encodeURIComponent(selfId)}`);
  return res.json();
}

export async function simulateSybilRing() {
  const res = await fetch(`${BASE}/api/simulate-sybil-ring`, { method: "POST" });
  return res.json();
}

export async function exportIdentity(agentId) {
  const res = await fetch(`${BASE}/api/agents/${agentId}/export`);
  return res.json();
}

export async function importIdentity(identityJson) {
  const res = await fetch(`${BASE}/api/agents/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identityJson),
  });
  return res.json();
}

export function openNegotiationSocket(agentAId, agentBId, onMessage, onClose) {
  const ws = new WebSocket(`${WS_BASE}/ws/negotiate/${agentAId}/${agentBId}`);
  ws.onmessage = (evt) => onMessage(JSON.parse(evt.data));
  ws.onclose = () => onClose && onClose();
  return ws;
}