# Contributing

## Getting started

- Read the root [README.md](README.md) for local setup.
- Use your own Cloudflare resources when running a fork.
- Keep backend and frontend shared types in sync with [shared/protocol.ts](shared/protocol.ts).

## Project invariants

- Do not mutate game state outside `yaniv-backend/src/durable-objects/stateMachine.ts`.
- Public tables must not add the system user as a ghost player in D1 or DO state.
- When resetting a table, clear persisted table players before re-inserting them.
- When adding protocol or game-phase changes, update both the backend and frontend consumers.

## Before opening a PR

- Run backend tests: `cd yaniv-backend && npm test`
- Run frontend lint: `cd yaniv-frontend && npm run lint`
- Run a production frontend build: `cd yaniv-frontend && npm run build`

## Scope

- Small, focused PRs are easier to review.
- If you are changing rules or multiplayer flow, include a short note about the player-visible behavior change.
- For repository-related changes, use GitHub PRs rather than `support@yaniv.games`.
