# Libery task tracker

Updated: 2026-11-02

This is the durable, ordered work queue for Libery. Check off work only after implementation and the relevant validation. Update `PROJECT_PROGRESS.md` when milestone status or evidence changes. Do not record credentials, tokens, private URLs, or user data here.

## Resume here

- [ ] **P1 — Finish the app UI smoke test.** In the live Expo preview, check Home, a book detail, the reader, provider listing, and sign-in after the header/drawer/bottom-add changes. Verify chrome appears on normal pages and remains hidden on sign-in/setup/onboarding routes. Record any defects below or fix them and rerun app typecheck/lint.

## In progress / next

- [ ] **P1 — Verify the configured backend against the intended environment.** Check API `GET /health`; confirm the API can connect to the configured MongoDB Atlas database without printing or exposing the URI. Run the database initializer only against the intended database. Confirm collection/index state and the catalog count; perform the Gutenberg importer dry-run and inspect counts before applying any import.
- [ ] **P1 — Review security-sensitive dependency findings.** Investigate the moderate npm audit findings noted after installing `expo-blur`. Identify affected packages and available compatible fixes; do not use force upgrades or make unrelated dependency changes.
- [ ] **P1 — Complete the provider cover-upload UX.** Add an in-app image-selection and multipart-upload flow for verified providers, using Expo SDK 58-compatible packages/APIs. Preserve server-only Cloudinary credentials and existing rights checks. Validate upload errors, 5 MB/type constraints, and cover URL persistence.

## Blocked on rights or product decisions

- [ ] **P1 — Select a rights-cleared book-text source.** Identify specific titles and territories with documented rights before building hosted/in-app text reading or offline caching. Current imported records are metadata and source links only.
- [ ] **P1 — Decide whether narration is in scope and source lawful audio/text.** Background and lock-screen playback requires rights for both the work and derivative audio, a playback/backend design, and native-device testing. Do not synthesize or distribute full-book narration without those rights.
- [ ] **P2 — Define provider/catalog cover policy.** Confirm which licenses, attribution, and territorial restrictions are acceptable before importing or serving third-party cover images.

## Production readiness

- [ ] **P1 — Rotate exposed Cloudinary secret.** The previously shared API secret must be replaced in the Cloudinary console and the replacement stored only in ignored `server/.env` or the hosting secret manager. Never copy it into chat, Markdown, `.env.local`, or app code.
- [ ] **P1 — Complete production deployment configuration.** Configure separate production secrets, restricted Atlas network access and least-privilege DB user, HTTPS API origin, exact CORS origins, trusted proxy hops, backups, and monitoring.
- [ ] **P1 — Review identity and child-safety requirements.** Add reviewed email/account recovery and age/guardian-consent workflows as legally required before enabling those user groups in production. Current age group is self-declared; it is not age verification.
- [ ] **P2 — Add privacy/account lifecycle features.** Design and implement appropriate data export, account deletion, retention, and audit-log retention/export behavior.
- [ ] **P2 — Run release checks.** Run app typecheck/lint, web export, backend tests/typecheck/lint, `npx expo-doctor`, and applicable dependency audits. Exercise MongoDB behavior against a disposable test DB before production.

## Completed and verified

- [x] Created `PROJECT_PROGRESS.md` as the project process, architecture, status, resource, validation, and secret-handling handoff.
- [x] Implemented the global header: menu and Libery name on the left; inline expanding search, Notifications, and Profile on the right; no header plus button.
- [x] Implemented the left-sliding, blurred navigation drawer from the menu button, with Home, Discover, Library, and Profile navigation.
- [x] Moved quick-add to the center of the bottom menu and added the quick-add sheet for finding books or creating a provider listing.
- [x] Kept Notifications as a normal route/page.
- [x] Preview-verified the updated header, drawer/blur, quick-add sheet, Notifications page, and Library page.
- [x] Latest app `npm run typecheck`, `npm run lint`, and `npx expo export --platform web` succeeded for the navigation changes.

## Continuation rules

1. Start with **Resume here** and handle the first unchecked item. Do not rerun completed tasks without a reason.
2. Before coding, inspect current repository state and preserve unrelated user changes.
3. Keep the app connected to MongoDB only through the authenticated API; keep all private credentials server-side.
4. Update this tracker and `PROJECT_PROGRESS.md` after meaningful work, including exact validation outcomes and any blocker. Leave the next actionable task at the top of **Resume here**.
5. Do not claim Atlas, Cloudinary, production, offline reading, or background narration is operational unless it has been tested with the appropriate configured service and cleared rights.

## Key project documents

- [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) — process, architecture, milestones, resources, validation, and security notes.
- [`BACKEND_SETUP.md`](BACKEND_SETUP.md) — Atlas/API setup, catalog importer, provider API, Cloudinary, and deployment guidance.
- [`AGENTS.md`](AGENTS.md) — repository-specific development requirements.
