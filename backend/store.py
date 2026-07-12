"""
Runtime store for agents + signatures. Backed by SQLite (db.py) so the
web of trust survives server restarts, while keeping fast in-memory
dicts as the source of truth during a running process.
"""
import time
from crypto_utils import generate_keypair, sign_message, attestation_message
import db

agents: dict[str, dict] = {}
signatures: list[dict] = []


def _bootstrap():
    db.init_db()
    if db.has_data():
        loaded_agents, loaded_signatures = db.load_all()
        agents.update(loaded_agents)
        signatures.extend(loaded_signatures)


def create_agent(agent_id: str, name: str, avatar: str, status: str = "online", bio: str = "") -> dict:
    priv, pub = generate_keypair()
    agent = {
        "id": agent_id,
        "name": name,
        "avatar": avatar,
        "status": status,
        "public_key": pub,
        "private_key": priv,  # in a real system this never leaves the agent's own host
        "warn_level": 0,
        "bio": bio,
        "created_at": time.time(),
    }
    agents[agent_id] = agent
    db.save_agent(agent)
    return agent


def add_signature(signer_id: str, subject_id: str) -> dict:
    signer = agents[signer_id]
    subject = agents[subject_id]
    msg = attestation_message(signer_id, subject_id, subject["public_key"])
    sig = sign_message(signer["private_key"], msg)
    record = {
        "signer_id": signer_id,
        "subject_id": subject_id,
        "message": msg,
        "signature": sig,
        "timestamp": time.time(),
        "revoked": False,
        "revoked_at": None,
    }
    signatures.append(record)
    db.save_signature(record)
    return record


def revoke_signature(signer_id: str, subject_id: str) -> dict | None:
    """PGP-style revocation: only the original signer can revoke their own
    attestation. The signature record is kept (for history/audit) but marked
    revoked, so trust_graph stops treating it as a valid edge."""
    candidate = None
    for s in signatures:
        if s["signer_id"] == signer_id and s["subject_id"] == subject_id and not s.get("revoked"):
            candidate = s  # keep scanning — take the most recent match
    if not candidate:
        return None
    candidate["revoked"] = True
    candidate["revoked_at"] = time.time()
    db.revoke_signature(signer_id, subject_id, candidate["signature"], candidate["revoked_at"])
    return candidate


def export_identity(agent_id: str) -> dict | None:
    """Full portable identity file — public key, private key, and this agent's
    signature history — analogous to exporting a PGP secret key block."""
    agent = agents.get(agent_id)
    if not agent:
        return None
    return {
        "format": "agentaim-identity-v1",
        "id": agent["id"],
        "name": agent["name"],
        "avatar": agent["avatar"],
        "status": agent["status"],
        "bio": agent["bio"],
        "public_key": agent["public_key"],
        "private_key": agent["private_key"],
        "warn_level": agent["warn_level"],
        "created_at": agent["created_at"],
        "signatures_received": [s for s in signatures if s["subject_id"] == agent_id],
        "signatures_given": [s for s in signatures if s["signer_id"] == agent_id],
        "exported_at": time.time(),
    }


def import_identity(data: dict) -> dict:
    """Re-registers an identity (and any signature history bundled with it)
    from an exported keyfile — the trust graph carries over, not just the keys."""
    agent_id = data["id"]
    agent = {
        "id": agent_id,
        "name": data.get("name", agent_id),
        "avatar": data.get("avatar", "🤖"),
        "status": data.get("status", "online"),
        "public_key": data["public_key"],
        "private_key": data.get("private_key", ""),
        "warn_level": data.get("warn_level", 0),
        "bio": data.get("bio") or "Imported identity.",
        "created_at": data.get("created_at", time.time()),
    }
    agents[agent_id] = agent
    db.upsert_agent_full(agent)

    imported = 0
    for s in (data.get("signatures_received") or []) + (data.get("signatures_given") or []):
        required = ("signer_id", "subject_id", "message", "signature", "timestamp")
        if not all(k in s for k in required):
            continue
        dup = any(
            x["signer_id"] == s["signer_id"] and x["subject_id"] == s["subject_id"]
            and x["signature"] == s["signature"]
            for x in signatures
        )
        if dup:
            continue
        record = {
            "signer_id": s["signer_id"],
            "subject_id": s["subject_id"],
            "message": s["message"],
            "signature": s["signature"],
            "timestamp": s["timestamp"],
            "revoked": bool(s.get("revoked", False)),
            "revoked_at": s.get("revoked_at"),
        }
        signatures.append(record)
        db.save_signature(record)
        imported += 1

    return {"agent": public_agent(agent), "signatures_imported": imported}


def simulate_sybil_ring() -> list[dict]:
    """Demo helper: spins up two fresh agents that only ever sign each other,
    with zero connection to the rest of the network — the exact pattern the
    Sybil-cluster detector is built to flag."""
    suffix = "".join(__import__("random").choices("abcdefghijklmnopqrstuvwxyz0123456789", k=4))
    a_id, b_id = f"ring-{suffix}-a", f"ring-{suffix}-b"
    a = create_agent(a_id, f"RingBot-{suffix}A", "🎭", "online", "New here, vouched for by RingBot-B.")
    b = create_agent(b_id, f"RingBot-{suffix}B", "🎭", "online", "New here, vouched for by RingBot-A.")
    add_signature(a_id, b_id)
    add_signature(b_id, a_id)
    return [public_agent(a), public_agent(b)]


def increment_warn(agent_id: str) -> dict:
    """Repeated failed trust checks raise an agent's warn level — the AIM 'Warn Level'
    meter, repurposed as a fraud/risk indicator. Past a threshold, auto-block it."""
    agent = agents[agent_id]
    agent["warn_level"] += 1
    if agent["warn_level"] >= 3:
        agent["status"] = "blocked"
    db.save_agent(agent)
    return agent


def public_agent(agent: dict) -> dict:
    """Never expose private keys over the API."""
    return {k: v for k, v in agent.items() if k != "private_key"}


def seed_demo_data():
    """Two seasoned agents with a real history of signed deals, one fresh agent with one vouch."""
    if agents:
        return  # already have data (either from a prior run's DB, or already seeded this process)

    create_agent("shopbot", "ShopBot", "🛍️", "online", "Finds the best flight & hotel deals.")
    create_agent("paybot", "PayBot", "💳", "online", "Handles escrow & payment settlement.")
    create_agent("newbot", "NewBot", "🆕", "away", "Just came online yesterday.")

    # ShopBot and PayBot have a long real history — mutual signatures
    add_signature("shopbot", "paybot")
    add_signature("paybot", "shopbot")

    # PayBot vouches for NewBot after one small successful deal
    add_signature("paybot", "newbot")


_bootstrap()