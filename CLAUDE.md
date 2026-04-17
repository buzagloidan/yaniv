# Yaniv — Project Context for Claude

## What this is
Multiplayer Hebrew card game (יניב). Server-authoritative, real-time via WebSockets.
All game logic runs in Cloudflare Durable Objects. Clients only send intents.

## Public presence
- **Demo site**: Live URL intentionally omitted from this file
- **Backend**: Cloudflare Workers deployment
- **GitHub**: Repository URL intentionally omitted from this file

## Stack
| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind v4 + Framer Motion + Zustand |
| Backend | Cloudflare Workers + Hono router |
| Game state | Cloudflare Durable Objects (hibernatable WebSockets + alarms) |
| Database | Cloudflare D1 (SQLite) — lobby/table metadata only |
| Sessions | Cloudflare KV |
| Auth | Guest nickname sessions (`/auth/dev`) |

## Project structure
```
yaniv/
├── yaniv-backend/
│   ├── src/
│   │   ├── durable-objects/
│   │   │   ├── GameTable.ts        # main DO — WS handling, HTTP internal routes
│   │   │   ├── stateMachine.ts     # pure state transitions (no I/O)
│   │   │   ├── gameLogic.ts        # card validation, bot AI, hand scoring
│   │   │   ├── broadcastManager.ts # WebSocket map + snapshot builder
│   │   │   └── validator.ts        # move validation
│   │   ├── routes/
│   │   │   ├── lobbyRoutes.ts      # GET/POST /tables, /join, /add-bot
│   │   │   ├── authRoutes.ts
│   │   │   └── gameRoutes.ts       # /game/:id/ws WebSocket upgrade
│   │   ├── db/queries.ts           # all D1 queries
│   │   ├── shared/
│   │   │   ├── types.ts            # shared types (also copied to frontend)
│   │   │   └── constants.ts        # DEFAULTS object — all tunable values
│   │   └── index.ts                # Hono app entry
│   └── wrangler.toml
└── yaniv-frontend/
    └── src/
        ├── components/
        │   ├── auth/SignInPage.tsx
        │   ├── lobby/LobbyPage.tsx
        │   └── game/
        │       ├── GamePage.tsx
        │       ├── ActionBar.tsx   # discard/yaniv/bot buttons
        │       ├── DiscardPile.tsx
        │       ├── PlayerHand.tsx
        │       └── OpponentSeat.tsx
        ├── store/gameStore.ts      # Zustand — all client game state
        ├── networking/
        │   ├── api.ts              # REST calls (reads VITE_API_URL)
        │   └── wsManager.ts        # WebSocket with ping/reconnect
        └── shared/types.ts         # keep in sync with backend types.ts
```

## Cloudflare resources
- Resource identifiers are intentionally omitted from this file.
- Use local config or repository secrets/variables outside the public docs when wiring deployments.

## Key architecture decisions

### Public tables
- 5 permanent public tables seeded lazily on `GET /tables`
- Hosted by system user (`system_yaniv`) in D1, but NO ghost player in DO state
- `isPublicTable: true` in `InitTablePayload` → `null` host in `initGameState`
- First real player to join becomes host

### Table lifecycle
`waiting_for_players` → game starts (2+ players ready) → `player_turn_discard/draw` → ... → `game_over` → 15s alarm → `resetTableState` → back to `waiting_for_players`
- `clearTablePlayers()` called on reset so D1 player count stays accurate
- `waitingPlayers` queue for mid-game joins; merged into next round on reset

### Bot players
- Added via `POST /tables/:code/add-bot` → DO `/internal/add-bot`
- Always `isConnected: true`; driven by DO alarm at `BOT_THINK_MS` (1400ms)
- `alarm()` checks if current player `isBot` → `handleBotPlay` vs `handleTurnTimeout`
- Bot AI: tries all valid discard combinations (sets/runs), picks max point removal; calls Yaniv if hand ≤ threshold

### Game flow invariant
State is mutated only in `stateMachine.ts` pure functions. `GameTable.ts` calls them, then broadcasts. Never mutate state directly in route handlers.

## Frontend design
- **Theme**: Island/tropical vacation — NOT casino/poker
- **Colors**: `--cream #FFFBF0`, `--ocean #0891B2`, `--coral #F26419`, `--sand #E8D5B7`, `--navy #0C4A6E`
- **Font**: Syne (headings) + Noto Sans Hebrew (body) — loaded via Google Fonts in `index.css`
- **Game table**: warm sandy `.felt` class (not green felt)
- **Language**: Hebrew throughout, RTL layout
- Framer Motion used for all transitions

## TypeScript rules
- `erasableSyntaxOnly` is enabled — do NOT use `private readonly param` shorthand in constructors; declare fields separately
- Tailwind v4: uses `@import "tailwindcss"` in CSS, no `tailwind.config.js`
- No `@apply` with custom component classes — write utilities inline

## API conventions
- All REST requests go through `api.ts` → `request()` helper (handles auth header, JSON parse errors)
- `VITE_API_URL` env var sets the backend base URL (empty string = same origin, used in local dev with Vite proxy)
- WebSocket URL derived from `VITE_API_URL` in `wsManager.ts`: `https://` → `wss://`

## Deployment workflow
```
git push origin main
  → yaniv-frontend/** changes  → frontend hosting rebuilds
  → yaniv-backend/** changes   → GitHub Action runs wrangler deploy
```
Deployment credentials and resource identifiers are intentionally omitted from this file.

## Common mistakes to avoid
- **Never** add the system user as a player in D1 (`addTablePlayer`) for public tables
- **Never** mutate `GameState` outside `stateMachine.ts`
- **Always** call `clearTablePlayers()` before re-inserting players on table reset
- `types.ts` is duplicated between backend and frontend — keep them in sync manually
- Bot names/count come from `DEFAULTS.BOT_NAMES` — don't hardcode elsewhere
- When adding new `GamePhase` values, update both `shared/types.ts` files
