# DEXO — Launch Kit

## Master checklist (T-minus schedule)
**T-14 days**
- [ ] Repo public-ready: README, LICENSE (MIT), CONTRIBUTING, CoC, security policy, issue/PR templates, labels
- [ ] `npx create-dexo-app` works cold on Mac/Linux/Windows; Docker compose one-liner verified
- [ ] Docs live: quick start ≤ 10 min to running app; API reference complete
- [ ] Website live with OG images; status page up; Discord server structured
- [ ] Demo instance (demo.dexo.dev) seeded with realistic data, auto-resets hourly

**T-7 days**
- [ ] Product Hunt teaser page live, "notify me" link shared
- [ ] 6 PH gallery images + 60s launch video exported
- [ ] Email sequence loaded (waitlist warm-up + launch-day)
- [ ] 10 friendly developers briefed for day-one feedback (not vote-begging)
- [ ] Press release + press kit to 5 dev-news outlets under embargo

**Launch day (Tuesday, 00:01 PT)**
- [ ] Product Hunt post live → founder comment posted within 5 min
- [ ] Show HN posted 06:00–08:00 PT (see template)
- [ ] X thread, LinkedIn post, Discord @everyone, waitlist email — staggered 30 min apart
- [ ] Reddit posts (r/selfhosted, r/opensource, r/SaaS) — tailored per sub, not cross-posted verbatim
- [ ] Founder available all day for comments; target < 15 min reply time

**T+7**
- [ ] Launch retro post ("what launch week taught us") · thank-you thread · roadmap reveal · first community call

## Product Hunt
- **Tagline (60 ch):** Open-source white-label multi-tenant SaaS platform
- **Description:** DEXO ships everything a SaaS needs before its first feature — multi-tenancy, auth, orgs, RBAC, billing, custom domains, theme engine, webhooks — as self-hostable open source. `npx create-dexo-app` to a running platform in 3 minutes.
- **First comment (founder):** the origin story (14 months, why open source, what's next) + explicit ask for feedback, not votes.
- Gallery: 1 hero card, 2 dashboard shots, 1 theme-engine GIF, 1 architecture diagram, 1 terminal quick-start.

## Show HN template
> **Show HN: DEXO – Open-source white-label multi-tenant SaaS platform**
> Body: what it is (2 sentences) → why we built it (the rebuilt-plumbing problem) → technical meat: tenant isolation model, how billing/webhooks/domains work, stack choices and trade-offs → what's rough/missing (honesty wins HN) → links: repo, docs, live demo. No marketing language.

## Reddit angles
r/selfhosted: "self-host your own SaaS platform core" · r/opensource: license/governance/roadmap transparency · r/SaaS: time-to-launch economics · r/webdev: architecture write-up link.

## Email campaign (waitlist)
1. **T-7 "It's almost here"** — date reveal + one screenshot.
2. **Launch day** — subject: "DEXO is open source, starting now" · repo + PH links, 3-bullet value, one CTA.
3. **T+3 "The 10-minute tour"** — quick-start walkthrough video.
4. **T+10 "What you built already"** — community showcase + roadmap reveal.

## Founder announcement (LinkedIn/personal)
First-person origin story: the problem you lived, the 14 months, the decision to open-source, what "white-label multi-tenant" means in one paragraph, gratitude, single CTA to the repo.

## Community & Discord launch
Channels: #announcements #general #help #showcase #contributors #roadmap. Launch-week events: day-2 live architecture walkthrough, day-4 "office hours", day-7 first community call. Contributor funnel: `good first issue` × 15 prepared before launch.

## KPIs (week 1)
2,000 GitHub stars · 500 Discord members · 150 quick-start completions (telemetry-free proxy: docs page depth) · 10 external PRs · PH top-5 of the day.
