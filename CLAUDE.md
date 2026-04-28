# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marketing site for "Current at UBC" — a student-run finance/venture networking event at UBC. Static single-page site deployed on Netlify with a waitlist form and two serverless functions.

## Commands

- `npm run dev` — Vite dev server (hot reload)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Serve the production build locally
- No test suite or linter is configured.

## Architecture

**Frontend (single-page):**
- `index.html` — entire site in one file. Vite processes it as the entry point.
- `src/main.js` — all interactivity: form submission handler, GSAP scroll animations (ScrollTrigger), FAQ accordion, hamburger menu, hero spotlight, magnetic buttons. Wrapped in a `prefers-reduced-motion` guard.
- `src/waves.js` — SVG-based simplex noise wave animation in the hero section. Creates a grid of `<path>` elements and animates them via `requestAnimationFrame`.
- `src/style.css` — global styles, CSS custom properties for theming.
- `public/` — static assets copied as-is to `dist/` (favicons, og-image, thank-you.html, privacy.html, `_redirects`).

**Serverless (Netlify Functions):**
- `netlify/functions/submission-created.js` — auto-triggered on Netlify form submission. Filters for the "waitlist" form and posts to Slack via `SLACK_WEBHOOK_URL`.
- `netlify/functions/waitlist-digest.js` — scheduled (Monday 16:00 UTC). Pulls waitlist count from Netlify Forms API, posts a progress digest to Slack. Uses `NETLIFY_ACCESS_TOKEN` and `NETLIFY_SITE_ID`.

**External (not deployed from this repo):**
- `scripts/gmail-notion-sync.gs` — Google Apps Script that syncs outreach threads (Gmail → Notion CRM). Runs on a 15-minute trigger from script.google.com, not from Netlify. Uses `NOTION_TOKEN` and `NOTION_DATABASE_ID` stored in Apps Script properties.

## Key Details

- The waitlist form uses Netlify Forms (`data-netlify="true"`) with a honeypot field. The JS in `main.js:46-59` intercepts submit, POSTs via fetch, and redirects to `/thank-you`.
- The countdown timer is an inline `<script>` in `index.html` (not in the module bundle) targeting `2026-10-22T09:00:00-07:00`.
- GSAP + ScrollTrigger are the animation backbone. The `maskReveal()` helper in `main.js` splits text into word-level `<span>` wrappers for scroll-linked entrance animations.
- The wave animation in `waves.js` is computationally heavy (~24K points/frame on desktop at 8px grid spacing). It runs continuously and does not pause when off-screen.
- Three copies of the same logo PNG are base64-inlined in `index.html`, making the HTML ~1.9 MB.

## Deployment

Netlify auto-builds on push. Config in `netlify.toml`: builds with `npm run build`, publishes `dist/`, functions from `netlify/functions/`. No `_headers` file exists yet.

## Design Philosophy

The "Quiet Arrival" aesthetic documented in `teasers/DESIGN_PHILOSOPHY.md` governs visual decisions: deep navy (`#1B3A6B`), heavy condensed capitals, generous negative space, minimal color palette. Respect this when making UI changes.
