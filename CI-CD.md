# FrierenCloud CI/CD

The mobile build and release pipeline runs entirely in GitHub Actions. It installs the required Ubuntu packages, installs the project dependencies, runs the type check and tests, initializes or links the EAS project, builds the selected platform, downloads the resulting APK or IPA, and then creates a GitHub Release named `Version <version>` with the binary attached.

## How to obtain `EXPO_TOKEN`

Open [Expo access tokens](https://expo.dev/settings/access-tokens) while signed in to the Expo account that owns or has access to the FrierenCloud EAS project. Choose **Create token**, enter a recognizable name such as `frierencloud-github-actions`, choose the narrowest available access level, and create the token. Copy it immediately because it is a credential equivalent to a password and should not be committed to source code.

In GitHub, open the repository and go to **Settings → Secrets and variables → Actions → New repository secret**. Set the name to `EXPO_TOKEN`, paste the Expo token as the value, and save it. The workflow passes it to EAS through the `EXPO_TOKEN` environment variable. Expo documents that a token can authenticate EAS CLI in CI without running `eas login` and that leaked tokens can be revoked from the same Expo access-token page.

## Required repository secrets

| Name                                   | Required | Purpose                                                                                                              |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN`                           | Yes      | Authenticates EAS CLI from GitHub Actions.                                                                           |
| `EXPO_PUBLIC_SUPABASE_URL`             | Yes      | Supabase project URL passed into the Expo app at build time.                                                         |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase publishable/anon key passed into the Expo app at build time. Never use `service_role`.                      |
| `EXPO_PUBLIC_GITHUB_REPOSITORY`        | Yes      | Repository route in `owner/repository` format that contains `provision-linux.yml`, for example `MinhNekYT/App`.      |
| `RELEASE_GITHUB_TOKEN`                 | Optional | A user-created GitHub token for release creation. The workflow uses the built-in `github.token` when this is absent. |

GitHub automatically provides a short-lived `GITHUB_TOKEN` to each workflow job. The workflow requests `contents: write` and uses that built-in token to create the Release and upload artifacts. A separate repository secret named `GITHUB_TOKEN` should not be required; GitHub reserves the `GITHUB_` prefix for built-in variables. If a manually created token is required, store it as `RELEASE_GITHUB_TOKEN` instead and limit its repository permissions to the minimum needed for releases.

## Optional iOS secrets and credentials

An iOS IPA still needs valid Apple signing credentials. Configure the iOS credentials in the EAS project, or provide the Apple/ASC values recommended by Expo for CI when credential repair is needed. Internal iOS distribution generally requires registered device identifiers; an IPA that is not signed for the target device cannot be installed merely by copying it into ESign or a similar sideloading tool.

## Running the pipeline

Open **Actions → Build and Release FrierenCloud → Run workflow**, enter a semantic version such as `1.0.0`, and choose `all`, `android`, or `ios`. The workflow creates the tag `v1.0.0` and a Release titled **Version 1.0.0** after the selected build finishes. If validation fails, no Release is created.

The workflow deliberately uses `--wait` so the release step does not run before EAS has produced the binaries. It also validates the version, installs `curl`, `jq`, `unzip`, `git`, and CA certificates through `apt-get`, and runs `pnpm check` and `pnpm test` before spending time on the remote build.
