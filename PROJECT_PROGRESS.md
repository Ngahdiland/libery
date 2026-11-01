# Libery project process, progress, and resources

This document is the working handoff for building and validating Libery. Update the status and evidence here when a milestone changes; never record live credentials or tokens.

**Continuation:** Use [`TASKS.md`](TASKS.md) as the ordered backlog. At every handoff or context/usage limit, update both documents: keep this file's milestone statuses accurate, and leave the next concrete action at the top of `TASKS.md`. Resume with the first unchecked task; do not repeat checked tasks unless new evidence shows a regression.

## Project process

1. **Confirm scope and rights.** Keep catalog metadata separate from book files. Only display, store, read, or narrate book content when distribution and derivative-audio rights are confirmed for the relevant territories.
2. **Configure services securely.** Run the API as the only client of MongoDB Atlas. Keep database, JWT, admin, and Cloudinary secrets in `server/.env` or a hosting secret manager. Expose only the API origin to the mobile app.
3. **Implement one user flow at a time.** Build mobile-first screens with Expo Router, connect them to typed API/context layers, and preserve guest-library behavior.
4. **Validate each milestone.** Run the narrow relevant tests, then app typecheck/lint and a web export. Smoke-test navigation and flows in the preview and on native devices when native modules are involved.
5. **Prepare release only after operational checks.** Verify production secrets, Atlas access restrictions, HTTPS/CORS, content rights, privacy and account-management requirements, and monitoring before public launch.

## Current progress

| Area | Status | Notes / next evidence |
|---|---|---|
| Expo app and API foundation | Implemented | Expo Router app and a separate Node API are present. The client must not connect directly to Atlas. |
| MongoDB Atlas model | Implemented; live connection needs environment verification | API startup initializes indexes for users, refresh sessions, books, audit events, and user library. Confirm actual connection and seed/import results in the configured environment. |
| Authentication and cloud library | Implemented | API supports reader/provider registration, login, refresh, preferences, and per-user shelves/progress. Mobile refresh tokens use SecureStore; web keeps tokens in memory. |
| Catalog | Metadata-only import path implemented | Gutenberg importer has dry-run and apply modes. Imported entries link to their source; this is not a library of hosted full-text books. |
| In-app book reading / offline content | Pending rights-cleared content source | Do not download or serve third-party PDFs/EPUBs or cache full text until rights for each title and territory are confirmed. |
| Background narration | Not integrated | Requires a rights-cleared text/audio source and native/background playback design. Validate Expo SDK-specific APIs before implementation. |
| Cover images | Partially implemented | The API supports verified-provider uploads to Cloudinary; the current provider form can also accept a public HTTPS URL. In-app image picking/upload remains pending. Category-themed local artwork is the fallback. |
| Global header and bottom menu | Implemented; partially preview-verified | Header has menu + Libery on the left and inline search, notifications, and profile on the right. Notifications opens its own page. Bottom menu has Home, Discover, centered Add, Library, and Profile. Sign-in omits the app chrome. Discover, Library, and Notifications routes have been checked in preview. |
| Navigation drawer and quick add | Implemented and preview-verified | Menu opens a left-side drawer at about 40% width with the remaining surface visibly blurred. Centered Add opens a quick-add sheet for finding a book or creating a provider listing. |
| App validation | Partial | Latest app typecheck/lint and web export passed. Backend typecheck/tests passed earlier (12 tests). Preview verified the updated header, navigation drawer/blur, quick-add sheet, Notifications page, and Library route. Still smoke-test Home, book details, reader, provider listing, and sign-in after the final navigation update. |
| Production readiness | Pending | Review dependency audit findings; add/verify account recovery, email/guardian-consent workflows as applicable, privacy export/deletion, operational monitoring, and production configuration. |

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
