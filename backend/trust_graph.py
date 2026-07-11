"""
The web of trust itself. Trust is never a single number handed out
by a central authority — it's a graph of cryptographically verified
signatures, and trust between two agents who never met is computed
by finding a verified signature path between them (like PGP's Web of Trust).
"""
from collections import deque
from crypto_utils import verify_signature
import store


def get_graph():
    """Returns nodes + edges for visualization. Every edge is a cryptographically verified signature."""
    nodes = [
        {
            "id": a["id"],
            "name": a["name"],
            "avatar": a["avatar"],
            "status": a["status"],
            "warn_level": a["warn_level"],
            "signature_count": sum(1 for s in store.signatures if s["subject_id"] == a["id"]),
        }
        for a in store.agents.values()
    ]

    edges = []
    for sig in store.signatures:
        signer = store.agents.get(sig["signer_id"])
        subject = store.agents.get(sig["subject_id"])
        if not signer or not subject:
            continue
        valid = verify_signature(signer["public_key"], sig["message"], sig["signature"])
        edges.append({
            "from": sig["signer_id"],
            "to": sig["subject_id"],
            "valid": valid,
            "timestamp": sig["timestamp"],
        })

    return {"nodes": nodes, "edges": edges}


def find_trust_path(from_id: str, to_id: str, max_depth: int = 6):
    """
    BFS over VERIFIED signature edges only. An edge only counts if the
    signature independently verifies against the signer's public key —
    a forged or tampered signature simply doesn't exist in this graph.
    Returns the path (list of agent ids) or None if no trust path exists.
    """
    if from_id == to_id:
        return [from_id]
    if from_id not in store.agents or to_id not in store.agents:
        return None

    # Build adjacency list of only cryptographically valid signature edges
    adjacency: dict[str, list[str]] = {aid: [] for aid in store.agents}
    for sig in store.signatures:
        signer = store.agents.get(sig["signer_id"])
        subject = store.agents.get(sig["subject_id"])
        if not signer or not subject:
            continue
        if verify_signature(signer["public_key"], sig["message"], sig["signature"]):
            adjacency[sig["signer_id"]].append(sig["subject_id"])

    visited = {from_id}
    queue = deque([[from_id]])
    while queue:
        path = queue.popleft()
        if len(path) > max_depth:
            continue
        current = path[-1]
        for neighbor in adjacency.get(current, []):
            if neighbor == to_id:
                return path + [neighbor]
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])
    return None


def trust_report(from_id: str, to_id: str):
    path = find_trust_path(from_id, to_id)
    subject = store.agents.get(to_id)
    direct_signatures = sum(1 for s in store.signatures if s["subject_id"] == to_id)
    return {
        "from": from_id,
        "to": to_id,
        "trusted": path is not None,
        "path": path,
        "hops": (len(path) - 1) if path else None,
        "direct_signature_count": direct_signatures,
        "reason": (
            f"Verified signature path of {len(path) - 1} hop(s) found."
            if path else
            "No verified signature path exists — this agent has no cryptographic vouching from anyone you already trust."
        ),
    }
