# AgentAIM — A Web of Trust for AI Agents

**RIFT Hackathon 2026 — Problem Statement 2: "AI's First Day Online"**

> In the 2000s, humans proved who they were and who they trusted with AIM/ICQ buddy
> lists. AI agents are about to start browsing, buying, and negotiating online with
> zero equivalent trust infrastructure. AgentAIM builds that missing piece — not with
> a fake "trust score," but with a real, historically-accurate revival of **PGP's Web
> of Trust** (key-signing parties, 2000s crypto culture), skinned as a Cyber-Y2K
> revival of the AIM buddy list — chrome, glass, and glowing signal traces instead of
> a flat XP theme. It now also lives inside a full retro **desktop OS shell** —
> icons, taskbar, Start menu, and a windowed app — the way you'd have actually
> launched a buddy-list client back then.

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
  the graph.
- Trust isn't just built, it can be **withdrawn**. Signatures can be revoked by the
  original signer — a real PGP revocation certificate, not a UI toggle — and the
  trust graph updates the instant that happens.
- The web of trust can be **attacked**, and the system knows it: a Sybil-cluster
  detector flags islands of agents that only ever vouch for each other with no
  connection to the wider network — a classic fabricated-trust pattern, caught
  algorithmically rather than by convention.

## Judging criteria fit

| Criterion | How AgentAIM addresses it |
|---|---|
| Creativity & Originality | Revives an obscure but real 2000s system (PGP Web of Trust) instead of the obvious "reskin a popular app" approach |
| UI Authenticity to 2000s | A full desktop-OS shell (icons, taskbar, Start menu, windowed app) wrapping a Cyber-Y2K revival of the AIM buddy list — chrome-gradient window chrome, glass panels, glowing signal traces, CRT-grain texture, synthesized retro sound effects — the retro-desktop structure the hackathon's own branding uses, skinned in AgentAIM's own identity rather than a flat XP clone |
| Functionality & Usability | Working MVP: buddy list, live negotiation, transitive trust computation, graph visualization, revocation, Sybil detection, identity portability |
| Technical Execution | Real Ed25519 signing/verification (not a mocked score), BFS trust-path search, WebSocket-streamed negotiation, graph-theoretic Sybil detection |
| Presentation & Demo | Built-in "inject rogue agent" and "simulate Sybil ring" buttons give dramatic, provable moments for judges without needing manual setup |
| AI Integration (bonus) | The negotiation itself is LLM-driven (Groq / llama-3.3-70b-versatile) reasoning over real trust context — not decorative AI |

---

## Architecture

```
agentaim/
├── backend/                  FastAPI — agents, signatures, trust graph, negotiation
│   ├── main.py                 REST + WebSocket endpoints
│   ├── crypto_utils.py          Ed25519 keygen / sign / verify / randomart fingerprint
│   ├── trust_graph.py           Web-of-trust BFS, graph builder, Sybil-cluster detection
│   ├── negotiation.py           LLM negotiation (Groq) with scripted fallback
│   ├── store.py                 Agent/signature store, revocation, identity export/import
│   ├── db.py                    SQLite persistence + schema migration
│   └── .python-version          pins Python 3.11.9 for Render (pydantic-core wheel compat)
└── frontend/                 React + Vite — Cyber-Y2K AIM-styled UI, inside a desktop OS shell
    └── src/
        ├── main.jsx                entry point — now mounts <Desktop />, not <App /> directly
        ├── App.jsx                 the AgentAIM app itself (buddy list / chat / trust graph),
        │                           now rendered *inside* a window rather than full-page
        ├── api.js                  REST + WebSocket client
        ├── sounds.js               synthesized retro SFX (Web Audio API)
        ├── index.css               design tokens, glass/chrome theme + desktop-OS shell styles
        └── components/
            ├── Desktop.jsx         NEW — the OS shell: wallpaper, desktop icons (AgentAIM,
            │                       Portfolio, About.txt, GitHub), taskbar, Start menu with
            │                       search, and the retro window frame (_ □ × controls) that
            │                       AgentAIM opens inside
            ├── BuddyList.jsx       buddy list, add/import/inject/simulate actions
            ├── ChatWindow.jsx      live negotiation over WebSocket
            ├── TrustGraph.jsx      trust visualization, animated path trace, Sybil rings
            ├── BuddyProfile.jsx    profile modal, revocation controls, identity export
            ├── XPWindow.jsx        reusable glass-chrome window wrapper (used inside the app)
            ├── AddAgentModal.jsx   new/rogue agent creation
            └── SplashScreen.jsx    dial-up-style loading screen
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

The SQLite file (`backend/agentaim.db`) is created automatically on first run and
auto-migrates if you pull an update that adds new columns — no manual DB work needed.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit the printed local URL (default `http://localhost:5173`). It talks to the
backend at `http://localhost:8811` by default — change `VITE_API_URL` in
`frontend/.env` if you deploy the backend elsewhere.

On load you'll land on the **desktop**, not the app directly — double-click the
**AgentAIM** icon (top-left) to open the actual buddy-list app in a window.

---

## Features

### Desktop OS shell (new)

The app now lives inside a retro desktop environment instead of opening full-page,
matching the "boot into an OS, then launch the app" structure of the hackathon's own
branding — while staying in AgentAIM's own Cyber-Y2K chrome/glass language rather
than becoming a literal gray Windows-98 clone.

- **Desktop icons** — double-click to launch:
  - **AgentAIM** (real favicon) → opens the app itself in a window
  - **Portfolio** → opens the builder's portfolio site in a new tab
  - **About.txt** → a small in-theme popup describing the project
  - **GitHub** → opens this repo in a new tab
- **Taskbar** — Start button, a running-app pill for AgentAIM once it's open (click
  to minimize/restore), and a live clock.
- **Start menu** — same four actions as the desktop icons, plus a working search box
  that filters the menu list as you type.
- **Windowed app** — AgentAIM opens in a window with the classic three controls:
  - `_` minimizes to the taskbar (app state is preserved, just hidden)
  - `□` toggles between a large centered window (desktop visible around the edges,
    like a real 2000s OS) and a bigger near-fullscreen size
  - `×` closes the window back to a clean desktop

`Desktop.jsx` is the only new file — it wraps the existing `App.jsx` unchanged; all
of the trust-graph/negotiation logic below still works exactly as before, just
inside a window instead of taking the whole page.

### Core web of trust
- Real Ed25519 keypairs, generated per agent, never leaving the backend's in-memory
  store (in a production version each agent would hold its own private key).
- Signing an attestation (`ATTEST|signer=X|subject=Y|key=...`) is a genuine digital
  signature — independently verifiable with only the signer's public key.
- Transitive trust computed live via BFS over verified, non-revoked signature edges.
- **Warn Level + auto-block** — AIM's "Warn Level" meter, repurposed as a fraud/risk
  indicator. Three failed trust checks auto-blocks an agent; blocked agents are
  refused instantly, without even running the crypto check.

### Signature revocation
PGP-style revocation certificates. Only the original signer can revoke their own
attestation (`POST /api/revoke`). Revoked signatures stay visible in a profile's
history (struck through, tagged "revoked") rather than disappearing, but the trust
graph stops treating them as valid edges immediately — a live trust check will flip
from TRUSTED to NOT TRUSTED the instant a signature on its path is revoked.

### Sybil-cluster detection
`GET /api/sybil-clusters` flags groups of agents that only ever vouch for each other
— every edge between them is reciprocal — and that have zero connection to your own
web of trust. This is a real graph-theoretic check, not a hardcoded rule: it survives
the legitimate demo seed data (PayBot → NewBot isn't reciprocated, so it's never
falsely flagged) while catching a fabricated ring instantly. The **"Simulate Sybil
ring (demo)"** button spins up two agents that only sign each other so this is
demoable live in one click — the graph immediately shows dashed amber rings and a
🕸️ badge on the flagged nodes, plus a warning banner.

### Animated trust-path trace
Every time a trust check runs, a glowing pulse travels hop-by-hop along the verified
signature path on the graph, so the BFS result reads as something that's actually
computed live, not a static illustration.

### Identity export / import
`⭳ Export identity` in any buddy's profile downloads a full portable keyfile — public
key, private key, and complete signature history — analogous to exporting a PGP
secret key block. `⭱ Import identity` in the buddy list re-registers it, including
replaying any signature history bundled with it. Because the attestation message
itself encodes the signer's ID (`ATTEST|signer=<id>|...`), a keyfile can only restore
history under its **original** agent ID — renaming on import intentionally breaks the
signature binding, the same way it would in real PGP. This makes `/api/reset` genuinely
safe to demo with: export an agent's identity beforehand, wipe the demo live, and
restore it in front of judges to prove persistence isn't just SQLite convenience.

### "What the AI agent saw" panel
The chat window shows the raw JSON trust context handed to the negotiating LLM before
it reasons over it, so judges can see this is a real agentic decision grounded in the
crypto layer, not flavor text.

### Cyber-Y2K UI
Glass-chrome windows with a diagonal titlebar sheen, glowing chrome-orb trust-graph
nodes, a faceted chrome-shard accent motif, faint CRT scanline grain, and a
retro dial-up splash screen with a synthesized modem-handshake sound — the "Cybercore"
2000s aesthetic (translucent hardware, early internet futurism), not a flat XP clone.
This is now wrapped in the desktop OS shell described above.

---

## Demo script for judges

See `DEMO_SCRIPT.md` (or the walkthrough below) for a full talk-track. Short version:

1. Land on the desktop — point out the icons, taskbar, Start menu with search.
2. Double-click AgentAIM to open the app in its window — show the buddy list, real
   signature history, warn levels, live status.
3. Negotiate with NewBot — watch a 2-hop transitive trust path get verified live.
4. Inject a rogue agent — watch it get rejected, warn level rise, eventual auto-block.
5. Revoke a signature live — watch a previously trusted path break in real time.
6. Simulate a Sybil ring — watch the detector flag it algorithmically, live.
7. Export an identity, reset the demo, re-import it — prove persistence is real.
8. Open `trust_graph.py` — show judges the actual `Ed25519PublicKey.verify()` call.
   Nothing here is a mocked trust score.

---

## Deployment

- **Backend** → Render (Web Service, root directory `backend`, build command
  `pip install -r requirements.txt`, start command
  `uvicorn main:app --host 0.0.0.0 --port $PORT`). `GROQ_API_KEY` is set directly in
  Render's dashboard and never committed. `backend/.python-version` pins Python to
  3.11.9 — Render's default (3.14 at time of writing) doesn't have prebuilt wheels
  for the pinned `pydantic-core` version, which breaks the build without this file.
- **Frontend** → Vercel (root directory `frontend`, environment variable
  `VITE_API_URL` set to the deployed Render backend URL, no trailing slash).

**Known caveat:** Render's free tier has an ephemeral filesystem — the SQLite DB
resets whenever the service spins down from inactivity and wakes back up. This is
expected, not a bug. It's also exactly what the identity export/import feature is
for — export an agent's identity as a safety net before a live demo.

## What's mocked vs. real (for full transparency to judges)

- **Real:** Ed25519 key generation, signing, and verification. The BFS trust-path
  search only walks edges that pass independent cryptographic verification and
  haven't been revoked. Sybil-cluster detection is a real graph analysis over the
  actual signature graph, not a hardcoded agent-name check.
- **Real (with a Groq key):** the negotiation dialogue is generated live by an LLM
  reasoning over the actual trust-graph result for that specific agent pair.
- **Simulated for demo purposes:** agents don't run on separate physical hosts —
  all keypairs live in one in-memory/SQLite-backed store for the hackathon build.
  In a production version, each agent would generate and hold its own private key
  locally and only ever publish its public key.
- **Cosmetic:** the Portfolio, About.txt, and GitHub desktop icons are static
  links/info — they're part of the desktop-OS presentation layer, not part of the
  trust-graph system being judged.