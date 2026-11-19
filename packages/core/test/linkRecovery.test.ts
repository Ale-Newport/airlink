/**
 * Two ways a session used to be left holding a link it would never use again.
 *
 * 1. Silence, then traffic. The liveness timer moves to RECONNECTING after ~20 s
 *    of silence but leaves the link open, and nothing moved back when the peer
 *    spoke again - so a link that recovered carried nothing until a new dial
 *    replaced it, which a backgrounded iPhone may never allow.
 *
 * 2. A first meeting whose link dies mid-ceremony. PAIRING has no
 *    RECONNECTING, so nothing announced the loss and nothing redialled; and
 *    when a new link did arrive, migrateToLink jumped straight to CONNECTED
 *    as if the six digits had been compared.
 */
import { describe, expect, it } from 'vitest';
import { TransportKind, type PeerCapabilities } from '../src/protocol/capabilities.js';
import { SeededRandom } from '../src/crypto/random.js';
import { createIdentity } from '../src/crypto/identity.js';
import type { HandshakeConfig } from '../src/crypto/handshake.js';
import { PeerSession } from '../src/session/peerSession.js';
import { ConnectionState } from '../src/session/stateMachine.js';
import { MockNetwork, mockToken } from '../src/transport/mock.js';
import { VirtualClock } from '../src/util/time.js';
import { PROTOCOL_VERSION, MessageType } from '../src/protocol/constants.js';
import { LinkState } from '../src/transport/types.js';

function caps(name: string): PeerCapabilities {
  return {
    protocolVersion: PROTOCOL_VERSION, appVersion: '0', platform: 'node', deviceModel: 'sim', displayName: name,
    deviceId: `device-${name}`, transports: [TransportKind.MOCK], features: [], games: [], maxPayloadBytes: 65536,
  };
}

async function pair(trusted: boolean) {
  const clock = new VirtualClock();
  const network = new MockNetwork(clock, 0xa11);
  const rA = new SeededRandom(1);
  const rB = new SeededRandom(2);
  const idA = createIdentity(rA, 1000);
  const idB = createIdentity(rB, 1000);
  const cfgA: HandshakeConfig = {
    identity: idA, capabilities: caps('A'), random: rA,
    lookupTrustedKey: (p) => (trusted && p === idB.peerId ? idB.signing.publicKey : undefined),
  };
  const cfgB: HandshakeConfig = {
    identity: idB, capabilities: caps('B'), random: rB,
    lookupTrustedKey: (p) => (trusted && p === idA.peerId ? idA.signing.publicKey : undefined),
  };
  const tA = network.createTransport('endpoint-a');
  const tB = network.createTransport('endpoint-b');
  await tB.startAdvertising({ protocolVersion: PROTOCOL_VERSION, token: mockToken(2), displayName: 'B' });
  await tA.startDiscovery();
  const a = new PeerSession('b', { clock, handshake: cfgA });
  const b = new PeerSession('a', { clock, handshake: cfgB });
  tB.events.on('incomingLink', ({ link }) => {
    if (b.isSecure) b.migrateToLink(link);
    else b.startAsResponder(link);
  });
  const pending = tA.connect('endpoint-b');
  await clock.advanceAsync(200);
  const linkA = await pending;
  await a.startAsInitiator(linkA);
  await clock.advanceAsync(2000);
  return { clock, network, a, b, tA, linkA };
}

describe('a link that goes quiet and then recovers', () => {
  it('is picked up again as soon as the peer speaks on it', async () => {
    const { clock, network, a, b, linkA } = await pair(true);
    expect(a.state).toBe(ConnectionState.CONNECTED);

    network.setConditions({ reliableLossRate: 1, realtimeLossRate: 1 });
    await clock.advanceAsync(25_000);
    expect(a.state).toBe(ConnectionState.RECONNECTING);
    network.setConditions({ reliableLossRate: 0, realtimeLossRate: 0 });

    const got: string[] = [];
    a.events.on('message', (m) => {
      if (m.type === MessageType.MESSAGE) got.push((m.value as { t: string }).t);
    });
    for (let i = 0; i < 3; i++) {
      b.sendReliable(MessageType.MESSAGE, { t: `hi${i}` });
      await clock.advanceAsync(1000);
    }
    await clock.advanceAsync(20_000);

    expect(linkA.state).toBe(LinkState.CONNECTED);
    expect(a.state).toBe(ConnectionState.CONNECTED);
    expect(got).toEqual(['hi0', 'hi1', 'hi2']);
  });
});

describe('a first meeting whose link dies mid-ceremony', () => {
  it('says so, and stays a first meeting on the new link until both confirm', async () => {
    const { clock, network, a, b, tA, linkA } = await pair(false);
    expect(a.state).toBe(ConnectionState.PAIRING);

    const lost: string[] = [];
    a.events.on('linkLost', () => lost.push(a.state));
    network.partition('endpoint-a', 'endpoint-b');
    await clock.advanceAsync(100);
    expect(linkA.state).toBe(LinkState.CLOSED);
    expect(lost).toEqual([ConnectionState.PAIRING]);

    network.heal('endpoint-a', 'endpoint-b');
    const pending = tA.connect('endpoint-b');
    await clock.advanceAsync(300);
    a.migrateToLink(await pending);
    await clock.advanceAsync(500);
    // Not CONNECTED: nobody has compared the six digits yet.
    expect(a.state).toBe(ConnectionState.PAIRING);

    a.confirmPairing(true);
    b.confirmPairing(true);
    await clock.advanceAsync(1000);
    expect(a.state).toBe(ConnectionState.CONNECTED);
  });
});
