/**
 * Test-only globals.
 *
 * The doubles in jest.setup.js expose a small amount of control - push a native
 * event in, make the keychain forget - and this declares that surface so the
 * tests can use it without `any`. None of it exists at runtime in the app.
 */
declare global {
  var __airlinkNativeTest:
    | {
        emit: (event: string, payload: unknown) => void;
        listenerCount: (event: string) => number;
        /** `kind` is present on the per-transport calls (advertising, discovery). */
        calls: () => { name: string; transports?: string[]; kind?: string }[];
        clearCalls: () => void;
      }
    | undefined;
  var __airlinkKeychainTest: { clear: () => void; size: () => number } | undefined;
  var __airlinkSqliteTest: { clear: () => void } | undefined;
  var __airlinkFsTest:
    | {
        copies: () => { from: string; to: string }[];
        unlinked: () => string[];
        /** Make every copy throw, as a full disk would. */
        failCopies: (fail: boolean) => void;
        clear: () => void;
      }
    | undefined;
}

export {};
