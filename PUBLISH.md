# Publishing

Releases are automated via [`.github/workflows/publish.yml`](.github/workflows/publish.yml).
There is no manual `npm publish` step in normal use — publishing happens as a side effect of
merging a version bump to `main`.

## How it works

On every push to `main`, the workflow:

1. Compares the `version` field in `package.json` against the version currently published on
   npm (`npm view nextjs-nestapi version`).
2. If they're the same, the workflow exits early — nothing else runs. This is what makes
   pushing to `main` safe on every commit, not just release commits.
3. If they differ, it:
   - installs dependencies (`yarn install --frozen-lockfile`)
   - builds (`npm run build`)
   - publishes to npm (`npm publish --provenance`)
   - creates a git tag `v<version>` and pushes it
   - creates a GitHub Release for that tag with `gh release create --generate-notes`, which
     auto-generates the release description from the commits/PRs merged since the previous tag

## Releasing a new version

1. Bump `version` in `package.json` (following semver) as part of your normal change.
2. Merge to `main`.
3. That's it — the workflow publishes to npm and creates the GitHub Release automatically.
   Check the **Actions** tab to confirm the run succeeded.

No separate tagging step, changelog file, or release commit is needed — the release notes
come from commit/PR history automatically, so write clear commit messages and PR titles.

## Dev builds

Every push to the `dev` branch publishes an npm **prerelease** via
[`.github/workflows/publish-dev.yml`](.github/workflows/publish-dev.yml), separate from the
`main` release flow above:

- No version-diff gate — every push to `dev` publishes, since `dev` is a continuous preview
  channel, not a release branch.
- The version published is `<package.json version>-dev.<run number>` (e.g. `1.0.0-dev.12`),
  computed at publish time — `package.json` on `dev` itself is never bumped or committed.
- Published under the npm dist-tag `dev`, so it never touches `latest`. Consumers opt in with:
  ```
  npm install nextjs-nestapi@dev
  ```
- No git tag or GitHub Release is created for dev builds — only real releases from `main` get
  those.

## One-time setup

- An npm **Automation**-type access token must exist as the `NPM_TOKEN` secret under
  **Settings → Secrets and variables → Actions**. Automation tokens are required because they
  skip the 2FA/OTP prompt that a normal npm token would block CI on.
- **Settings → Actions → General → Workflow permissions** must be set to "Read and write
  permissions" — the workflow pushes a git tag and creates a GitHub Release using the default
  `GITHUB_TOKEN`.

## Notes

- The workflow reinstalls with `yarn install --frozen-lockfile` (this repo's root lockfile is
  `yarn.lock`), but still builds and publishes via the `npm` scripts already defined in
  `package.json` — no change to the existing build/publish tooling.
- `publishConfig` in `package.json` already sets the registry and public access, so
  `npm publish` needs no extra flags beyond `--provenance`.
- If you need to publish manually (e.g. the workflow is broken), run `npm run build` then
  `npm publish` locally — you'll need npm auth and may hit a 2FA/OTP prompt, which the CI
  automation token avoids.
