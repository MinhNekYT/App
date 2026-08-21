# FrierenCloud Discord Bot

FrierenCloud is an English-language Node.js Discord bot for coin-funded Ubuntu VPS provisioning. The bot runs as a persistent process, receives real GitHub Actions callback output, and DMs the actual SSHX link to the user when it becomes available.

| Command | Purpose | Access |
| --- | --- | --- |
| `/balance` | Show the caller’s coin balance | Everyone |
| `/create hostname:<name>` | Charge 2 coins and create an Ubuntu VPS | Everyone with 2 coins |
| `/manage` | List only the caller’s VPS sessions and SSHX links | Everyone |
| `/status` | Show runner and token configuration status | Everyone |
| `/token github_token:<token>` | Save or rotate the encrypted GitHub token | Admin only |
| `/give user:@member coins:<number>` | Grant coins to a member | Admin only |
| `/help` | Show command reference | Everyone |

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Discord Gateway bot token; keep secret. |
| `DISCORD_APPLICATION_ID` | Discord application ID used to deploy slash commands. |
| `OWNER_ID` | Raw Discord user ID with permanent admin access. |
| `ADMIN_IDS` | Optional comma-separated additional Discord administrator IDs. |
| `BOT_PUBLIC_URL` | Public HTTPS URL of the persistent bot host, which GitHub Actions uses for callback logs. |
| `DATABASE_URL` | MySQL/TiDB database for users, coins, VPS sessions, and logs. |
| `JWT_SECRET` | Used to sign callbacks and encrypt the stored GitHub token. |
| `GITHUB_RUNNER_OWNER` / `GITHUB_RUNNER_REPO` | GitHub Actions runner repository. |

`DISCORD_GUILD_ID` is optional but recommended for instant command updates in a test server. `BOT_AVATAR_URL` can point at the supplied FrierenCloud artwork.

## Hosting and rollout

Run the service on a persistent Node.js host with an HTTPS public URL. Configure the start command as `npm run bot:start` and deploy slash commands with `npm run bot:deploy-commands`. Copy `github-actions/frierencloud-vm.yml` into the runner repository at `.github/workflows/frierencloud-vm.yml`.

The Ubuntu workflow runs exactly `curl -sSf https://sshx.io/get | sh -s run`. `/create` refunds 2 coins when dispatch fails. When real callback output contains an SSHX URL, the bot DMs the requesting user with the VPS details.
