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
    """Returns nodes + edges for visualization. Every edge is a cryptographically
    verified signature; revoked ones are kept (for history) but flagged."""
    nodes = [
        {
            "id": a["id"],
            "name": a["name"],
            "avatar": a["avatar"],
            "status": a["status"],
            "warn_level": a["warn_level"],
            "signature_count": sum(
                1 for s in store.signatures if s["subject_id"] == a["id"] and not s.get("revoked")
            ),
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
            "revoked": bool(sig.get("revoked")),
            "timestamp": sig["timestamp"],
        })

    return {"nodes": nodes, "edges": edges}


def _valid_adjacency():
    """Adjacency of signature edges that are both cryptographically valid
    AND not revoked — the only edges trust is allowed to flow through."""
    adjacency: dict[str, list[str]] = {aid: [] for aid in store.agents}
    for sig in store.signatures:
        if sig.get("revoked"):
            continue
        signer = store.agents.get(sig["signer_id"])
        subject = store.agents.get(sig["subject_id"])
        if not signer or not subject:
            continue
        if verify_signature(signer["public_key"], sig["message"], sig["signature"]):
            adjacency[sig["signer_id"]].append(sig["subject_id"])
    return adjacency


def find_trust_path(from_id: str, to_id: str, max_depth: int = 6):
    """
    BFS over VERIFIED, NON-REVOKED signature edges only. An edge only counts
    if the signature independently verifies against the signer's public key
    AND hasn't been revoked — a forged or withdrawn signature simply doesn't
    exist in this graph.
    Returns the path (list of agent ids) or None if no trust path exists.
    """
    if from_id == to_id:
        return [from_id]
    if from_id not in store.agents or to_id not in store.agents:
        return None

    adjacency = _valid_adjacency()

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
    direct_signatures = sum(
        1 for s in store.signatures if s["subject_id"] == to_id and not s.get("revoked")
    )
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


def detect_sybil_clusters(self_id: str = "shopbot"):
    """
    Flags groups of agents that only ever vouch for each other — every edge
    between them is reciprocal — and that have zero connection to the network
    you (self_id) are actually part of. A legitimate small network (like the
    demo's shopbot/paybot/newbot trio) survives this check because paybot's
    vouch for newbot isn't reciprocated, and because they're all in your own
    component anyway. A fabricated ring of agents that only sign each other,
    off in their own island, gets flagged.
    """
    adjacency: dict[str, set[str]] = {}
    directed_edges: set[tuple[str, str]] = set()

    for sig in store.signatures:
        if sig.get("revoked"):
            continue
        signer = store.agents.get(sig["signer_id"])
        subject = store.agents.get(sig["subject_id"])
        if not signer or not subject:
            continue
        if not verify_signature(signer["public_key"], sig["message"], sig["signature"]):
            continue
        f, t = sig["signer_id"], sig["subject_id"]
        directed_edges.add((f, t))
        adjacency.setdefault(f, set()).add(t)
        adjacency.setdefault(t, set()).add(f)

    def component_of(start: str) -> set:
        seen = {start}
        queue = deque([start])
        while queue:
            n = queue.popleft()
            for nb in adjacency.get(n, ()):
                if nb not in seen:
                    seen.add(nb)
                    queue.append(nb)
        return seen

    self_component = component_of(self_id) if self_id in adjacency else {self_id}

    visited = set(self_component)
    clusters = []
    for node in store.agents:
        if node in visited or node not in adjacency:
            continue
        comp = component_of(node)
        visited |= comp
        if len(comp) < 2:
            continue
        all_reciprocal = all(
            (t, f) in directed_edges
            for (f, t) in directed_edges
            if f in comp and t in comp
        )
        if all_reciprocal:
            clusters.append(sorted(comp))

    return [
        {
            "members": c,
            "names": [store.agents[m]["name"] for m in c if m in store.agents],
        }
        for c in clusters
    ]