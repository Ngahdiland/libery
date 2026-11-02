# Libery project process, progress, and resources

This document is the working handoff for building and validating Libery. Update the status and evidence here when a milestone changes; never record live credentials or tokens.

Last reviewed: 2026-11-02

**Continuation:** Use [`TASKS.md`](TASKS.md) as the ordered backlog and its **Colleague continuation prompt** to hand off implementation. At every handoff or context/usage limit, update this file, `TASKS.md`, and—when backend setup changes—[`BACKEND_SETUP.md`](BACKEND_SETUP.md). Keep this file's milestone statuses accurate and leave the next concrete action at the top of `TASKS.md`. Resume with the first unchecked task; do not repeat checked tasks unless new evidence shows a regression.

## Project process

1. **Confirm scope and rights.** Keep catalog metadata separate from book files. Only display, store, read, or narrate book content when distribution and derivative-audio rights are confirmed for the relevant territories.
2. **Configure services securely.** Run the API as the only client of MongoDB Atlas. Keep database, JWT, admin, and Cloudinary secrets in `server/.env` or a hosting secret manager. Expose only the API origin to the mobile app.
3. **Implement one user flow at a time.** Build mobile-first screens with Expo Router, connect them to typed API/context layers, and preserve guest-library behavior.
4. **Validate each milestone.** Run the narrow relevant tests, then app typecheck/lint and a web export. Smoke-test navigation and flows in the preview and on native devices when native modules are involved.
5. **Prepare release only after operational checks.** Verify production secrets, Atlas access restrictions, HTTPS/CORS, content rights, privacy and account-management requirements, and monitoring before public launch.

## Current progress

| Area | Status | Notes / next evidence |
|---|---|---|
| Expo app and API foundation | Implemented and verified | Expo Router app and separate Node API verified. API health endpoint confirmed responding `{ status: "ok" }`. |
| MongoDB Atlas model | Verified live | Atlas ping succeeded (`{ ok: 1 }`). Collections verified: `users`, `refresh_sessions`, `books`, `admin_audit_events`, `user_library`. Unique and text search indexes verified. 2,000 catalog books present in `libery` database. |
| Authentication and cloud library | Implemented | API supports reader/provider registration, login, refresh, preferences, and per-user shelves/progress. Mobile refresh tokens use SecureStore; web keeps tokens in memory. |
| Catalog | Metadata-only import path verified | Gutenberg importer dry-run verified (processed 79,712 catalog entries; prepared 2,000 records). 2,000 records verified in live database with metadata-only source links. |
| Guest book browsing | Implemented and verified | `GET /books` and `GET /books/:id` use `optionalAuth`; unauthenticated requests default to adults/both languages. `CatalogContext` fetches on mount regardless of auth state. Verified live: `total: 2000`. |
| Threads-style social homepage | Implemented and verified | `src/app/(tabs)/index.tsx` features Threads-inspired book social feed: composer bar with Atlas catalog attachment, community posts, interleaved book rows, mood filter chips, and recommendation row. |
| Community posts & feed persistence | Implemented and verified | `community_posts` collection in MongoDB Atlas. `POST /v1/posts`, `GET /v1/posts`, `POST /v1/posts/:id/like`. Direct database persistence with author avatar, book reference, and likes. Interleaved mixed feed with pull-to-refresh. |
| User Profile & Photo Upload | Implemented and verified | Full profile setup in `src/app/(tabs)/profile.tsx` with photo picker (gallery/camera/presets/removal), bio, display name, reading stats, preferences sync, and direct MongoDB Atlas database persistence (`PUT /v1/me/profile`, `POST /v1/me/avatar`). |
| In-app book reading / offline content | Pending rights-cleared content source | Do not download or serve third-party PDFs/EPUBs or cache full text until rights for each title and territory are confirmed. |
| Background narration | Not integrated | Requires a rights-cleared text/audio source and native/background playback design. Validate Expo SDK-specific APIs before implementation. |
| Cover images | Implemented in-app and API | In-app image picker (`expo-image-picker`) and multipart upload flow implemented with 5 MB / JPEG/PNG/WebP validation, thumbnail preview, replace/remove actions, and public HTTPS URL fallback. Server Cloudinary integration ready. |
| Global header and bottom menu | Implemented and verified | Header has menu + Libery on left, inline search, notifications, and profile on right. Bottom menu has Home, Discover, centered Add, Library, Profile. Chrome appears on normal routes and excluded on sign-in/auth routes. |
| Navigation drawer and quick add | Implemented and verified | Menu opens left-side drawer at 40% width with blurred backdrop. Centered Add opens quick-add sheet. Active tab detection normalized across grouped and root pathnames. |
| App validation | Fully verified | App `npm run typecheck` (0 errors), `npx eslint src/` (0 errors) verified. Server `npm test` (14/14 tests passing) and `npm run typecheck` (0 errors) passed. Web export (`npx expo export --platform web`) compiled all 15 bundles successfully. |
| Production readiness | In progress | Pending: Cloudinary secret rotation, production CORS/TLS/Atlas access restrictions, account recovery and age-consent workflows, data export/deletion lifecycle, and monitoring before launch. |

## Architecture and important paths

- `src/app/`: Expo Router screens and layouts.
- `src/components/`: reusable book cards, covers, header actions, and bottom navigation.
- `src/context/`: authentication, catalog, reading library, reader preferences, and blur-target state.
- `src/api/`: typed mobile API client.
- `server/src/`: API, authentication, MongoDB models/indexes, catalog importer, and tests.
- `BACKEND_SETUP.md`: Atlas, server configuration, catalog import, API, Cloudinary, and operational instructions.
- `server/.env.example` and `.env.example`: templates only; never put real credentials in these files.

The mobile app talks to the API configured by `EXPO_PUBLIC_API_URL`. The API talks to Atlas using `MONGODB_URI` and `MONGODB_DB`. Cloudinary uploads use server-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

## Resources

- MongoDB Atlas Console: <https://cloud.mongodb.com/>
- Cloudinary Console: <https://console.cloudinary.com/>
- Expo SDK 58 documentation: <https://docs.expo.dev/versions/v58.0.0/>
- Expo Router introduction: <https://docs.expo.dev/router/introduction/>
- Expo EAS documentation: <https://docs.expo.dev/eas/>
- Project Gutenberg catalog feeds: <https://www.gutenberg.org/ebooks/offline_catalogs.html>
- Project Gutenberg catalog/robot policy: <https://www.gutenberg.org/policy/robot_access.html>
- Project Gutenberg license and territorial limits: <https://www.gutenberg.org/policy/license.html>
- Standard Ebooks: <https://standardebooks.org/about>
- Open Library API usage guidance: <https://openlibrary.org/developers/api>
- Google Books API terms: <https://developers.google.com/books/terms>
- Internet Archive metadata API: <https://archive.org/developers/metadata.html>

## Local verification checklist

Run from the repository root unless a command explicitly uses `--prefix server`:

```powershell
npm run typecheck
npm run lint
npx expo export --platform web
npm test --prefix server
npm run typecheck --prefix server
npm run lint --prefix server
```

For service verification, check `GET /health`, run `npm run db:init --prefix server` against the intended database, and inspect the Gutenberg import dry-run before applying it. For the UI, verify Home, Discover, book details, reader, provider listing, and sign-in; confirm the fixed header/bottom menu exclusions and the drawer's position, width, and blur.

## Secret handling

- Never place secrets in this document, source files, screenshots, app bundles, or `EXPO_PUBLIC_*` variables.
- The Cloudinary API secret previously shared in conversation must be rotated before enabling uploads. Store the replacement only in ignored `server/.env` or the deployment secret manager.
- Generate distinct high-entropy JWT and admin secrets locally. Rotating the JWT signer invalidates existing access tokens.
- Restrict Atlas network access to the API host and grant the database user only the required database permissions. Do not use unrestricted network access for production.
