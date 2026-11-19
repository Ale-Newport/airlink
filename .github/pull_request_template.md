## What this changes

<!-- One or two sentences: what, and why. Link the issue: "Fixes #123". -->

## How it was tested

<!-- Which tests you added or ran. For radio or UI changes: which phones, which transport. -->

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm lint` and `pnpm --filter @airlink/mobile test` (if `apps/mobile` changed)
- [ ] Tried on a device or simulator (if the change is visible or touches `native/`)

## Checklist

- [ ] Tests cover the change (a bug fix has a test that failed before it)
- [ ] Docs updated where behaviour changed
- [ ] No change to the wire format, **or** `PROTOCOL_VERSION` and `docs/PROTOCOL.md` are updated with a compatibility note
- [ ] No new cryptography; only the existing `@noble` primitives
- [ ] New UI has accessibility labels

<!--
Every pull request needs an approving review from the code owner before it can
merge. New commits dismiss earlier approvals. See CONTRIBUTING.md.
-->
