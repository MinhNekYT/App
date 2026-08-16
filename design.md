# FrierenCloud — Mobile Interface Design

## Product intent

FrierenCloud is a bilingual mobile control surface for creating and observing short-lived Linux sessions that are provisioned through a GitHub Actions workflow. The application uses the user-provided Frieren illustration in its splash and application identity, paired with a quiet sky-blue cloud palette and terminal-inspired visual language. Controls remain touch-friendly, legible, and aligned with iOS Human Interface Guidelines. Every primary action sits in the lower half of a 9:16 portrait screen or in the native bottom tab bar, keeping one-handed use practical.

## Screen list and layout

| Screen | Primary content | Interaction and layout |
| --- | --- | --- |
| Splash | The user-provided FrierenCloud illustration, the wordmark **FrierenCloud**, and a small “Secure Linux sessions” caption. | No action is required. The logo occupies the upper visual center and fades into authentication once initialization finishes. |
| Sign in | Product mark, a concise privacy statement, and a full-width **Continue with Google** button. | The button is placed above the safe-area home indicator. An explanatory line says that Google sign-in is handled by the configured Supabase project. |
| Language | A short “Choose your language” title with two large choice buttons: **English** and **Tiếng Việt**. | One-tap choice persists for the signed-in user before opening VM Instances. The choice can later be changed in Settings. |
| VM Instances | Header, an empty-state terminal panel or a stacked session list, and an emphasized **Create a Linux VPS** button. | The primary button sits above the tab bar. Each session card shows name, workflow status, elapsed time, and an SSHX availability chip; tapping a card opens Logs. |
| Create Linux VPS | Machine-name text field, GitHub access-token secure field, an explicit acknowledgement checkbox, and Confirm. | The confirm button remains disabled until the name is valid, a token is provided, and the acknowledgement is checked. The token is masked and is kept only in volatile application memory for dispatch/log requests. |
| Instance Logs | Status header, event timeline, monospaced streamed log output, link card for SSHX once detected, and a cancel action. | The SSHX address is rendered as a tappable external link only after it is present in workflow output. Refresh uses a visible pull-to-refresh control, not hidden background polling. |
| Settings | Profile summary, current language, GitHub repository route, privacy note, and sign-out. | Repository path is configured once here so the creation form needs only machine name and token. The dangerous reset/sign-out controls are separated from normal settings. |

## Key user flows

The first-use journey is: splash → sign in with Google → choose English or Vietnamese → VM Instances. Returning authenticated users are routed straight from splash to VM Instances using their stored language preference. The bottom tab bar always exposes exactly **VM Instances** and **Settings**.

To create a session, the user taps **Create a Linux VPS** (or **Tạo một Linux VPS**), provides a valid Linux hostname and a GitHub token belonging to a non-primary account, confirms the acknowledgement, and taps Confirm. The app dispatches the configured workflow for the repository selected in Settings. It then creates an instance card and opens the Logs screen. The app requests current job logs only while the log view is visible or when the user manually refreshes. It detects a valid `sshx.io` link in the output and renders it prominently.

## Security and operational boundary

The product must describe these sessions as **temporary GitHub Actions runner sessions**, not durable VPS servers. The workflow must cap execution time, validate the requested hostname against a strict RFC-style label pattern, and never print the submitted GitHub token. The app must never write this token to Supabase, analytics, AsyncStorage, logs, crash reports, or source control. A user must configure the repository they control in Settings; the workflow dispatch requires that token to have access to that repository.

## Colour, type, and interaction design

| Element | Specification | Rationale |
| --- | --- | --- |
| Cloud navy | `#12213C` | Creates a quiet, high-contrast base that complements the cool hues of the supplied illustration. |
| Frieren lilac | `#B9B7E8` | Connects the logo’s light hair detail to progress indicators and the create action. |
| Signal cyan | `#43C6E8` | Reserved for successful SSHX access links and active navigation states. |
| Surface slate | `#1C2D4C` | Separates cards from the cloud-navy background while retaining an understated dark-mode-first appearance. |
| Primary text | `#F8FAFC` | Maintains strong readability against the dark palette. |
| Secondary text | `#94A3B8` | Supports status metadata without competing with user actions. |
| Typography | System San Francisco on iOS and system Roboto on Android; monospaced system font only for logs. | Preserves platform familiarity and reserves technical typography for technical content. |

Controls follow native sizing expectations: a minimum 44-point touch target, 16-point screen gutters, 12–16-point card gaps, rounded rectangles with 14-point radii, and clear text labels in addition to any iconography. Colour is never the only signal of workflow status; every state has a readable label.

## Delivery architecture options

| Approach | Trade-offs | Cost | Setup complexity |
| --- | --- | --- |
| Device-to-GitHub connection | The app uses the entered secondary-account token only in memory to dispatch a workflow and read its public or authorized run logs. This is the smallest system, but users must configure their own repository in Settings and the app must not persist the token. | No additional server cost beyond the user’s GitHub Actions allocation. | Moderate: Supabase Google OAuth plus GitHub repository/workflow setup. |
| Server-mediated connection | A server validates app sessions and invokes GitHub on behalf of users, exposing sanitized status/log data to the app. It centralizes policy but adds secret management, access-control rules, and hosting. | Supabase/server usage plus GitHub Actions allocation. | Higher: Supabase Edge Functions, repository authorization, row-level security, and observability. |

The initial implementation will supply the first approach because it directly matches the requested secondary-token consent and avoids retaining a credential. A later server-mediated version can be introduced only after explicit repository ownership and authorization requirements are defined.
