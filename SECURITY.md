# Security and build configuration

FrierenCloud accepts a GitHub token in the create-session form only to call the GitHub REST API from the user’s device. It must be a secondary-account token that has repository access. The code never writes that token to AsyncStorage, SecureStore, Supabase, a log, analytics, or source control. It remains in memory only for the current app session, which is required to refresh the corresponding GitHub Actions logs.

The repository workflow named `Provision temporary Linux session` must be interpreted as a **short-lived GitHub Actions runner session**, not a durable VPS. The job validates the requested hostname, sets it, uses a 25-minute timeout, and prints any SSHX URL to its workflow output. GitHub Actions limits, SSHX availability, and the repository’s own policies still apply.

## Required GitHub Repository Secrets

| Secret | Purpose | Safe value to use |
| --- | --- | --- |
| `EXPO_TOKEN` | Allows GitHub Actions to ask Expo Application Services to create the internal Android/iOS build. | An Expo access token with access only to the FrierenCloud Expo project. |
| `EXPO_PUBLIC_SUPABASE_URL` | Provides the Supabase project URL to the mobile app at build time. | The HTTPS project URL. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Provides the Supabase publishable/anon key to the mobile app at build time. | Publishable key or anon key only. Never use `service_role`. |

> Values whose names begin with `EXPO_PUBLIC_` are compiled into the mobile client. Treat them as configuration, not as private server credentials. Supabase Row Level Security must protect database data; the `service_role` key must never be placed in this app, an Expo build, or a GitHub secret used by the client build.

## Supabase Google OAuth redirect

Enable the Google provider in Supabase Authentication. In **Authentication → URL Configuration**, add the exact native redirect URI `frierencloud://auth/callback`. In the Google Cloud OAuth client configuration, add the Supabase callback URL shown by the Google provider setup in the Supabase dashboard. The app uses the `frierencloud` scheme configured in `app.config.ts`.

## Launching an internal install build

After adding the three secrets above, open **Actions → Build FrierenCloud → Run workflow**. Choose Android to obtain an APK-based internal install build, iOS to obtain a signed internal distribution build, or all for both. An iOS IPA requires an Apple Developer account and signing credentials configured with Expo; sideloading tools do not remove that Apple-signing requirement.
