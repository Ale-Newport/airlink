# Security policy

AirLink is a peer-to-peer app whose whole promise is privacy with no server in
the middle, so security reports are the most valuable contribution there is.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub:
[**Report a vulnerability**](https://github.com/Ale-Newport/airlink/security/advisories/new)
(Security tab → *Report a vulnerability*). Only the maintainer can see it.

Helpful things to include:

- what an attacker can do, and from where (in Bluetooth range, on the same
  Wi-Fi, holding the phone, a malicious peer that has already paired…)
- the steps, a proof of concept, or a failing test against `packages/core`
- the app version or commit, and the platform

You can expect an acknowledgement within **5 days** and a first assessment
within **14 days**. Fixes are released as soon as they are ready, and you will
be credited in the advisory unless you would rather not be.

## Supported versions

| Version | Supported |
|---|---|
| `main` and the latest release | ✅ |
| Older releases | ❌, please update |

## Scope

In scope: the protocol and cryptography in `packages/core`, the native
transports in `native/`, the mobile app in `apps/mobile`, and this repository's
CI configuration.

Particularly interesting: anything that defeats the six-digit / QR pairing
check, impersonates a previously trusted peer, decrypts or replays traffic,
links a device across launches from its advertisements, or crashes a phone from
a nearby unpaired device.

Out of scope: attacks that need an unlocked phone in hand; denial of service by
jamming the radio; the limitations already stated in
[`docs/SECURITY.md`](docs/SECURITY.md).

## How the project protects itself

- The design, threat model and known limitations are documented in
  [`docs/SECURITY.md`](docs/SECURITY.md). No invented cryptography: the
  primitives come from the audited `@noble` libraries.
- GitHub secret scanning and push protection are on; CI also runs
  [gitleaks](https://github.com/gitleaks/gitleaks) over the full history.
- CodeQL analyses every push and pull request; Dependabot watches npm, GitHub
  Actions and Gradle dependencies.
- Every change from outside the maintainer requires a code-owner review before
  it can merge, and workflows run with read-only tokens by default.

## Known dependency advisories

`pnpm audit` currently reports two advisories that have no fix inside the major
version their parent depends on. Both are tracked rather than forced:

| Package | Pulled in by | Why it is not overridden | Exposure |
|---|---|---|---|
| `image-size` 1.x | Metro (the React Native bundler) | The fix exists only in 2.x, whose API Metro does not use | Build machine only; it reads this repository's own images |
| `decode-uri-component` 0.2.x | React Navigation → `query-string` 7 | The fix exists only in ESM-only 0.5.x, which a CommonJS parent cannot load | Deep-link parsing only; AirLink registers no URL scheme and gives React Navigation no linking config, so no outside URL reaches it |

They will be removed as soon as the parents move. All other advisories are
patched through `pnpm-workspace.yaml` overrides.
