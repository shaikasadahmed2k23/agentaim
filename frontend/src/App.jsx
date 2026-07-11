import { useEffect, useState, useCallback } from "react";
import BuddyList from "./components/BuddyList";
import ChatWindow from "./components/ChatWindow";
import TrustGraph from "./components/TrustGraph";
import AddAgentModal from "./components/AddAgentModal";
import BuddyProfile from "./components/BuddyProfile";
import SplashScreen from "./components/SplashScreen";
import { getAgents, getGraph, getTrust, createAgent, resetDemo } from "./api";
import { playBuddyIn, playDialup } from "./sounds";

const SELF_ID = "shopbot"; // the "you" agent whose point of view the buddy list represents

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [agents, setAgents] = useState([]);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [trustReport, setTrustReport] = useState(null);
  const [modal, setModal] = useState(null); // null | "agent" | "rogue"
  const [profileId, setProfileId] = useState(null);
  const [windows, setWindows] = useState({ buddyList: true, chat: true, graph: true });

  useEffect(() => {
    try { playDialup(); } catch (e) { /* autoplay restrictions, ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    const [a, g] = await Promise.all([getAgents(), getGraph()]);
    setAgents(a);
    setGraph(g);
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

  const closeWindow = (key) => setWindows((w) => ({ ...w, [key]: false }));
  const anyClosed = !windows.buddyList || !windows.chat || !windows.graph;
  const restoreAll = () => setWindows({ buddyList: true, chat: true, graph: true });

  return (
    <div className="desktop">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

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

      <div className="workspace">
        {windows.buddyList && (
          <BuddyList
            agents={buddyListAgents}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenProfile={setProfileId}
            onAddAgent={() => setModal("agent")}
            onAddRogue={() => setModal("rogue")}
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
        <BuddyProfile agentId={profileId} onClose={() => setProfileId(null)} />
      )}
    </div>
  );
}
