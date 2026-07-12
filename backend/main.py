from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import random
import string

load_dotenv()

import store
import trust_graph
import negotiation
import crypto_utils

app = FastAPI(title="AgentAIM — Web of Trust for AI Agents")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store.seed_demo_data()


class SignRequest(BaseModel):
    signer_id: str
    subject_id: str


class RevokeRequest(BaseModel):
    signer_id: str
    subject_id: str


class NewAgentRequest(BaseModel):
    name: str
    avatar: str = "🤖"
    bio: str = ""
    malicious: bool = False


class SignatureImport(BaseModel):
    signer_id: str
    subject_id: str
    message: str
    signature: str
    timestamp: float
    revoked: bool = False
    revoked_at: float | None = None


class ImportIdentityRequest(BaseModel):
    id: str
    name: str
    avatar: str = "🤖"
    bio: str = ""
    status: str = "online"
    public_key: str
    private_key: str = ""
    warn_level: int = 0
    created_at: float | None = None
    signatures_received: list[SignatureImport] = []
    signatures_given: list[SignatureImport] = []


@app.get("/api/health")
def health():
    return {"status": "ok", "agents": len(store.agents), "signatures": len(store.signatures)}


@app.get("/api/agents")
def list_agents():
    result = []
    for a in store.agents.values():
        agent_data = store.public_agent(a)
        agent_data["signature_count"] = sum(
            1 for s in store.signatures if s["subject_id"] == a["id"] and not s.get("revoked")
        )
        result.append(agent_data)
    return result


@app.get("/api/agents/{agent_id}")
def get_agent(agent_id: str):
    agent = store.agents.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    data = store.public_agent(agent)
    data["randomart"] = crypto_utils.randomart(agent["public_key"])

    received = [
        {
            "signer_id": s["signer_id"],
            "signer_name": store.agents[s["signer_id"]]["name"] if s["signer_id"] in store.agents else s["signer_id"],
            "timestamp": s["timestamp"],
            "revoked": bool(s.get("revoked")),
            "revoked_at": s.get("revoked_at"),
        }
        for s in store.signatures if s["subject_id"] == agent_id
    ]
    given = [
        {
            "subject_id": s["subject_id"],
            "subject_name": store.agents[s["subject_id"]]["name"] if s["subject_id"] in store.agents else s["subject_id"],
            "timestamp": s["timestamp"],
            "revoked": bool(s.get("revoked")),
            "revoked_at": s.get("revoked_at"),
        }
        for s in store.signatures if s["signer_id"] == agent_id
    ]
    data["signatures_received"] = sorted(received, key=lambda r: r["timestamp"])
    data["signatures_given"] = sorted(given, key=lambda r: r["timestamp"])
    return data


@app.get("/api/graph")
def graph():
    return trust_graph.get_graph()


@app.get("/api/trust/{from_id}/{to_id}")
def trust(from_id: str, to_id: str):
    if from_id not in store.agents or to_id not in store.agents:
        raise HTTPException(404, "Unknown agent")
    return trust_graph.trust_report(from_id, to_id)


@app.post("/api/sign")
def sign(req: SignRequest):
    if req.signer_id not in store.agents or req.subject_id not in store.agents:
        raise HTTPException(404, "Unknown agent")
    record = store.add_signature(req.signer_id, req.subject_id)
    return {"ok": True, "record": {k: v for k, v in record.items()}}


@app.post("/api/revoke")
def revoke(req: RevokeRequest):
    """PGP-style revocation — only the original signer can withdraw their own
    attestation. The trust graph immediately stops treating it as a valid edge."""
    if req.signer_id not in store.agents or req.subject_id not in store.agents:
        raise HTTPException(404, "Unknown agent")
    record = store.revoke_signature(req.signer_id, req.subject_id)
    if not record:
        raise HTTPException(404, "No active signature found from that signer to that subject")
    return {"ok": True, "record": record}


@app.get("/api/sybil-clusters")
def sybil_clusters(self_id: str = "shopbot"):
    """Flags islands of agents that only ever vouch for each other, disconnected
    from your own web of trust — a fabricated-trust / Sybil-ring pattern."""
    return {"clusters": trust_graph.detect_sybil_clusters(self_id)}


@app.post("/api/simulate-sybil-ring")
def simulate_sybil_ring():
    """Demo helper — spins up two agents that only sign each other, off in
    their own island, so the Sybil detector has something real to catch."""
    created = store.simulate_sybil_ring()
    return {"ok": True, "agents": created}


@app.get("/api/agents/{agent_id}/export")
def export_identity(agent_id: str):
    data = store.export_identity(agent_id)
    if not data:
        raise HTTPException(404, "Agent not found")
    return data


@app.post("/api/agents/import")
def import_identity(req: ImportIdentityRequest):
    payload = req.model_dump()
    result = store.import_identity(payload)
    return result


@app.post("/api/agents")
def create_agent(req: NewAgentRequest):
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
    agent_id = f"{'rogue' if req.malicious else 'agent'}-{suffix}"
    name = req.name if not req.malicious else f"{req.name} ⚠️"
    bio = req.bio or ("Claims to be trustworthy. Has zero signatures." if req.malicious else "")
    agent = store.create_agent(agent_id, name, req.avatar, "online", bio)
    return store.public_agent(agent)


@app.post("/api/reset")
def reset_demo():
    """Safety net for live demos — wipes the DB and reseeds the original 3 agents."""
    import db
    db.reset_db()
    store.agents.clear()
    store.signatures.clear()
    store.seed_demo_data()
    return {"ok": True, "agents": len(store.agents), "signatures": len(store.signatures)}


@app.websocket("/ws/negotiate/{agent_a_id}/{agent_b_id}")
async def negotiate_ws(websocket: WebSocket, agent_a_id: str, agent_b_id: str):
    await websocket.accept()
    try:
        if agent_a_id not in store.agents or agent_b_id not in store.agents:
            await websocket.send_json({"speaker": "system", "text": "Unknown agent(s)."})
            await websocket.close()
            return

        target = store.agents[agent_b_id]
        if target["status"] == "blocked":
            await websocket.send_json({
                "speaker": "system",
                "text": f"🚫 {target['name']} is BLOCKED after repeated failed trust verifications "
                        f"(warn level {target['warn_level']}). Negotiation refused before it even starts.",
            })
            await websocket.close()
            return

        # Show judges exactly what context the AI agent is reasoning over — not a black box
        report = trust_graph.trust_report(agent_a_id, agent_b_id)
        await websocket.send_json({
            "speaker": "context",
            "text": "Context passed to the negotiating AI agent",
            "context": report,
        })

        turns = await negotiation.run_negotiation(agent_a_id, agent_b_id)
        for turn in turns:
            await websocket.send_json(turn)

        # If accepted, seal the deal with a real new signature
        if turns and "ACCEPT" in turns[-1]["text"]:
            record = store.add_signature(agent_b_id, agent_a_id)
            await websocket.send_json({
                "speaker": "system",
                "text": f"🔏 New signature recorded: {agent_b_id} vouches for {agent_a_id}.",
                "signature": record["signature"][:24] + "...",
            })
        elif turns and "REJECT" in turns[-1]["text"]:
            updated = store.increment_warn(agent_b_id)
            if updated["status"] == "blocked":
                await websocket.send_json({
                    "speaker": "system",
                    "text": f"⚠️ {updated['name']}'s warn level hit {updated['warn_level']} — auto-blocked from future negotiations.",
                })
            else:
                await websocket.send_json({
                    "speaker": "system",
                    "text": f"⚠️ {updated['name']}'s warn level raised to {updated['warn_level']} after this failed trust check.",
                })

        await websocket.close()
    except WebSocketDisconnect:
        pass

@app.get("/")
def root():
    return {"status": "AgentAIM backend running", "docs": "/docs"}