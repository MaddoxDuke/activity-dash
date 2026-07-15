# CLAUDE.md — Personal Projects Platform

This file describes Maddox's personal VPS platform and its first tenant, the
activity monitoring system. It is written to be reused: copy it into new
project repos and keep the **Platform** section identical everywhere, updating
only the **This Project** section.

---

## Platform (shared across all projects)

### Infrastructure

- **Server:** RackNerd 2 GB KVM VPS (2 vCPU / 2 GB RAM / 35 GB SSD), Ubuntu 24.04 LTS
- **Access:** `ssh vps` (alias configured in `~/.ssh/config` on the Mac → user `maddox`, key auth only; root login and password auth are disabled)
- **Domain:** `maddox-duke.com`
- **Web server:** Caddy (`/etc/caddy/Caddyfile`), automatic HTTPS via Let's Encrypt
- **Process manager:** pm2 (`pm2 list` shows all services; processes persist via `pm2 startup`/`pm2 save`)
- **Database:** single PostgreSQL instance, localhost-only
- **Firewall:** UFW allows only SSH/80/443. Every Node app binds to `127.0.0.1` and is reachable only through Caddy.

### Architecture pattern (one box, many tenants)

Each project = one GitHub repo + one localhost port + one pm2 process + one
Caddy block + one dedicated Postgres user/database.

| Port | Project | Subdomain |
|------|---------|-----------|
| 3000 | activity-api | api.maddox-duke.com |
| —    | activity dashboard (static) | dash.maddox-duke.com |
| 3001 | (next project) | |

**When adding a new service:** claim the next port here, create a dedicated DB
user + database (`sudo -u postgres createuser --pwprompt <proj>_user && sudo -u postgres createdb -O <proj>_user <proj>`),
add a Caddy block, `sudo systemctl reload caddy`, start under pm2 with a clear
name, `pm2 save`. Never share database users between projects.

Static frontends need no port or process — build artifacts go to
`/var/www/<name>` served by a Caddy `file_server` block.

### Development workflow

- **All development happens on the Mac** (`~/dev/<repo>`). The VPS is a runtime,
  not a dev environment. Never author or edit code directly on the server.
- GitHub is the source of truth. The VPS only ever receives code via `git pull`.
- Secrets live in `.env` on the server only (gitignored). Every repo carries a
  `.env.example` with variable names and dummy values.
- Structured missions: work is scoped in mission briefs with explicit
  acceptance criteria. Update this file when conventions or decisions change.

### Deployment

Standard deploy for any Node service:

    ssh vps 'cd ~/apps/<repo> && git pull && npm ci --omit=dev && pm2 restart <name>'

- Verify after deploy: `ssh vps 'pm2 list'` and
  `ssh vps 'pm2 logs <name> --lines 20 --nostream'`
- First-ever start of a new service is manual on the server:
  create `.env`, `pm2 start app.js --name <name>`, `pm2 save`.
- Static frontends: build locally, `rsync` the build output to `/var/www/<name>/`.

### Hard rules for agents

- **Never run destructive commands over SSH** — no `rm -rf`, no `dropdb`, no
  `pm2 delete`, no `ufw`/`sshd` changes.
- **Never auto-apply schema changes against production.** Propose migrations
  and wait for explicit approval.
- Never commit `.env`, credentials, or API keys.
- Keep services small and single-purpose; new capability that isn't clearly
  part of an existing service gets its own repo and port.
- Backups: nightly `pg_dump` cron on the server, pulled off-box periodically.
  Any schema change should consider restore compatibility.

---

## This Project: Whereabouts (activity dashboard)

### Purpose

The reading layer of the activity monitoring system. A static Angular app at
`dash.maddox-duke.com` that renders the event log from
`api.maddox-duke.com` as a personal almanac: where the time went, day by
day and week by week. Ingest stays in `activity-api`; **all interpretation
(pairing, aggregating) lives here, client-side.**

### Stack & commands

- Angular 22, zoneless, signals, standalone components. No UI kit, no chart
  library — every visual is hand-rolled HTML/CSS; keep it that way.
- Fonts self-hosted via `@fontsource` (Fraunces Variable, IBM Plex Mono).
- `npm start` — dev server on :4200 (CORS from localhost is allowed by the API)
- `npx ng test --watch=false` — vitest unit tests (derive layer + gate)
- `npm run deploy` — build then rsync `dist/activity-dash/browser/` to
  `vps:/var/www/dash/` (Caddy serves it; no pm2 process, no port)

### Architecture

- `src/app/lib/derive.ts` — pure, unit-tested pairing logic. Arrivals close
  any open stay elsewhere ('inferred'); `left_X` closes explicitly; stays
  over 16 h are *gaps* excluded from stats ("a missed event is a gap, never
  corruption"). Journeys = explicit departure → next arrival within 3 h.
- `src/app/lib/demo.ts` — seeded specimen generator behind `?demo=1`.
- `src/app/store.ts` — signal store: key gate (localStorage
  `whereabouts.key`, verified against the API), 5-min refresh, 30-s clock,
  selected-day state.
- `src/app/ui/*` — one component per folio section; structure only.
  **All styling lives in `src/styles.scss`** so the design system stays in
  one place.

### Design language — "nocturnal field almanac"

Warm near-black paper (`--paper`), bone ink, brass fittings; engraved
hairline rules, machined mono numerals, editorial Fraunces headings; grain
overlay, no glow, no glassmorphism, no card grids, no rounded-corner soup.
Place hues: work steel, gym ember, home dry olive, shop brass. New sections
follow the folio pattern (roman numeral · serif title · mono note).
Respect `prefers-reduced-motion` for any new animation.

### Auth model

The API key is the only secret; it never ships in the bundle. The gate
verifies a pasted key with a live request and keeps it in localStorage.
Public visitors see only the gate (or specimen pages) — safe because the
site is static and the API rejects keyless reads.
