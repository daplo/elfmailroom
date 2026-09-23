# Production deployment

The production stack is one Dockerized Node 24 + Express process with SQLite (Node's built-in `node:sqlite`). The same process runs generation/email workers and serves both built React applications. `compose.prod.yaml` binds the application only to `127.0.0.1:3001` and runs Caddy on ports 80/443 for automatic HTTPS.

## Current deployment

Use a single application container with a persistent local disk and HTTPS reverse proxy. Do not use an ephemeral filesystem or scale this SQLite deployment to multiple API replicas.

1. Install Docker Engine with the Compose plugin on the production server and add the dedicated deployment user to the `docker` group.
2. Create the dedicated deployment directory and a `data/` directory owned by that user. `data/` is mounted at `/data`; Compose fixes `DATABASE_PATH` to `/data/mailroom.sqlite`.
3. Configure the deployment directory's `.env`. Set `PUBLIC_URL` and `VITE_SITE_URL` to the same HTTPS origin. The deployment workflow deliberately preserves `.env` and `data/` rather than copying them from GitHub.
4. Supply the OpenAI, Stripe, optional SMTP and admin settings described in README.md. Keep `ORDER_LINK_SECRET` stable across deploys so existing purchase links continue to work.
5. Complete the public legal fields before enabling sales. Compose passes the public `VITE_*` values into the image build and supplies the same values to the running API, keeping the generated policy manifest consistent with runtime configuration. Missing policy/payment values leave checkout disabled but do not block the public site.
6. Validate and start manually if needed with `docker compose --env-file .env -f compose.prod.yaml up -d --build`. Caddy obtains and renews certificates for `elfmailroom.com`; the application container remains private to the host and Compose network.
7. The app currently does not configure Express trust proxy. Strip forwarded client-IP headers at the proxy for the current configuration (rate limiting then shares the proxy IP). Before public traffic, configure trust only for your actual proxy network and verify per-client limits; do not blindly trust arbitrary forwarded headers.
8. Register `https://YOUR-DOMAIN/api/webhook` in Stripe for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then set its signing secret. Verify a Stripe test-mode payment, generation, review, PDF and email before enabling `SALES_ENABLED`.
9. Back up the SQLite database using a SQLite-aware online backup or while the container is stopped; a casual copy of the live `.sqlite` file can miss WAL data. Include PDF blobs/revisions and keep the signing secret in a separate secret backup. Test restoring before launch.

For updates, CI must pass on `main`. The deployment workflow builds the production Docker image on the GitHub runner, not on the VPS. It reads only the explicitly allowlisted public `VITE_*` build arguments from the server’s existing Compose configuration and detects the Docker server architecture. Python 3 must be installed on the VPS. The full `.env` and runtime secrets never leave the server.

The runner builds the tested commit for that architecture and labels the image with its commit SHA. It streams a compressed `docker image save` archive over SSH into `docker image load`, then uploads only `compose.prod.yaml` and `Caddyfile`, without deleting server files. No container registry or new GitHub secrets are required. SSH uses strict host verification and keep-alives.

The VPS starts the loaded image using `docker compose up --no-build --pull never --wait --wait-timeout 120`. The Caddy image is pulled separately. The job checks that the loaded and running application image labels match the tested revision and waits for application health before pruning dangling images. `.env`, `data/`, the existing Compose project name and Caddy certificate volumes are preserved. A failed build or transfer does not restart the application.

To deploy changes, push to `main` and let Tests trigger Deploy production. The manual dispatch remains available. Application source left on the VPS by older deployments is no longer synchronized; do not rebuild from that stale checkout. To reproduce an image locally, use a fresh checkout and the Dockerfile. Schema migrations run at startup, so rolling back an image alone may not undo a database migration.

## Docker and Postgres

Docker packages the Node process and built frontend assets but does not change the database. Runtime secrets stay only in the server `.env`; only public `VITE_*` values are passed as image build arguments.

Postgres is a separate migration, not an environment-variable switch. The API, admin, generation/email queues and PDF storage currently use synchronous SQLite queries. Moving requires a Postgres driver, schema/data migrations, asynchronous database access, transactional job claiming and updated integration tests. After that, a Node container plus managed Postgres is an option for multiple application instances. No Postgres service or migration has been added by the CI work.

[Docker volume persistence](https://docs.docker.com/engine/storage/volumes/) · [Node SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)

## Continuous integration

`.github/workflows/ci.yml` runs on pushes, pull requests and manual dispatch:

- Unit/API job: npm ci and npm run test:unit, including temporary SQLite databases and mocked external providers.
- Browser job: installs Chromium, builds both apps, and runs npm run test:e2e against an isolated production server plus separate SEO/consent fixtures. Screenshots are uploaded even on failure.
- No production secrets, real charges, model requests or emails are needed. Purchase/admin UI checks mock API responses; API tests separately exercise real persistence and authorization. CI does not certify live provider integration.
- After a successful `main` run, `.github/workflows/deploy.yml` uses the protected `prod` environment to deploy the tested revision. It needs environment secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS`, plus variables `DEPLOY_PORT` and `DEPLOY_PATH`.

Locally: npm ci, npx playwright install chromium, then npm run test:ci. No manually started development server is needed. The browser runner uses ports 3212, 3210 and 5199.
