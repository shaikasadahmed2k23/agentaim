"""
SQLite persistence. Kept deliberately simple: the in-memory store.agents /
store.signatures dicts remain the fast runtime source of truth, and every
write is mirrored to disk so a server restart doesn't wipe the web of trust.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "agentaim.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT,
            avatar TEXT,
            status TEXT,
            public_key TEXT,
            private_key TEXT,
            warn_level INTEGER DEFAULT 0,
            bio TEXT,
            created_at REAL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS signatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signer_id TEXT,
            subject_id TEXT,
            message TEXT,
            signature TEXT,
            timestamp REAL
        )
    """)
    conn.commit()
    conn.close()


def has_data() -> bool:
    conn = get_conn()
    count = conn.execute("SELECT COUNT(*) c FROM agents").fetchone()["c"]
    conn.close()
    return count > 0


def load_all():
    conn = get_conn()
    agents = {row["id"]: dict(row) for row in conn.execute("SELECT * FROM agents")}
    signatures = [dict(row) for row in conn.execute(
        "SELECT signer_id, subject_id, message, signature, timestamp FROM signatures"
    )]
    conn.close()
    return agents, signatures


def save_agent(agent: dict):
    conn = get_conn()
    conn.execute("""
        INSERT INTO agents (id, name, avatar, status, public_key, private_key, warn_level, bio, created_at)
        VALUES (:id, :name, :avatar, :status, :public_key, :private_key, :warn_level, :bio, :created_at)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, avatar=excluded.avatar, status=excluded.status,
            warn_level=excluded.warn_level, bio=excluded.bio
    """, agent)
    conn.commit()
    conn.close()


def save_signature(sig: dict):
    conn = get_conn()
    conn.execute("""
        INSERT INTO signatures (signer_id, subject_id, message, signature, timestamp)
        VALUES (:signer_id, :subject_id, :message, :signature, :timestamp)
    """, sig)
    conn.commit()
    conn.close()


def reset_db():
    """Wipe everything — used only by the /api/reset demo endpoint."""
    conn = get_conn()
    conn.execute("DELETE FROM agents")
    conn.execute("DELETE FROM signatures")
    conn.commit()
    conn.close()
