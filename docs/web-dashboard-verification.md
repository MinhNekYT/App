# Web Dashboard Verification

The npm-built React frontend was checked locally on 2026-08-21.

- Desktop preview rendered the public FrierenCloud landing page with the supplied mascot artwork, Discord login entry points, and feature overview.
- A 375 × 812 mobile preview rendered the responsive navigation, artwork card, hero text, and Discord login action without horizontal overflow.
- The protected dashboard routes require the signed Discord OAuth2 session and fetch only the authenticated account's shared coin balance and VPS records.
- Desktop verification showed the persistent left sidebar, user profile, 47-coin balance card, Ubuntu 24.04 VPS row, running status, and SSHX availability affordance.
- Mobile verification at 375 × 812 showed a condensed horizontal menu and stacked balance, VPS-count, and quick-action cards without horizontal content clipping.
