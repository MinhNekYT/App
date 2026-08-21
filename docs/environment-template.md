# `.env` template

Create an untracked `.env` file on the persistent Node.js host. Do not commit values from this template.

```dotenv
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
# Either set this explicitly or leave it empty to use ${BASE_URL}/auth/discord/callback.
DISCORD_REDIRECT_URI=https://your-host.example/auth/discord/callback
OWNER_ID=1071750161488937060
ADMIN_IDS=
BASE_URL=https://your-host.example
# BOT_PUBLIC_URL=https://your-host.example  # Optional alias when BASE_URL is not set
PORT=3000
DATABASE_URL=
JWT_SECRET=
GITHUB_RUNNER_OWNER=
GITHUB_RUNNER_REPO=
GITHUB_WORKFLOW_FILE=frierencloud-vm.yml
GITHUB_WORKFLOW_REF=main
BOT_AVATAR_URL=/manus-storage/frierencloud-bot-avatar_d0bb8fd1.png
PARTNER_REWARD_CRON_SECRET=
```

`BASE_URL` is used by the daily claim page, signed GitHub Actions callback, and the Discord OAuth2 redirect. In the Discord Developer Portal, add `${BASE_URL}/auth/discord/callback` as an exact Redirect URI and request the `identify` and `email` scopes. The GitHub dispatch token is intentionally not included: set it using `/token` from a bot administrator so it is encrypted in the database.

Use `PARTNER_REWARD_CRON_SECRET` only in your hosting provider’s monthly HTTP cron configuration. It should POST to `${BASE_URL}/api/scheduled/partner-rewards` with the header `x-cron-secret: <value>` once per month. The database prevents a partner from being rewarded twice in the same month.
