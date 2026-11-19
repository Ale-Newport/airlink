# Changelog

All notable changes to AirLink are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). The version matches the iOS app's
marketing version.

## [Unreleased]

## [1.0.0] - 2026-11-19

The first public release: two phones with no signal, no Wi-Fi and no server can
find each other, pair securely, chat, share files, play together and watch a
video in sync.

### Connecting

- Discovery and connection over **Bluetooth Low Energy**, Apple peer-to-peer
  Wi-Fi, Wi-Fi Direct, and Bonjour / NSD on a shared local network, behind one
  transport abstraction.
- A session **outlives its link**: it survives a dropped connection and moves
  from Bluetooth to Wi-Fi mid-conversation with no new handshake and no lost
  messages.
- Reliable, ordered delivery over lossy links: retransmission, reordering,
  duplicate suppression and fragmentation down to a 180-byte Bluetooth MTU.
- Presence as a heartbeat, so the Home screen list reflects who is really in
  range. An incoming Bluetooth link is routed by what it says rather than by
  who happens to be disconnected.
- A Mac's Bluetooth radio can act as a second phone for testing
  (`scripts/ble-mac-peer.sh`), speaking the real protocol.

### Security

- Ed25519 identity generated on the device; nothing derived from hardware.
- SIGMA-I authenticated key exchange over X25519, then ChaCha20-Poly1305 with
  per-direction keys and an RFC 6479 replay window.
- First meeting confirmed by a QR code or a matching six-digit code; a test
  runs the man-in-the-middle attack it defeats. Every later meeting is silent
  and pinned to the stored identity key.
- A per-run discovery id in advertisements: a device recognises its own
  broadcast, and nothing links it across launches.

### Features

- **Chat** with photos, voice notes, replies, reactions, read receipts and
  typing indicators, stored locally in SQLite, with a familiar message bar.
- **28 two-player games**, from chess with the full rules to real-time air
  hockey and 8-ball, sorted by what the current link can carry. Every game
  passes a shared determinism and anti-cheat conformance suite.
- **File sharing**: chunked, resumable, verified transfer with an honest ETA.
- **Watch together**: the same local video on both phones, kept in step to
  within tens of milliseconds.
- Block and report from any message; developer mode with a copyable diagnostics
  report for bug reports.

### Platforms

- iOS app built with React Native 0.87 and Swift (CoreBluetooth,
  Network.framework), prepared for the App Store, with scripts to install a
  standalone Release build on your own iPhone with a free Apple ID.
- Android transport written in Kotlin (BLE, NSD, Wi-Fi Direct); not yet
  compiled on a real Android toolchain (see `docs/ANDROID.md`).

### Fixed during device testing

- Voice notes and Bluetooth-only connections on two real iPhones.
- A crash on Connect, self-discovery, safe-area and tab-icon defects.
- Lost metadata in the reorder buffer; packet loss during connect and clock
  sync; BLOB columns normalised at the database driver boundary.
- Attachments no longer render greyed out in the chat.

### Project

- MIT licence, contribution guide, code of conduct and security policy.
- A **live demo** that runs the real protocol in the browser on GitHub Pages,
  and a README demo recorded on an iPhone in airplane mode.
- CI on every push and pull request: typecheck and ~1,700 tests on Node 22 and
  24, ESLint, a dependency audit, a full-history secret scan, CodeQL, and an
  iOS Simulator build.
- Empty BLOBs (an incoming file's hash before its bytes arrive) are stored as
  empty rather than failing `NOT NULL` on a driver that binds a zero-length
  buffer as NULL, as Node 22's `node:sqlite` does. Found by the new Node 22 CI
  job.
- Base64 decoding strips padding with a loop instead of `/=+$/`, which took
  18 seconds on a 200 KB run of `=` from a peer or a QR code; it now rejects
  that input at once. Found by CodeQL.
- Branch rulesets: every outside contribution needs the code owner's approval.
- The network harness now exits non-zero when a check fails and is covered by
  its own tests; the 8-ball conformance test has a timeout that fits its work.
- Patched the dev-tooling advisories reported by `pnpm audit` (Vitest 4,
  Vite 7.3.8 and scoped overrides). Two remaining ones are documented in
  `SECURITY.md`.
- The repository is now `Ale-Newport/airlink`; the old `BluetoothConect` URLs
  redirect.

[Unreleased]: https://github.com/Ale-Newport/airlink/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Ale-Newport/airlink/releases/tag/v1.0.0
