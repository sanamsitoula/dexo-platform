# DEXO — Open Source Kit

## README.md (drop-in)
```markdown
<p align="center"><img src="assets/dexo-mark.svg" width="96" alt="DEXO"></p>
<h1 align="center">DEXO</h1>
<p align="center"><b>Ship your SaaS, not your scaffolding.</b><br>
The open-source white-label multi-tenant SaaS platform.</p>
<p align="center">
  <a href="LICENSE">MIT</a> · <a href="https://dexo.dev/docs">Docs</a> ·
  <a href="https://demo.dexo.dev">Live demo</a> · <a href="https://discord.gg/dexo">Discord</a>
</p>

## What is DEXO?
Everything a SaaS needs before its first feature — as open source you own:
🏢 Multi-tenancy & isolation · 🎨 White-label theme engine · 🔐 Auth, orgs & RBAC ·
💳 Subscription billing · 🌐 Custom domains · ⚡ REST API & webhooks ·
📦 Storage & notifications · 🖥 Admin panel · 🌍 Localization · 🔌 Plugin-ready

## Quick start
    npx create-dexo-app my-platform
    cd my-platform && docker compose up
Open http://localhost:3000 — you have a multi-tenant SaaS running.

## Deploy
Docker · Kubernetes (Helm chart) · one-click cloud templates → [deployment docs](https://dexo.dev/docs/deploy)

## Architecture / Contributing / Security / License
See docs/architecture.md · CONTRIBUTING.md · SECURITY.md · MIT
```

## CONTRIBUTING.md (outline)
Ways to contribute (code, docs, translations, triage) → dev setup (`pnpm i && docker compose up -d db && pnpm dev`) → branch naming `feat|fix|docs/scope-summary` → Conventional Commits required → PR checklist (tests, docs, changeset) → review SLA: first response within 72h → where to ask (Discord #contributors).

## Issue templates
- `bug_report.yml`: version, deployment method (Docker/K8s/source), repro steps, expected/actual, logs.
- `feature_request.yml`: problem statement, proposed solution, alternatives, willingness to PR.
- `config.yml`: route questions to Discussions/Discord, security to SECURITY.md.

## PR template
Summary · Linked issue (`Closes #`) · Type (feat/fix/docs/chore) · Screenshots for UI · Checklist: tests pass, docs updated, changeset added, no breaking change (or labeled `breaking`).

## SECURITY.md
Supported versions table · report privately to security@dexo.dev (no public issues) · 48h acknowledgment, 90-day coordinated disclosure · Hall of Fame for reporters.

## CODE_OF_CONDUCT.md
Adopt Contributor Covenant 2.1 verbatim; enforcement contact conduct@dexo.dev.

## FUNDING.yml
```yaml
github: [dexo-platform]
open_collective: dexo
```
Sponsor tiers: $5 supporter (Discord badge) · $50 backer (README logo, small) · $500 sponsor (website logo + monthly office hours) · custom enterprise sponsorships.

## GitHub labels
`good first issue` `help wanted` `bug` `feature` `docs` `breaking` `needs-triage` `needs-repro` `area:tenancy` `area:billing` `area:auth` `area:theme` `area:api` `area:deploy` — colors: areas in Indigo shades, states in semantic colors.

## Discussions categories
📣 Announcements (locked) · 💡 Ideas · 🙏 Q&A · 🏗 Show and tell · 🗺 Roadmap · 🌍 Translations.
