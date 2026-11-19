# Contributing to AirLink

Thank you for considering it. AirLink is small enough that one good pull
request makes a real difference, and the codebase is built so that most of it
can be worked on **without a phone**.

## Ground rules

- **Be kind.** Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- **Security problems go through a private report,** never an issue. See
  [SECURITY.md](SECURITY.md).
- **Open an issue before a large change.** A quick conversation saves you
  from writing something that cannot be merged.
- **Every pull request is reviewed by the maintainer** ([@Ale-Newport](https://github.com/Ale-Newport))
  before it merges. That is enforced by a branch ruleset and
  [CODEOWNERS](.github/CODEOWNERS), not just a convention.

## How to contribute

1. **Fork** the repository and create a branch from `main`
   (`fix/handshake-timeout`, `feat/game-hangman`…).
2. Make your change, with tests.
3. Run the checks below until they are all green.
4. Open a pull request against `main` and fill in the template.
5. CI runs automatically (a first-time contributor's run waits for the
   maintainer to approve it, as GitHub requires). Address review comments by
   pushing more commits; new commits dismiss earlier approvals.

Not sure where to start? Look for
[`good first issue`](https://github.com/Ale-Newport/airlink/labels/good%20first%20issue)
and [`help wanted`](https://github.com/Ale-Newport/airlink/labels/help%20wanted).
Questions are welcome in [Discussions](https://github.com/Ale-Newport/airlink/discussions).

## Setting up

Node 22+ and pnpm 10 (`corepack enable` gives you the exact version pinned in
`package.json`).

```bash
git clone https://github.com/<you>/airlink.git
cd airlink
pnpm install
```

### The checks CI runs

```bash
pnpm typecheck      # every package, strict TypeScript
pnpm test           # ~1,500 Node tests: protocol, crypto, games, database
pnpm lint           # ESLint on the mobile app
pnpm --filter @airlink/mobile test   # React Native screens under Jest
pnpm harness        # the real protocol over a simulated radio
pnpm demo:build     # the live demo page
```

None of these need a phone, a simulator or the network.

### Running the app

See [README → Getting started](README.md#getting-started) and
[docs/IOS.md](docs/IOS.md) / [docs/ANDROID.md](docs/ANDROID.md). The iOS
simulator has no Bluetooth radio but does speak local Wi-Fi, so one phone plus
one simulator covers most features.

## Where things live

| Path | What | Phone needed? |
|---|---|---|
| `packages/core` | Protocol, crypto, sessions, transports, features | No |
| `packages/games` | Deterministic game reducers + conformance suite | No |
| `packages/db` | SQLite schema, migrations, repositories | No |
| `packages/config` | Branding, theme, strings | No |
| `apps/mobile` | React Native screens and design system | For a real run |
| `native/` | Swift and Kotlin radio code | Yes, two for BLE |
| `demo/` | The live protocol demo on GitHub Pages | No |

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. The key idea is that
the native layer is deliberately dumb and everything hard is pure TypeScript.

## What a good pull request looks like

- **Tests come with the change.** A bug fix includes a test that fails without
  it. Protocol changes need a scenario under the simulated network
  (`MockNetwork` + `VirtualClock`), not just a unit test.
- **Games are deterministic.** Same setup + same actions = same state on both
  phones. A new game must pass `runConformance` across many seeds; see
  [docs/GAMES.md](docs/GAMES.md).
- **The wire format is a contract.** Changing anything in
  [docs/PROTOCOL.md](docs/PROTOCOL.md) needs a version bump and a
  compatibility story for phones that have not updated.
- **No new cryptography.** Compose the `@noble` primitives already in use.
- **Docs move with the code.** If behaviour changes, so does the doc that
  describes it.
- **Commit messages say what changed and why**, in plain sentences, as in the
  existing history.
- **Accessibility counts.** New UI needs accessible labels and must work with
  Dynamic Type and VoiceOver / TalkBack.

## Licence

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE), like the rest of the project.
