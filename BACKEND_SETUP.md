# Libery backend setup

The API is a separate Node.js service under `server/`; MongoDB is its database. The Expo app connects to this API for sign-in and the protected catalog. It must never connect directly to Atlas.

**Handoff:** This file documents setup steps; it does not prove a live Atlas connection, a successful catalog import, or that Cloudinary is configured. Record verified outcomes in [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md), and track remaining work in [`TASKS.md`](TASKS.md). Never copy secret values into those files.

## 1. Create a MongoDB database

1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/) and create a project.
2. Deploy a cluster appropriate for development. Atlas may offer a free development tier; confirm current region, storage, and usage limits in Atlas.
3. In **Security → Network Access**, allow only the API server's outbound IP address (for local development, the current development machine's IP). Do not use `0.0.0.0/0`.
4. In **Security → Database Access**, create a database user with only **readWrite** access to the `libery` database. This is a database username/password, not your Atlas website login.
5. In **Database → Connect → Drivers**, choose Node.js and copy the connection URI. It resembles:

   ```text
   mongodb+srv://<db-user>:<db-password>@<cluster-host>/?retryWrites=true&w=majority
   ```

6. Replace the placeholders with the database user's credentials. Percent-encode special characters in the password (for example, `@` becomes `%40`). Add `MONGODB_DB=libery` separately in the environment. Keep the URI private.

For a local MongoDB installation, use `mongodb://127.0.0.1:27017` instead. Production connections enable TLS in the MongoDB driver.

## 2. Generate application secrets

The API does **not** need a Google, Open Library, or other book-provider key to start. The recommended bulk metadata source below needs no API key. Generate unique secrets for the JWT signer and admin API key in PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Use the first value for `JWT_ACCESS_SECRET` and the second for `ADMIN_API_KEY`. Keep both in the backend environment only. They are separate from MongoDB credentials; never put them in the Expo app, source code, screenshots, chat, or a committed file. If exposed, replace the secret and restart the service. Replacing the JWT key invalidates existing access tokens.

## 3. Configure and run locally

From the project root:

```powershell
if (!(Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Edit `server\.env` and set `MONGODB_URI`, `MONGODB_DB`, `JWT_ACCESS_SECRET`, and `ADMIN_API_KEY` to your own values. `MONGODB_DB` defaults to `libery`; confirm it names the intended development database before running database commands. Use the generated JWT and admin secrets from step 2. Local `CORS_ORIGINS` may include the Expo web development origin; set `TRUST_PROXY_HOPS=0` when running directly on your machine.

For provider book-cover uploads, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server\.env`. Get them from the Cloudinary Console **Dashboard** (cloud name) and **Settings → API Keys** (key and secret). The API secret must stay on the server and must never be added to `.env.local`, an `EXPO_PUBLIC_*` variable, source control, or a mobile build. If an API secret has been pasted into chat or otherwise exposed, rotate it in Cloudinary before use and enter the replacement directly into `server\.env`. The three settings are optional, but must be configured together; without them the API reports cover upload as unavailable.

In `.env.local`, set `EXPO_PUBLIC_API_URL` to the API origin, such as `http://localhost:4000` for a web preview, your computer's LAN address for a physical-device test, or the deployed API's HTTPS origin. The Expo app must connect to the API—not directly to MongoDB Atlas. A database URI in a mobile bundle would expose the database credentials to every user. `EXPO_PUBLIC_*` values are public app configuration; never put passwords or provider secrets there.

Install the API dependencies if they are not already installed, then initialize the database collections and indexes. This command makes a real connection to the configured MongoDB server, so check the intended environment and database name first:

```powershell
npm install --prefix server
npm run db:init --prefix server
```

The initializer connects to MongoDB and creates indexes for `users`, `refresh_sessions`, `books`, `admin_audit_events`, and `user_library`. It does not insert catalog books.

Start the API in its own terminal:

```powershell
npm run dev --prefix server
```

Check the API process at `http://localhost:4000/health` (for example, `Invoke-RestMethod http://localhost:4000/health`). This endpoint confirms the API responds; it does not, by itself, prove Atlas connectivity. The database initializer or a successful catalog query is needed to verify the configured MongoDB connection. In a separate terminal, start the Expo app with `npx expo start` after setting `.env.local`.

The optional seed inserts five fictional demo records only and is idempotent. Run `npm run seed --prefix server` only when those sample records are wanted in the selected database. For the larger metadata catalog, use the dry-run importer below and inspect its output first. Do not pass `--apply` until the target database and import are confirmed.

## Build a 1,000+ title catalog

**Recommended source: Project Gutenberg's official catalog feed for metadata, not automatic ebook redistribution.** Its weekly CSV contains tens of thousands of catalog records; Project Gutenberg says machine-readable catalog metadata is public domain and recommends using the feed rather than crawling its website. The importer selects up to 2,000 English/French text records across a range of subject categories and stores stable source IDs and links.

The importer defaults to a **dry run**. Set a monitored contact address (used in the User-Agent), review the category/language counts, then apply. On Windows running Node.js 22+, set `$env:NODE_OPTIONS = "--use-system-ca"` if your network requires system-installed root certificates for TLS:

```powershell
$env:LIBERY_CATALOG_CONTACT = "you@example.org"
$env:NODE_OPTIONS = "--use-system-ca" # Required on Windows Node 22+ if using system root CAs
npm run import:gutenberg --prefix server -- --limit=2000
```

The command above is a dry run and does not connect to MongoDB or write any records. Review its prepared count, language/category breakdown, and source. Only after confirming the target database and desired import, run:

```powershell
npm run import:gutenberg --prefix server -- --limit=2000 --apply
```

For networks that interrupt the feed download, pass a previously downloaded official CSV instead:

```powershell
npm run import:gutenberg --prefix server -- --limit=2000 --file="C:\path\to\pg_catalog.csv"
npm run import:gutenberg --prefix server -- --limit=2000 --file="C:\path\to\pg_catalog.csv" --apply
```

Remote mode fetches the feed once per importer run; neither mode crawls individual title pages, downloads ebook files, nor fetches cover images. MongoDB records use `availability: metadata_only` and link to the source entry. This produces a searchable 1,000+ **metadata catalog**, not 1,000 stored/downloadable full-text books. Gutenberg's collection contains some permission-based works and rights can differ by country. Before hosting any ebook or cover, check that specific work's license and territorial rights; never infer content rights from a catalog record.

Libery is intended for worldwide use. Keep the importer metadata-only and link readers to the source record. Do not copy full text, generate narration, cache an offline copy, or serve files in the app unless redistribution and derivative audio rights are documented for every country where the app is offered.

For a polished supplementary corpus, **Standard Ebooks** reports its ebook files are dedicated to the public domain and its sitemap currently lists over 3,500 title pages, but confirm country-specific rights and image provenance before reuse. Open Library is useful for human-facing lookups/enrichment but explicitly says not to use its API for bulk downloads or as a third-party backend; it recommends monthly data dumps or partner contact instead. Google Books offers discovery and previews, not blanket content rights, and its API terms should be checked carefully for a paid app. Internet Archive access/download availability does not itself grant redistribution rights.

Provider/source references:

- [Gutenberg machine-readable catalog feeds](https://www.gutenberg.org/ebooks/offline_catalogs.html)
- [Gutenberg robot access and catalog policy](https://www.gutenberg.org/policy/robot_access.html)
- [Gutenberg license and territorial/trademark limits](https://www.gutenberg.org/policy/license.html)
- [Standard Ebooks about and public-domain dedication](https://standardebooks.org/about)
- [Open Library API usage and bulk-access guidance](https://openlibrary.org/developers/api)
- [Google Books API terms](https://developers.google.com/books/terms)
- [Internet Archive metadata API](https://archive.org/developers/metadata.html)

### Provider credentials and `.env`

Only add credentials for integrations that are actually enabled. Keep the real values in `server\.env` or your hosting secret manager; the mobile app must never contain a private provider key.

| Provider/integration | Where to get credentials | Environment setting | Current status |
|---|---|---|---|
| MongoDB Atlas | Atlas → **Database → Connect → Drivers**; use a least-privilege database user | `MONGODB_URI`, `MONGODB_DB` | Required for the backend |
| Project Gutenberg metadata | No API key. Set an email address you monitor for the importer User-Agent | `LIBERY_CATALOG_CONTACT` | Integrated; metadata-only import |
| Standard Ebooks | No API key; use its public catalog and only reuse titles after territorial rights checks | None | Research/source links only |
| Open Library | No API key for ordinary lookups; its API is not for bulk downloads or third-party backend catalogs | None | Not integrated |
| Google Books | Optional API key from Google Cloud Console → **APIs & Services → Credentials**, restricted to the Books API | None | Not integrated; discovery/preview is not a content license |
| Google Cloud Text-to-Speech | Google Cloud project, billing, enabled Text-to-Speech API, and server-side Google credentials; long-form background audio also needs Cloud Storage | None | Not integrated; do not create or add a key yet |

`server\.env.example` is a template, not a place for live credentials. To use the Gutenberg importer, set `LIBERY_CATALOG_CONTACT` to a monitored email, then run its dry-run and inspect the result before passing `--apply`. The Expo app has a sign-in screen and reads the protected API catalog after authentication. On mobile devices, refresh tokens are stored with Expo SecureStore; web preview sessions keep tokens in memory only.

The `sourceUrl` and `availability` fields are returned by the books API so the app can distinguish source-linked metadata from provider-delivered files. The API never serves a third-party ebook or cover from the catalog import.

## API overview

All application endpoints are under `/v1`. Except registration, login, refresh, and logout, routes require `Authorization: Bearer <accessToken>`. Access tokens expire after 15 minutes; refresh tokens are random, one-use, rotated on refresh, stored only as SHA-256 hashes, and expire after 30 days.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/auth/register` | Create a reader or provider account |
| `POST` | `/v1/auth/login` | Sign in |
| `POST` | `/v1/auth/refresh` | Rotate refresh token and issue a new access token |
| `POST` | `/v1/auth/logout` | Revoke the supplied refresh token |
| `GET` | `/v1/me` | Read the current profile |
| `PUT` | `/v1/me/preferences` | Update age group, focus areas, and languages |
| `GET` | `/v1/me/library` | List the signed-in user’s reading shelves and progress |
| `PUT` | `/v1/me/library/:bookId` | Add/update a visible book’s shelf, progress, and favorite flag |
| `DELETE` | `/v1/me/library/:bookId` | Remove a book from the signed-in user’s library |
| `GET` | `/v1/books` | Search/filter published books; accepts `q`, `category`, `language`, `limit` (max 50), and `cursor` |
| `GET` | `/v1/books/:id` | Read a published book if age/language preferences allow it |
| `GET` | `/v1/provider/me` | Read verified provider profile |
| `GET` | `/v1/provider/books` | List the signed-in provider’s books |
| `POST` | `/v1/provider/covers` | Upload a rights-cleared JPEG, PNG, or WebP cover (multipart field `cover`, max 5 MB) |
| `POST` | `/v1/provider/books` | Create a metadata draft with a rights confirmation |
| `POST` | `/v1/provider/books/:id/submit` | Submit a draft for review |
| `GET` | `/v1/admin/providers/pending` | List provider applications |
| `PATCH` | `/v1/admin/providers/:id/verify` or `/reject` | Review a provider |
| `GET` | `/v1/admin/books/pending` | List submitted books |
| `PATCH` | `/v1/admin/books/:id/publish` or `/remove` | Review a submitted book |

Book catalogue endpoints require a reader account. Register/sign in from **Profile → Sign in to cloud library**; passwords and tokens go to the API, never to Atlas from the app. Provider accounts are created as `pending`; a server-side admin must verify them before they can manage books. Admin routes require the `X-Admin-Key` header. Keep this key in an operator's secret manager, not in the app or provider account.

Provider registration example:

```json
{
  "email": "publisher@example.com",
  "username": "examplepublisher",
  "displayName": "Example Publisher",
  "password": "a-long-unique-passphrase",
  "ageGroup": "adults",
  "focusAreas": ["Fiction"],
  "languages": ["English"],
  "accountType": "provider",
  "providerName": "Example Publisher Ltd"
}
```

Book drafts are metadata only. A verified provider can upload a cover they own or have licensed to `/v1/provider/covers`; the API validates the image bytes and size, stores it under that provider's Cloudinary folder, and returns a Cloudinary HTTPS URL to use as `coverImageUrl` when creating the metadata draft. For example:

```powershell
curl.exe -X POST http://localhost:4000/v1/provider/covers `
  -H "Authorization: Bearer <provider-access-token>" `
  -F "cover=@C:\path\to\licensed-cover.webp"
```

The endpoint accepts JPEG, PNG, or WebP files up to 5 MB. Alternatively, a provider may supply a public HTTPS cover URL. Providers must confirm both book and cover rights, and an admin must review before publishing. When no cleared image is supplied, the app draws original category-themed cover art locally. This upload endpoint handles cover images only; it does not upload EPUB/PDF book text. Never use a checkbox as a substitute for checking the actual license.

## MongoDB collections and indexes

- `users`: unique normalized email and username, account role/status, preferences, and password hash.
- `refresh_sessions`: refresh-token hashes and expiry; a TTL index cleans expired sessions.
- `books`: metadata, age/language rating, provider ownership, review state, and a text index for catalog search.
- `admin_audit_events`: timestamped provider-verification and book-publication/removal actions (never stores the admin key).
- `user_library`: private per-account reading shelves, favorites, and reading progress, indexed by user and book.

Indexes are created on API startup. Only catalog records with `published` status are visible. The server applies age and language filtering independently of any client-side filter.

### Verify the database target safely

Before any database command, confirm the intended environment and `MONGODB_DB` value by inspecting the local configuration without printing `MONGODB_URI` or secret values. Run `npm run db:init --prefix server` only after confirming the target; a successful run confirms that the API host can connect and create indexes. Confirm the collection names in Atlas under the selected database. The API `GET /health` endpoint only confirms that the HTTP service responds; it is not an Atlas health check. Record the check date, database name (not its URI), created collections/indexes, and catalog count in `PROJECT_PROGRESS.md`.

The catalog importer is metadata-only and defaults to a dry run. Review its output first. Treat `--apply` as a write to the configured MongoDB database: confirm the target and the intended import before using it, and record the result. The sample seed also writes demo books; run it only when those five fictional records are desired in that database.

## Security checks included

- Passwords are bcrypt-hashed; password input is bounded and requires at least 12 characters.
- Short-lived HS256 access JWTs validate algorithm, issuer, and audience; refresh tokens rotate and are one-use.
- Inputs use strict Zod schemas; client query fields cannot become MongoDB query operators.
- MongoDB catalog queries use fixed, server-built filters; full-text search is capped and uses the text index.
- Helmet headers, JSON body size cap, CORS allow-list, authentication/API rate limits, and generic error responses.
- Provider verification and book-review workflow; admin secret is compared in constant time.
- Admin actions write a server-side audit record without logging credentials or request bodies.
- Production configuration requires an admin key and HTTPS browser origins; MongoDB TLS is enabled.

## Production deployment checklist

- Store secrets in the hosting provider's secret manager; do not deploy `server/.env`.
- Use a dedicated production database user limited to the production database, TLS, backups, and restricted network access.
- Set `CORS_ORIGINS` to the exact HTTPS web origins. Native apps may omit browser `Origin`; authentication still applies.
- Put the API behind a trusted HTTPS reverse proxy. Set `TRUST_PROXY_HOPS` to the exact number of trusted proxies—never trust arbitrary forwarded headers.
- Replace the single-process in-memory rate limiter with a shared store before horizontally scaling.
- Add email/phone verification, guardian-consent verification, account recovery, admin-key rotation and audit retention/export, secure device token storage, privacy/export/delete routes, and monitoring before public launch.
- Run `npm test --prefix server`, `npm run typecheck --prefix server`, `npm run lint --prefix server`, `npm audit --prefix server`, and `npx expo-doctor` before release.

## Tests

The API tests use an in-memory test store; they do not require a live MongoDB instance. MongoDB-specific indexes and connection behavior should additionally be exercised against a disposable test database before production.

Age group is currently a self-declared onboarding setting, not proof of age. The API blocks child-account registration until a verified guardian-consent process exists and prevents a signed-in user from changing their age group to a less restrictive setting. Do not rely on this alone for legal age assurance or child-safety compliance; add a reviewed age-verification and guardian-consent flow before supporting children in production.
