# Node-Served Dashboard Verification

The dashboard was previewed from `runtime/public/index.html` through a temporary Node.js server on 21 August 2026. The page rendered the active **VPS Instances**, **Get Coins (contribute)**, and **Get Coins (daily)** menu entries, profile/avatar area, synchronized coin balance, language selector, and logout control.

The desktop view showed the VPS list, Ubuntu 22.04/24.04 create form, optional hostname placeholder `frierencloud`, and a log action. The mobile preview at 375 × 812 preserved the VPS form and enabled horizontal access to the menu while keeping the content readable. This verification used only static Node-served assets; no Vite dev or build server was used.
