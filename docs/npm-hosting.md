# Unified Node.js bot and web hosting

FrierenCloud runs the Discord Gateway bot and the daily-claim webpage from the same persistent Node.js service and one `BASE_URL`. The bot must run on a host that keeps the process alive; serverless functions cannot hold the Discord Gateway connection.

```bash
npm install --legacy-peer-deps
npm run build
npm run bot:deploy-commands
node index.js
```

`node index` is also supported. The root entrypoint imports the built bot-and-web runtime from `dist/index.js`, so you only need to run the build again after changing source code.

Copy `docs/environment-template.md` into the host’s untracked `.env` file, populate the required values, and set `BASE_URL` to the public HTTPS address for that same host. The separate avatar asset is available at `/manus-storage/frierencloud-bot-avatar_d0bb8fd1.png`; set `BOT_AVATAR_URL` to the corresponding absolute public URL if your host needs one.

Configure an external monthly HTTP cron to POST to `/api/scheduled/partner-rewards` and send the `x-cron-secret` header. This endpoint is idempotent by month and awards each active partner 50 coins once.

The claim flow is signed: `/coin daily` returns an HMAC-protected, 15-minute link that renders the Discord display name, avatar, and **Get coins here** button. The server validates the signature, expiry, single-use state, ban status, and daily limit before crediting coins.
