# FrierenCloud

FrierenCloud is a **Node.js Discord bot and web dashboard** for coin-funded Ubuntu VPS provisioning through GitHub Actions. The same service provides Discord commands, the daily-coin claim page, Discord OAuth2 dashboard, VPS logs, and Antimining callbacks.

> **Runtime rule:** after dependencies are installed, run the service only with `node index.js` or `node index`. Do **not** use `npm run build`, `npm run dev`, Vite, Docker, or pnpm to start FrierenCloud.

## What a host must provide

Any provider is suitable if it gives the application a persistent Node.js process, outbound internet access, an **IPv4 address or publicly mapped port**, and a way to attach a public HTTPS domain. This includes panels or VPS plans from providers such as **WispByte**, **bot-hosting.net**, and **Orihost**, provided the selected plan supports those requirements.

| Requirement | Why it is needed |
|---|---|
| Node.js 20 or newer | Runs the bundled bot and Express web service. |
| Persistent process | Keeps the Discord Gateway connection alive. |
| Public IPv4 or mapped TCP port | Lets Discord OAuth2, daily claim pages, and GitHub Actions callbacks reach the service. |
| HTTPS domain | Used as `BASE_URL` for public claim links and the OAuth2 callback. |
| MySQL or TiDB database | Stores users, VPS records, coins, settings, access controls, and encrypted token data. |
| GitHub repository access | Dispatches the VPS workflow after a user creates a VPS. |

## Quick start

Clone or upload the project to the host, then install dependencies **once**. The production runtime bundle is already committed under `runtime/`.

```bash
git clone https://github.com/MinhNekYT/App.git frierencloud
cd frierencloud
npm install --ignore-scripts
```

Create a private `.env` file in the project root. Do not commit this file. Use [`docs/environment-template.md`](docs/environment-template.md) as the variable reference, then set real values for your host.

```bash
nano .env
```

Start the service with either supported command:

```bash
node index.js
# or
node index
```

The health endpoint is available at:

```text
https://YOUR_DOMAIN/health
```

It should return a JSON response with `"status":"ok"` after the process starts with valid runtime configuration.

## Required `.env` configuration

Use a real HTTPS address for `BASE_URL`; do not add a trailing slash. The chosen port must match the port assigned or forwarded by the hosting provider.

```dotenv
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_APPLICATION_ID=your_application_id
DISCORD_CLIENT_ID=your_oauth_client_id
DISCORD_CLIENT_SECRET=your_oauth_client_secret
DISCORD_REDIRECT_URI=https://bot.example.com/auth/discord/callback

OWNER_ID=1071750161488937060
ADMIN_IDS=
BASE_URL=https://bot.example.com
PORT=3000

DATABASE_URL=mysql://user:password@database-host:3306/frierencloud
JWT_SECRET=replace_with_a_long_random_secret

GITHUB_RUNNER_OWNER=your-github-owner
GITHUB_RUNNER_REPO=your-github-runner-repository
GITHUB_WORKFLOW_FILE=frierencloud-vm.yml
GITHUB_WORKFLOW_REF=main
PARTNER_REWARD_CRON_SECRET=replace_with_a_second_long_random_secret
```

The GitHub dispatch token is intentionally **not** placed in `.env`. An administrator adds it in Discord with `/token github token:<token>`; FrierenCloud encrypts it before storing it in the database.

## Domain, IPv4, and port setup

Point an **A record** such as `bot.example.com` to the host IPv4 address. If the provider assigns a public port, configure its TCP proxy or port mapping so public HTTPS traffic reaches the value in `PORT`.

| Hosting layout | Set `PORT` to | `BASE_URL` example |
|---|---:|---|
| Managed Node.js panel assigns a port | The exact assigned port | `https://bot.example.com` |
| VPS with reverse proxy | A private application port such as `3000` | `https://bot.example.com` |
| Panel exposes a public port directly | The panel's Node.js application port | `https://bot.example.com` |

For a reverse proxy, forward HTTPS requests for the domain to `http://127.0.0.1:3000`. Keep the public URL HTTPS even when the internal Node.js connection uses HTTP.

## Discord setup

In the Discord Developer Portal, add this exact OAuth2 redirect URI:

```text
https://bot.example.com/auth/discord/callback
```

Enable the bot, invite it with the `bot` and `applications.commands` scopes, and deploy the slash-command registry once after setting the bot variables:

```bash
npm run bot:deploy-commands
```

The normal runtime remains direct Node.js afterwards:

```bash
node index.js
```

## GitHub Actions VPS runner

Copy [`github-actions/frierencloud-vm.yml`](github-actions/frierencloud-vm.yml) into the repository specified by `GITHUB_RUNNER_OWNER` and `GITHUB_RUNNER_REPO`. The workflow receives the requested hostname, defaults it to `frierencloud` when blank, installs SSHX with:

```bash
curl -sSf https://sshx.io/get | sh -s run
```

It also sends signed provisioning logs back to your `BASE_URL`, which the dashboard shows only to the VPS owner.

## Provider-panel checklist

The labels vary by host, but the deployment sequence is the same for WispByte, bot-hosting.net, Orihost, and similar Node.js providers.

1. Select a plan with a persistent Node.js process, public networking, and a port allocation.
2. Upload the source or clone the Git repository, then run `npm install --ignore-scripts` once in the project directory.
3. Enter every `.env` value in the host's environment-variable panel or private `.env` file.
4. Set the startup command to **`node index.js`**. `node index` is also valid.
5. Attach an HTTPS domain and set the same domain as `BASE_URL` and the Discord redirect URI.
6. Start the process, open `/health`, then test Discord login, `/coin daily`, and `/create` with an administrator account.

## Operations and troubleshooting

| Symptom | Check |
|---|---|
| Process exits at startup | Confirm all required bot variables, `DATABASE_URL`, `JWT_SECRET`, and a valid numeric `PORT` are set. |
| Discord login fails | Ensure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and the exact HTTPS callback URI match the Discord Developer Portal. |
| Claim link or VPS log callback fails | Verify `BASE_URL` is publicly reachable over HTTPS and resolves to the hosting IPv4/port mapping. |
| `/create` reports account access unavailable | Re-add a valid secondary-account token with the administrator `/token github` command and confirm repository workflow permissions. |
| Bot disconnects after a while | Use the provider's always-on process option, a process manager, or a VPS service manager. Sleeping/free static-site plans are not appropriate for a Discord Gateway bot. |

## Security notes

Keep `.env`, database credentials, Discord secrets, and GitHub tokens private. Never paste a token into a public log, GitHub issue, website form, or support ticket. FrierenCloud redacts sensitive command values from audit logging and encrypts stored GitHub-related tokens.
