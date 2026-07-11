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
    }
    signatures.append(record)
    db.save_signature(record)
    return record


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
