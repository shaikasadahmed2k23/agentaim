import { useEffect, useState, useCallback } from "react";
import BuddyList from "./components/BuddyList";
import ChatWindow from "./components/ChatWindow";
import TrustGraph from "./components/TrustGraph";
import AddAgentModal from "./components/AddAgentModal";
import BuddyProfile from "./components/BuddyProfile";
import SplashScreen from "./components/SplashScreen";
import {
  getAgents, getGraph, getTrust, createAgent, resetDemo,
  getSybilClusters, simulateSybilRing, importIdentity,
} from "./api";
import { playBuddyIn, playDialup } from "./sounds";

const SELF_ID = "shopbot"; // the "you" agent whose point of view the buddy list represents

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [agents, setAgents] = useState([]);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [trustReport, setTrustReport] = useState(null);
  const [sybilClusters, setSybilClusters] = useState([]);
  const [modal, setModal] = useState(null); // null | "agent" | "rogue"
  const [profileId, setProfileId] = useState(null);
  const [windows, setWindows] = useState({ buddyList: true, chat: true, graph: true });

  useEffect(() => {
    try { playDialup(); } catch (e) { /* autoplay restrictions, ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    const [a, g, s] = await Promise.all([getAgents(), getGraph(), getSybilClusters(SELF_ID)]);
    setAgents(a);
    setGraph(g);
    setSybilClusters(s.clusters || []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) return;
    getTrust(SELF_ID, selectedId).then(setTrustReport);
  }, [selectedId, graph]);

  const selfAgent = agents.find((a) => a.id === SELF_ID);
  const targetAgent = agents.find((a) => a.id === selectedId);
  const buddyListAgents = agents.filter((a) => a.id !== SELF_ID);

  const handleSelect = (id) => setSelectedId(id);

  const handleCreate = async (payload) => {
    const created = await createAgent(payload);
    setModal(null);
    await refresh();
    playBuddyIn();
    setSelectedId(created.id);
  };

  const handleReset = async () => {
    if (!confirm("Reset the demo? This wipes all agents/signatures back to the original 3.")) return;
    await resetDemo();
    setSelectedId(null);
    setTrustReport(null);
    await refresh();
  };

  const handleImportIdentity = async (identityJson) => {
    const result = await importIdentity(identityJson);
    await refresh();
    playBuddyIn();
    alert(
      `Imported "${result.agent.name}" (${result.agent.id}) — ` +
      `${result.signatures_imported} signature(s) restored from the keyfile.`
    );
    setSelectedId(result.agent.id);
  };

  const handleSimulateSybilRing = async () => {
    await simulateSybilRing();
    await refresh();
    playBuddyIn();
  };

  const closeWindow = (key) => setWindows((w) => ({ ...w, [key]: false }));
  const anyClosed = !windows.buddyList || !windows.chat || !windows.graph;
  const restoreAll = () => setWindows({ buddyList: true, chat: true, graph: true });

  return (
    <div className="desktop">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <svg
        className="chrome-shard"
        viewBox="0 0 600 500"
        aria-hidden="true"
        focusable="false"
      >
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

      <div className="desktop-header">
        <h1>AgentAIM</h1>
        <div className="tagline">
          A web of trust for AI agents — cryptographic key-signing, 2000s style. You're signed in as{" "}
          <strong>{selfAgent?.name || "ShopBot"}</strong>.
        </div>
        <div className="header-actions">
          {anyClosed && (
            <button className="restore-btn" onClick={restoreAll}>↺ Restore windows</button>
          )}
          <button className="reset-btn" onClick={handleReset}>⟲ Reset demo</button>
        </div>
      </div>

      {sybilClusters.length > 0 && (
        <div className="sybil-banner">
          🕸️ <strong>{sybilClusters.length} potential Sybil cluster{sybilClusters.length > 1 ? "s" : ""} detected</strong> —
          {" "}these agents only ever vouch for each other, with no connection to your web of trust:{" "}
          {sybilClusters.map((c) => c.names.join(" ↔ ")).join("  ·  ")}
        </div>
      )}

      <div className="workspace">
        {windows.buddyList && (
          <BuddyList
            agents={buddyListAgents}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenProfile={setProfileId}
            onAddAgent={() => setModal("agent")}
            onAddRogue={() => setModal("rogue")}
            onImportIdentity={handleImportIdentity}
            onSimulateSybilRing={handleSimulateSybilRing}
            onClose={() => closeWindow("buddyList")}
          />
        )}

        {windows.chat && selfAgent && (
          <ChatWindow
            selfAgent={selfAgent}
            targetAgent={targetAgent}
            onDealSealed={refresh}
            onClose={() => closeWindow("chat")}
          />
        )}

        {windows.graph && (
          <TrustGraph
            graph={graph}
            trustReport={trustReport}
            selfId={SELF_ID}
            targetId={selectedId}
            sybilClusters={sybilClusters}
            onClose={() => closeWindow("graph")}
          />
        )}
      </div>

      {modal && (
        <AddAgentModal
          malicious={modal === "rogue"}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
        />
      )}

      {profileId && (
        <BuddyProfile agentId={profileId} onClose={() => setProfileId(null)} onChanged={refresh} />
      )}
    </div>
  );
}