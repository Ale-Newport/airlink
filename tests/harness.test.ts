/**
 * The network harness is what the README and the live demo show people, so
 * every verdict it prints must be a passing one. Running it here means a
 * protocol change that breaks a demo scenario fails CI instead of the demo.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS, type Reporter } from '../scripts/harness/scenarios.js';

function collector(): Reporter & { verdicts: { ok: boolean; detail: string }[]; rows: Map<string, string> } {
  const verdicts: { ok: boolean; detail: string }[] = [];
  const rows = new Map<string, string>();
  return {
    verdicts,
    rows,
    heading() {},
    row(label, value) {
      rows.set(label, value);
    },
    verdict(ok, detail) {
      verdicts.push({ ok, detail });
    },
  };
}

describe('network harness', () => {
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    it(`${name}: every verdict passes`, { timeout: 60_000 }, async () => {
      const out = collector();
      await scenario(out);
      expect(out.verdicts.filter((v) => !v.ok)).toEqual([]);
      // ping reports measurements only; the rest must actually assert something.
      if (name !== 'ping') expect(out.verdicts.length).toBeGreaterThan(0);
    });
  }

  it('upgrade keeps the session authenticated without a new handshake', async () => {
    const out = collector();
    await SCENARIOS.upgrade!(out);
    expect(out.rows.get('Still authenticated')).toBe('yes, no re-handshake');
    expect(out.rows.get('Transport changes')).toBe('1');
  });

  it('reconnect retains the session keys while the link is down', async () => {
    const out = collector();
    await SCENARIOS.reconnect!(out);
    expect(out.rows.get('Session keys retained')).toBe('yes');
    expect(out.rows.get('After reconnect')).toBe('connected');
  });
});
