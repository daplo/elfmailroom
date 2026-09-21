# Deploying the current backend

The implemented stack is Node 24 + Express + SQLite (Node's built-in node:sqlite), not Postgres. One long-running API process also runs generation/email workers and serves both built React applications. There is no Dockerfile or automated production deployment in this repository yet.

## Current deployment

Use a single Node 24 server with a persistent local disk, a process supervisor and HTTPS reverse proxy. Do not use an ephemeral filesystem or scale this SQLite deployment to multiple API replicas.

1. Install dependencies with npm ci.
2. Configure the root .env with production settings. Set PUBLIC_URL and VITE_SITE_URL to the same HTTPS origin. Set DATABASE_PATH to an absolute filename on the persistent disk, such as /var/lib/elfmailroom/mailroom.sqlite; create that directory and make it writable by the service user.
3. Supply the OpenAI, Stripe, optional SMTP and admin settings described in README.md. Keep ORDER_LINK_SECRET stable across deploys so existing purchase links continue to work.
4. Complete the public legal fields, then run npm run build. Public VITE_ variables are baked into the frontend and policy manifest; use identical policy values at runtime.
5. Run npm start under the supervisor, with the repository as its working directory. It serves the site and /api on port 3001 by default. Reverse-proxy the entire origin to it, with no public access to the backend port.
6. The app currently does not configure Express trust proxy. Strip forwarded client-IP headers at the proxy for the current configuration (rate limiting then shares the proxy IP). Before public traffic, configure trust only for your actual proxy network and verify per-client limits; do not blindly trust arbitrary forwarded headers.
7. Register https://YOUR-DOMAIN/api/webhook in Stripe for checkout.session.completed and checkout.session.async_payment_succeeded, then set its signing secret. Verify a Stripe test-mode payment, generation, review, PDF and email before enabling SALES_ENABLED.
8. Back up the SQLite database using a SQLite-aware online backup or while the service is stopped; a casual copy of the live .sqlite file can miss WAL data. Include PDF blobs/revisions and keep the signing secret in a separate secret backup. Test restoring before launch.

For updates, run CI, build with the production public settings, back up the database and restart the service. Schema migrations run at startup, so rolling back application files alone may not undo a database migration.

## Docker and Postgres

Docker can package this same Node process with the built frontend assets. SQLite would still need a persistent volume mounted at DATABASE_PATH; Docker itself does not change the database. Container secrets should be injected at runtime, with only public build variables available during frontend builds.

Postgres is a separate migration, not an environment-variable switch. The API, admin, generation/email queues and PDF storage currently use synchronous SQLite queries. Moving requires a Postgres driver, schema/data migrations, asynchronous database access, transactional job claiming and updated integration tests. After that, a Node container plus managed Postgres is an option for multiple application instances. No Postgres service or migration has been added by the CI work.

[Docker volume persistence](https://docs.docker.com/engine/storage/volumes/) · [Node SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)

## Continuous integration

.github/workflows/ci.yml runs on pushes, pull requests and manual dispatch:

- Unit/API job: npm ci and npm run test:unit, including temporary SQLite databases and mocked external providers.
- Browser job: installs Chromium, builds both apps, and runs npm run test:e2e against an isolated production server plus separate SEO/consent fixtures. Screenshots are uploaded even on failure.
- No production secrets, real charges, model requests or emails are needed. Purchase/admin UI checks mock API responses; API tests separately exercise real persistence and authorization. CI does not certify live provider integration.
- This workflow tests changes; it does not publish or deploy. In GitHub branch protection, require both jobs before merging.

Locally: npm ci, npx playwright install chromium, then npm run test:ci. No manually started development server is needed. The browser runner uses ports 3212, 3210 and 5199.
