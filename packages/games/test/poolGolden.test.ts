/**
 * Pool's physics is wire-level: two phones on different builds must compute
 * the same table after every shot, to the bit. This pins the output of the
 * simulation so the step function can be made faster (issue #5) without ever
 * becoming different.
 *
 * `test/fixtures/pool-golden.json` was recorded from the simulation as it was
 * before any optimisation. If this test fails, the physics changed: that is a
 * protocol break, not a fixture to regenerate.
 *
 * Regenerate only for a deliberate, versioned physics change:
 *   POOL_GOLDEN_WRITE=1 pnpm --filter @airlink/games exec vitest run test/poolGolden.test.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { encodeCbor } from '@airlink/core';
import { GameStatusKind, SeededGameRandom, createContext } from '../src/engine.js';
import { pool, poolBeginShot, type PoolAction, type PoolState } from '../src/games/pool.js';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pool-golden.json');
const SEEDS = 50;
const MAX_SHOTS = 40;
const PLAYERS = ['p1', 'p2'];

const hashOf = (state: PoolState): string =>
  createHash('sha256').update(encodeCbor(pool.encodeState(state))).digest('hex').slice(0, 16);

/** Every shot of one seeded game, resolved the way `applyAction` does it. */
function playGame(seed: number): string[] {
  const setup = { players: PLAYERS, seed, options: {} };
  const random = new SeededGameRandom(seed * 7919 + 1);
  let state = pool.createInitialState(setup);
  const hashes = [hashOf(state)];
  for (let shot = 0; shot < MAX_SHOTS; shot++) {
    const player = pool.currentTurn?.(state);
    if (!player || pool.status(state).kind !== GameStatusKind.IN_PROGRESS) break;
    const action = {
      type: 'shoot',
      player,
      seq: shot,
      payload: { angle: random.nextInt(6284) / 1000, power: (200 + random.nextInt(801)) / 1000 },
    } as unknown as PoolAction;
    const context = createContext(PLAYERS, seed);
    if (!pool.validateAction(state, action, context).ok) break;
    state = pool.applyAction(state, action, context);
    hashes.push(hashOf(state));
  }
  return hashes;
}

/** The same shots, animated frame by frame through `tick`, as a UI plays them. */
function animateFirstShots(seed: number, shots: number): string[] {
  const setup = { players: PLAYERS, seed, options: {} };
  const random = new SeededGameRandom(seed * 104729 + 3);
  let state = pool.createInitialState(setup);
  const hashes: string[] = [];
  for (let shot = 0; shot < shots; shot++) {
    state = poolBeginShot(state, random.nextInt(6284) / 1000, (200 + random.nextInt(801)) / 1000);
    const context = createContext(PLAYERS, seed);
    for (let frame = 0; frame < 2000 && state.shooting; frame++) state = pool.tick!(state, context);
    hashes.push(hashOf(state));
  }
  return hashes;
}

function record(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (let seed = 1; seed <= SEEDS; seed++) out[`game-${seed}`] = playGame(seed);
  for (let seed = 1; seed <= 5; seed++) out[`ticked-${seed}`] = animateFirstShots(seed, 6);
  return out;
}

describe('pool physics is bit-for-bit unchanged', () => {
  it('matches the recorded table after every shot of 50 games', { timeout: 180_000 }, () => {
    const now = record();
    if (process.env.POOL_GOLDEN_WRITE === '1') {
      writeFileSync(FIXTURE, `${JSON.stringify(now, null, 1)}\n`);
      return;
    }
    const golden = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, string[]>;
    expect(Object.keys(now)).toEqual(Object.keys(golden));
    for (const key of Object.keys(golden)) expect(now[key], key).toEqual(golden[key]);
    // The recording is only worth something if the games actually went somewhere.
    const shots = Object.values(golden).reduce((n, h) => n + h.length, 0);
    expect(shots).toBeGreaterThan(SEEDS * 10);
  });
});
