# AgentAIM — A Web of Trust for AI Agents

**RIFT Hackathon 2026 — Problem Statement 2: "AI's First Day Online"**

> In the 2000s, humans proved who they were and who they trusted with AIM/ICQ buddy
> lists. AI agents are about to start browsing, buying, and negotiating online with
> zero equivalent trust infrastructure. AgentAIM builds that missing piece — not with
> a fake "trust score," but with a real, historically-accurate revival of **PGP's Web
> of Trust** (key-signing parties, 2000s crypto culture), skinned as a nostalgic AIM
> buddy list.

---

## The idea, in one line

Two AI agents can only transact if a **real, cryptographically verifiable signature
path** connects them — exactly like PGP key-signing parties, except the buddies are
AI agents instead of humans, and the chat window is where you watch them negotiate
and verify trust **live**.

## Why this isn't just "AIM with a trust score bolted on"

- Every agent has a genuine **Ed25519 keypair** (real cryptography, not a mock).
- "Trust" is never a number handed out by a central server. It's an attestation:
  Agent A **digitally signs** Agent B's public key after a successful deal — the
  same mechanism real PGP users used at key-signing parties in the 2000s.
- Two agents who've never met can still transact if there's a **verified signature
  path** between them (transitive trust / "web of trust"), computed live via BFS
  over cryptographically verified edges only.
- A forged or tampered signature is **provably rejected** — it fails independent
  verification against the signer's public key, so it simply isn't a valid edge in
  the graph. This is demoable live (see below).

## Judging criteria fit

| Criterion | How AgentAIM addresses it |
|---|---|
| Creativity & Originality | Revives an obscure but real 2000s system (PGP Web of Trust) instead of the obvious "reskin a popular app" approach |
| UI Authenticity to 2000s | Full Windows XP Luna chrome + AIM buddy-list UX, Tahoma type, beveled windows, synthesized retro sound effects |
| Functionality & Usability | Working MVP: buddy list, live negotiation, transitive trust computation, graph visualization |
| Technical Execution | Real Ed25519 signing/verification (not a mocked score), BFS trust-path search, WebSocket-streamed negotiation |
| Presentation & Demo | Built-in "inject rogue agent" button gives a dramatic, provable rejection moment for judges |
| AI Integration (bonus) | The negotiation itself is LLM-driven (Groq / llama-3.3-70b-versatile) reasoning over real trust context — not decorative AI |

---

## Architecture

```
agentaim/
├── backend/            FastAPI — agents, signatures, trust graph, negotiation
│   ├── main.py          REST + WebSocket endpoints
│   ├── crypto_utils.py   Ed25519 keygen / sign / verify
│   ├── trust_graph.py    Web-of-trust BFS + graph builder
│   ├── negotiation.py    LLM negotiation (Groq) with scripted fallback
│   └── store.py          In-memory agent + signature store, demo seed data
└── frontend/            React + Vite — AIM/XP-styled UI
    └── src/
        ├── App.jsx
        ├── api.js               REST + WebSocket client
        ├── sounds.js             synthesized retro SFX (Web Audio API)
        └── components/
            ├── BuddyList.jsx
            ├── ChatWindow.jsx     live negotiation over WebSocket
            ├── TrustGraph.jsx     the webring-style trust visualization
            ├── XPWindow.jsx       reusable XP chrome wrapper
            └── AddAgentModal.jsx
```

## Running it locally

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8811
```

Optional — for real LLM-driven negotiation instead of the scripted fallback:
```bash
export GROQ_API_KEY=your_key_here   # Windows: set GROQ_API_KEY=your_key_here
```
Without a key set, negotiations still run end-to-end using a deterministic scripted
negotiation, so the demo always works even with zero setup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit the printed local URL (default `http://localhost:5173`). It talks to the
backend at `http://localhost:8811` by default — change `VITE_API_URL` in
`frontend/.env` if you deploy the backend elsewhere.

---

## What's new since v1

- **Key fingerprint randomart** — every agent's public key now renders as a visual
  ASCII fingerprint using the drunken-bishop algorithm (the same technique behind
  `ssh-keygen -lv`), authentic to PGP/SSH crypto culture.
- **Buddy profile window** — double-click any buddy to open a full profile: bio,
  public key, randomart fingerprint, warn level, and complete signature history
  (who vouched for them, who they've vouched for).
- **Warn Level + auto-block** — a real revival of AIM's "Warn Level" meter,
  repurposed as a fraud/risk indicator. Every failed trust negotiation raises an
  agent's warn level; at 3 warnings it's auto-blocked and future negotiation
  attempts are refused instantly, without even running the crypto check.
- **"What the AI agent saw" panel** — the chat window now shows the raw JSON trust
  context handed to the negotiating LLM before it reasons over it, so judges can
  see this is a real agentic decision, not flavor text.
- **SQLite persistence** — agents and signatures now survive server restarts
  (`backend/agentaim.db`, auto-created on first run).
- **Retro dial-up splash screen** — a brief nostalgic "connecting…" screen with a
  synthesized modem-handshake sound on load.
- **Functional window controls** — the × button now actually closes a window; a
  "↺ Restore windows" button reappears in the header when any are closed.
- **`/api/reset` safety net** — one click (or `curl -X POST /api/reset`) wipes the
  demo back to its original 3 seed agents if a live demo goes sideways.

## Demo script for judges (2 minutes)

1. **Show the buddy list** — ShopBot and PayBot are online with a real signature
   history (`2 sig` badges). NewBot is "Away" with just one signature.
2. **Click NewBot → Start negotiation.** Watch ShopBot and PayBot's history let
   ShopBot trust NewBot *transitively* — the trust graph highlights the exact
   2-hop signature path in green.
3. **Click "⚠️ Inject rogue agent"** — creates a brand-new agent with zero
   signatures, claiming to be trustworthy.
4. **Select the rogue agent → Start negotiation.** The web of trust finds **no
   verified path** — the negotiation ends in a hard `VERDICT: REJECT`, the graph
   shows it isolated with a red ring, and a rejection tone plays. Its warn level
   ticks up to 1.
5. **Repeat 2 more times** — warn level hits 3, the agent is auto-blocked (moves
   to a "Blocked" group in the buddy list with a 🚫 icon on the graph). Try
   negotiating with it again — it's refused **instantly**, before any crypto
   check even runs.
6. **Double-click any agent** to open its profile — show the randomart fingerprint
   and full signature history as extra proof this isn't just a UI mockup.
7. **The punchline for judges:** this isn't a scripted "if malicious then reject"
   check — ask to see `trust_graph.py`. Every edge is independently verified
   with `Ed25519PublicKey.verify()`. A forged signature is provably invalid, not
   just flagged by convention.

---

## Deployment

- **Backend** → Render (Web Service, `uvicorn main:app --host 0.0.0.0 --port $PORT`)
- **Frontend** → Vercel (set `VITE_API_URL` to the deployed backend URL)

## What's mocked vs. real (for full transparency to judges)

- **Real:** Ed25519 key generation, signing, and verification. The BFS trust-path
  search only walks edges that pass independent cryptographic verification.
- **Real (with a Groq key):** the negotiation dialogue is generated live by an LLM
  reasoning over the actual trust-graph result for that specific agent pair.
- **Simulated for demo purposes:** agents don't run on separate physical hosts —
  all keypairs live in one in-memory store for the hackathon build. In a
  production version, each agent would hold its own private key and only ever
  publish its public key.
