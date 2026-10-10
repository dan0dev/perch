# Releasing Perch

Releases are built by GitHub Actions from the tagged source, never on a personal machine, so
anyone can see exactly what produced the installer.

## Make a release

1. Bump `version` in `package.json` (for example `0.1.0` → `0.2.0`) and commit.
2. Tag and push:

   ```bash
   git tag v0.2.0
   git push origin main v0.2.0
   ```

3. The [Release workflow](../.github/workflows/release.yml) runs typecheck and tests, builds on
   `windows-latest`, and publishes a GitHub Release with:
   - `Perch-Setup-0.2.0.exe`: per-user one-click installer
   - `Perch-0.2.0-win-x64.zip`: portable
   - `SHA256SUMS.txt`

   The workflow refuses to publish if the tag doesn't match `package.json`.

4. Edit the generated release notes if needed.

To test the pipeline without publishing, open **Actions → Release → Run workflow**. It builds
everything and attaches the files to the run as an artifact.

## winget

So people can run `winget install dan0dev.Perch`. (Another app called Perch, `EagleSpirit.Perch`,
already uses the short name `perch` on winget, so ours is always referred to by its full ID.)

The manifests for each release live in `packaging/winget/<version>/` and can be checked with
`winget validate --manifest packaging\winget\<version>`.

1. Install the tool once: `winget install Microsoft.WingetCreate`
2. Submit (opens a pull request to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs)
   from your GitHub account; a Microsoft bot validates it and a moderator merges it):

   ```powershell
   wingetcreate submit packaging\winget\0.1.0 --token (gh auth token)
   ```

3. Later releases are submitted automatically: the Release workflow's `winget` job opens the
   pull request when a `WINGET_TOKEN` secret exists (a classic GitHub token with only the
   `public_repo` scope). Without the secret the job is skipped and you can do it by hand:

   ```powershell
   wingetcreate update dan0dev.Perch --version 0.2.0 --urls https://github.com/dan0dev/perch/releases/download/v0.2.0/Perch-Setup-0.2.0.exe --submit --token (gh auth token)
   ```

## Code signing

Unsigned installers trigger the SmartScreen "Windows protected your PC" prompt, which stops
many people. [SignPath Foundation](https://signpath.org/) signs open-source projects for free,
with builds coming from CI. Apply once the first release is out; their terms list what they
expect from a project. When approved, add their signing step to `release.yml` between "Build
installer and zip" and "Checksums", and drop the SmartScreen note from the README.

## Rules that stay true in every release

- No network calls of any kind, including update checks.
- The clipboard is only ever read for images.
