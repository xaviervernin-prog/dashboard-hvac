<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Status: Initial ratification — all placeholders replaced.

Principles added:
  I.   Single-File Architecture
  II.  Security-First (RLS)
  III. UAE Business Rules
  IV.  Supabase-as-Backend
  V.   Zero Build Step / Déploiement continu

Sections added:
  - Technical Constraints
  - Development Workflow

Templates reviewed:
  ✅ .specify/templates/plan-template.md — generic, compatible
  ✅ .specify/templates/spec-template.md — generic, compatible
  ✅ .specify/templates/tasks-template.md — generic, compatible

Deferred TODOs: none
-->

# HVAC Dubai ERP — Constitution

## Core Principles

### I. Single-File Architecture (NON-NEGOTIABLE)

All application code — HTML, CSS, and JavaScript — MUST live in a single file:
`app.html`. No build pipeline, no bundler, no transpiler. This constraint exists
because the app is hosted on GitHub Pages without a server, and the owner is
non-technical.

- The file MUST NOT exceed ~1 500 lines. Beyond that, split into a new versioned
  file rather than adding complexity.
- External dependencies MUST be loaded via CDN only (no npm, no node_modules).
- Features MUST be implemented as vanilla JS functions — no frameworks, no
  component systems.
- Archive files (`hvac-v*.html`, `dashboard-hvac-dubai.html`) MUST NOT be
  modified or deleted.

### II. Security-First (NON-NEGOTIABLE)

Row-Level Security (RLS) on Supabase MUST remain active on every table at all
times.

- All RLS policies MUST use `TO authenticated` — never `TO public` or `allow_all`.
- The `handle_new_user()` trigger MUST keep `SECURITY DEFINER SET search_path =
  public` — removing this causes "Database error saving new user".
- The Supabase anon key is public by design; security is enforced entirely via
  RLS, not by hiding the key.
- New tables MUST have RLS enabled and an `authenticated_only` policy before
  any data is written to them.

### III. UAE Business Rules (NON-NEGOTIABLE)

All financial calculations MUST conform to UAE tax and currency standards.

- VAT rate: **5%** applied to every line item, no exceptions.
- All monetary amounts displayed and stored in **AED**.
- Document numbering follows these fixed formats:
  - Interventions: `INT-YYYY-NNN`
  - Devis (quotes): `DEV-YYYY-NNN`
  - Factures (invoices): `FAC-YYYY-NNN`
  - Articles: `ART-NNNN`
- Numbering sequences MUST be sequential within the year; gaps are not allowed.

### IV. Supabase-as-Backend

Supabase is the sole backend. No other server-side service may be introduced.

- Project: `hdbyydietidgzoudlias`, region: `eu-north-1`.
- Auth: Supabase Auth (email + password). Magic link is disabled — do not
  re-enable without first fixing Site URL in Auth → URL Configuration.
- Google SSO button exists in the UI but the provider is not yet activated in
  the Supabase dashboard — leave it as-is until Xavier activates it.
- All new tables MUST be created via SQL migrations in the Supabase dashboard;
  schema changes are not scripted locally.
- The Supabase JS SDK v2 is loaded from CDN jsdelivr — do not upgrade without
  testing auth flows.

### V. Zero Build Step / Continuous Deployment

The deployment pipeline MUST remain a direct git push with no manual steps.

- Pushing to `staging` branch → auto-deploys to the staging URL.
- Pushing to `main` branch → auto-deploys to the production URL.
- Never push directly to `main` without first validating on `staging`.
- Feature work happens on `claude/*` branches, merged to `staging`, then to
  `main`.

## Technical Constraints

- **Stack**: Vanilla HTML5 / CSS3 / ES2020+ JavaScript. No TypeScript.
- **Auth state**: Managed via `currentUser` global variable, populated from
  `sb.auth.getSession()` at startup and kept in sync via `onAuthStateChange`.
- **Data state**: All loaded data lives in the global `S` object
  (`S.clients`, `S.interventions`, `S.devis`, `S.factures`, etc.).
- **UI rendering**: All modules render via template-literal functions
  (`renderClients()`, `renderDevis()`, etc.) that write directly to
  `innerHTML`. No virtual DOM, no diffing.
- **Navigation**: `goTab(name)` drives all module switching; `TABS` array is
  the single source of truth for which modules exist.
- **Fonts**: Inter (400/500/600/700/800) loaded from Google Fonts CDN.
- **User communication**: All labels, messages, and UI text in **French**.
  Code identifiers (functions, variables) in English.

## Development Workflow

1. Always branch from `staging` for new features.
2. Implement in `app.html` only — one file, one diff.
3. Validate on the staging URL before merging to `main`.
4. Commit messages in English, imperative mood.
5. Never add a feature that requires the owner to change Supabase config
   without documenting the exact dashboard steps to take.
6. When the file approaches 1 400 lines, flag it in the PR description.

## Governance

- This constitution supersedes all other development guidelines.
- Any amendment requires: (a) a written rationale, (b) version bump per
  semantic versioning rules below, (c) update to this file on the working branch.
- **Version bumping**:
  - MAJOR — removal or redefinition of a non-negotiable principle.
  - MINOR — new principle or section added.
  - PATCH — clarifications, wording fixes, non-semantic changes.
- All feature plans MUST include a "Constitution Check" section confirming
  compliance with principles I–V before implementation begins.
- Complexity that violates a principle MUST be justified in the plan's
  "Complexity Tracking" table before it is accepted.

**Version**: 1.0.0 | **Ratified**: 2026-05-19 | **Last Amended**: 2026-05-19
