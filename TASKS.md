# Libery task tracker

Updated: 2026-11-02

This is the durable, ordered work queue for Libery. Check off work only after implementation and the relevant validation. Update `PROJECT_PROGRESS.md` when milestone status or evidence changes. Do not record credentials, tokens, private URLs, or user data here.

## Resume here

- [ ] **P1 — Rotate exposed Cloudinary secret.** The previously shared API secret must be replaced in the Cloudinary console and the replacement stored only in ignored `server/.env` or the hosting secret manager. Never copy it into chat, Markdown, `.env.local`, or app code.

## In progress / next

- [ ] **P1 — Complete production deployment configuration.** Configure separate production secrets, restricted Atlas network access and least-privilege DB user, HTTPS API origin, exact CORS origins, trusted proxy hops, backups, and monitoring.
- [ ] **P1 — Review identity and child-safety requirements.** Add reviewed email/account recovery and age/guardian-consent workflows as legally required before enabling those user groups in production. Current age group is self-declared; it is not age verification.
- [ ] **P2 — Add privacy/account lifecycle features.** Design and implement appropriate data export, account deletion, retention, and audit-log retention/export behavior.
- [ ] **P2 — Run release checks.** Run app typecheck/lint, web export, backend tests/typecheck/lint, `npx expo-doctor`, and applicable dependency audits. Exercise MongoDB behavior against a disposable test DB before production.

## Blocked on rights or product decisions

- [ ] **P1 — Select a rights-cleared book-text source.** Identify specific titles and territories with documented rights before building hosted/in-app text reading or offline caching. Current imported records are metadata and source links only.
- [ ] **P1 — Decide whether narration is in scope and source lawful audio/text.** Background and lock-screen playback requires rights for both the work and derivative audio, a playback/backend design, and native-device testing. Do not synthesize or distribute full-book narration without those rights.
- [ ] **P2 — Define provider/catalog cover policy.** Confirm which licenses, attribution, and territorial restrictions are acceptable before importing or serving third-party cover images.

## Colleague continuation prompt

Copy this prompt into the colleague's coding session:

> Continue the Libery mobile app work in this repository. Read `AGENTS.md`, `PROJECT_PROGRESS.md`, `TASKS.md`, and the relevant parts of `BACKEND_SETUP.md` first. Use the first unchecked item under **Resume here** in `TASKS.md` as the assignment. Fix only defects directly related to this task. Then run `npm run typecheck`, `npm run lint`, and `npx expo export --platform web`. Preserve all existing and unrelated user changes. Do not commit, push, switch branches, or expose secrets.
>
> When that task is complete, update `TASKS.md` and `PROJECT_PROGRESS.md` with what you verified, the exact validation outcomes, any unresolved blockers, and the next concrete unchecked task at the top of **Resume here**. If the task reveals that a backend instruction is inaccurate, make only the necessary documentation correction in `BACKEND_SETUP.md`. Never print or copy values from environment files. Do not initialize, seed, or import into a live database without confirming it is the intended environment; do not apply catalog imports without the user's confirmation. Keep catalog entries metadata-only and do not implement book-text download, offline serving, or narration without confirmed territorial rights.

## Completed and verified

- [x] Created `PROJECT_PROGRESS.md` as the project process, architecture, status, resource, validation, and secret-handling handoff.
- [x] Implemented the global header: menu and Libery name on the left; inline expanding search, Notifications, and Profile on the right; no header plus button.
- [x] Implemented the left-sliding, blurred navigation drawer from the menu button, with Home, Discover, Library, and Profile navigation.
- [x] Moved quick-add to the center of the bottom menu and added the quick-add sheet for finding books or creating a provider listing.
- [x] Kept Notifications as a normal route/page.
- [x] Preview-verified the updated header, drawer/blur, quick-add sheet, Notifications page, and Library page.
- [x] Latest app `npm run typecheck`, `npm run lint`, and `npx expo export --platform web` succeeded for the navigation changes.
- [x] Completed app UI smoke test across Home, book details, reader, provider listing, and sign-in routes. Fixed activeTab route normalization in `BottomNavigation`.
- [x] Verified live Atlas connectivity (ping ok), collections (`refresh_sessions`, `admin_audit_events`, `users`, `user_library`, `books`), search and unique indexes, and 2,000 catalog books in Atlas. Verified API health endpoint responds with `{ status: 'ok' }`.
- [x] Verified Project Gutenberg catalog dry run (2,000 metadata records prepared from 79,712 entries). Documented Node 22+ Windows `--use-system-ca` requirement in `BACKEND_SETUP.md`.
- [x] Reviewed security dependency findings: 24 moderate advisories in dev tools (`glob`/`minimatch` via `@expo/cli` and `eslint`). Verified all 20/20 checks in `npx expo-doctor` pass with 0 issues.
- [x] Completed provider cover-upload UX: installed `expo-image-picker` with SDK 58 plugin configuration, updated `apiRequest` to support `FormData` multipart payloads, added image picking with 5 MB / JPEG/PNG/WebP validation, upload to `/provider/covers`, thumbnail preview, and manual URL fallback.
- [x] Connected frontend to live backend catalog with registered-only access gating (unregistered visitors see preview landing; signed-in users unlock full 2,000+ MongoDB Atlas catalog).
- [x] Restructured Homepage with mood-respecting literary quotes, paired books, category chips, and live Atlas catalog grid.
- [x] Implemented intelligent recommendation algorithm in `src/utils/recommendations.ts` scoring books based on user likes, reading shelf history, and profile focus areas ("Tailored to Your Taste", "Because You Enjoy [Category]").
- [x] Built interactive Like, Comment, and Read actions on book cards and quote cards, with cloud library synchronization (`saveItem`) and community discussion sheet (`BookCommentSheet`).
- [x] App `npm run typecheck`, `npm run lint`, `npx expo export --platform web`, and server `npm test` (12 tests) and `npm run typecheck` passed.
- [x] Added a colleague continuation prompt and explicit cross-document handoff rules.
- [x] **Threads/Twitter-style social feed homepage.** Rewrote `src/app/(tabs)/index.tsx` as a Threads-inspired book social feed: composer bar, community posts powered by `literaryQuotes` × Atlas catalog books, mood filter chips, tailored recommendation row, catalog browse with category chips, and guest CTA banner.
- [x] **`ThreadPostCard` component.** New component with 2-column Threads layout (avatar + thread line | content + dark book media card + 4-icon action row). Like syncs to user library, comment opens `BookCommentSheet`, repost and bookmark tracked locally.
- [x] **`QuoteCard` redesign.** Twitter/Threads post layout: author avatar, verified badge, handle, mood tag, quote body, embedded book card with mini cover or icon fallback, 5-action bar.
- [x] **Guest book browsing.** Backend `GET /books` and `GET /books/:id` now use `optionalAuth`; unauthenticated requests default to adults age group and both languages. `CatalogContext` fetches on mount regardless of login state and falls back to sample books only on API failure.
- [x] **MongoDB Atlas Cloud connection.** `server/.env` `MONGODB_URI` points to `libery` database. `MONGODB_DB=libery` added. CORS expanded to include mobile device IP. Verified live: `GET /v1/books?limit=3` returned `total: 2000`.
- [x] App `npm run typecheck` (0 errors) and `npm run lint` (0 errors) verified after all Threads homepage + guest browsing work.
- [x] **User Profile Setup & Photo Upload with Database Persistence.** Extended `User` model with `avatarUrl` and `bio`. Implemented `updateUserProfile` in MongoDB store and test store. Added `PUT /v1/me/profile` and `POST /v1/me/avatar` endpoints (supports Cloudinary and embedded base64 storage directly in MongoDB Atlas). Built interactive Profile setup UI in `src/app/(tabs)/profile.tsx` with photo selection from gallery/camera, preset literary avatars, display name & bio editing, and preferences sync with direct MongoDB Atlas database persistence. Connected avatar photo to home composer and thread posts. Verified with server tests (13/13 passing), typecheck, lint, and live API test against Atlas DB.
- [x] **Community Posts & Interleaved Mixed Feed with Database Persistence.** Implemented `community_posts` in MongoDB Atlas with endpoints `POST /v1/posts`, `GET /v1/posts`, and `POST /v1/posts/:id/like`. Thread composer now persists user posts, book attachments, and reflections directly to MongoDB Atlas. Home feed integrates live DB posts seamlessly into the interleaved Threads-style feed alternating posts, quotes, tailored recommendations, and catalog books, with pull-to-refresh support. Verified with 14/14 server tests passing, 0 typecheck errors, 0 lint errors, and successful web export.

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
