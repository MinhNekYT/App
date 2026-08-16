<<<<<<< HEAD
# FrierenCloud

FrierenCloud is a bilingual Expo mobile app for observing temporary Linux sessions created through a repository-owned GitHub Actions workflow. It has a FrierenCloud splash, Google sign-in via Supabase, an English/Vietnamese chooser, a two-tab VM dashboard, and a session form that validates a safe hostname before initiating the GitHub workflow.

The app is designed around short-lived runner sessions. It is not a persistent VPS management platform. See [SECURITY.md](./SECURITY.md) for the required repository secrets, Supabase OAuth redirect URI, and internal APK/IPA build procedure.

## Local development

Copy `.env.example` to `.env.local`, provide the **publishable** Supabase values, then run `pnpm install` followed by `pnpm start`. Do not add `.env.local` to source control. The app will show a configuration message instead of starting Google OAuth until those two values exist.

## Verification

Run `pnpm exec tsc --noEmit` to validate the TypeScript project. The GitHub Actions build workflow repeats this verification before submitting an internal Expo build.
