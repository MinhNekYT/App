# FrierenCloud Antimining

FrierenCloud Antimining is a transparent monitoring feature for each Ubuntu VPS. An administrator runs `/webhook webhook_url:<Discord webhook URL>` once. The URL is validated as an HTTPS Discord webhook, encrypted in the database, and never stored in `.env`.

The provisioning workflow installs Node.js and a named `frierencloud-antimining.service` on the VPS. It sends only three structured events to the signed host endpoint: `installed`, `heartbeat`, and `terminated`. The host persists each message into the VPS log and forwards it to the configured Discord webhook. The watcher has no command polling, remote shell, download, or arbitrary code execution channel.

## Network and resource policy

The workflow applies outbound firewall denies for TCP ports `2222`, `3333`, `4444`, `5555`, `7777`, `8888`, `13333`, and `14444`. At setup it also resolves and blocks the current IPv4 addresses of selected pool domains: NiceHash, Ethermine, F2Pool, and SupportXMR. The watchdog scans process names for known mining signatures, watches CPU saturation for five uninterrupted minutes, and checks GPU utilization/temperature only when `nvidia-smi` is available. A reading at or above 95°C or a confirmed mining signature is recorded as a policy violation.

> The service is deterministic monitoring, not an AI classifier, and it does not claim to maintain a complete global pool blacklist or perform deep packet inspection. Every violation is logged before containment so operators can review evidence and tune the policy.

## Shutdown behavior

The systemd service is explicitly configured with `OnFailure=poweroff.target`. Consequently, an unexpected process termination, including an abrupt `kill` of the watchdog process, marks the service as failed and powers off the VPS. A normal, deliberate `systemctl stop frierencloud-antimining.service` does not trigger that failure path. This behavior is intentionally visible in the workflow and service name; enable it only for VPS sessions where you accept this protection model.

## Event endpoint

The VPS sends heartbeats to `/api/antimining/<instance-id>?sig=<HMAC>`. The host validates the HMAC, instance ID, event kind, and message length. It does not accept commands or return executable content.
