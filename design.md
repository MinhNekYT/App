# FrierenCloud — Mobile Design

FrierenCloud is a dark, calm, portrait-first mobile console for temporary Linux sessions. The supplied Frieren illustration anchors the brand in the splash and launcher icons, while the product surfaces technical state in clear, touch-friendly cards. The design favours one-handed operation: screen gutters are 16 points, the primary call-to-action sits above the tab bar, and all interaction targets are at least 44 points tall.

| Screen           | Content                                                                                        | Interaction                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Splash           | FrierenCloud logo, wordmark, and a small loading indicator.                                    | Routes to authentication after launch state has resolved.                                 |
| Google sign-in   | Logo, concise session/privacy explanation, full-width Google button.                           | Opens Google OAuth through Supabase; configuration errors remain human-readable.          |
| Language choice  | Two large buttons: English and Tiếng Việt.                                                     | Stores the selected language locally and routes to VM Instances.                          |
| VM Instances     | Empty state or a list of temporary sessions, status chips, and one primary creation button.    | Tapping a session opens its setup log.                                                    |
| Create Linux VPS | Machine-name field, masked GitHub token field, explicit secondary-token acknowledgement.       | Confirm is disabled until all validation conditions pass.                                 |
| Setup log        | Current workflow status, refresh action, monospace output and an SSHX link card once detected. | Refresh only runs while this screen is active and uses the token held in volatile memory. |
| Settings         | Profile summary, language selector, repository route, privacy note, sign out.                  | Lets users revise language/repository without adding extra tabs.                          |

The bottom navigation contains exactly two destinations: **VM Instances** and **Settings**. The creation flow is VM Instances → Create Linux VPS → Setup log. The app calls a repository-owned `workflow_dispatch`, then presents the selected run output and any `sshx.io` URL. GitHub runner sessions are labelled temporary rather than durable VPS servers.

| Token         | Value                 | Usage                                                   |
| ------------- | --------------------- | ------------------------------------------------------- |
| Cloud navy    | `#12213C`             | Primary background and status bar.                      |
| Surface blue  | `#1C2D4C`             | Cards, form surfaces and log framing.                   |
| Frieren lilac | `#B9B7E8`             | Primary actions and acknowledgement state.              |
| Signal cyan   | `#43C6E8`             | Active tab, successful SSHX state and status indicator. |
| Text          | `#F8FAFC` / `#A7B4CC` | Primary and secondary text with strong contrast.        |

The GitHub access token is never persisted to AsyncStorage, SecureStore, Supabase, logs, analytics or source control. It is held solely in application memory for the active log view, cleared at sign-out, and never passed to the provision workflow itself.
