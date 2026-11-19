/**
 * Both people tap Connect: two links for one person, one in each direction.
 *
 * The tie is decided by installation id - the phone that should initiate keeps
 * its own dial, the other keeps the one it accepted - so both phones keep the
 * SAME link. It used to be decided from whether the handle's key started with
 * "inbound:", which adoptIdentity had already renamed away when the inbound
 * handshake finished first: both phones decided backwards, each kept the link
 * the other threw away, and both sessions died. For a friend, the surviving
 * session could also be left in no map at all.
 */
import { ConnectionState } from '@airlink/core';
import { AirLinkClient, type PeerHandle } from '../src/client/AirLinkClient.js';

interface Internals { createHandle(key: string): PeerHandle; peers: Map<string, PeerHandle>; }
const PEER = 'peer-friend-B';

function fakeAuthenticated(h: PeerHandle, remoteInstall: string): void {
  const s = h.session as unknown as Record<string, unknown>;
  Object.defineProperty(s, 'peerId', { get: () => PEER, configurable: true });
  Object.defineProperty(s, 'isSecure', { get: () => true, configurable: true });
  Object.defineProperty(s, 'capabilities', { get: () => ({ deviceId: remoteInstall }), configurable: true });
  Object.defineProperty(s, 'state', { get: () => ConnectionState.CONNECTED, configurable: true });
}

async function run(remoteInstall: string) {
  const client = new AirLinkClient({ appVersion: '1', platform: 'ios', deviceModel: 't' });
  await client.load();
  await client.createProfile('A', null);
  (client as unknown as { capabilities: unknown }).capabilities = { availableKinds: () => [] };
  const internals = client as unknown as Internals;
  const local = client.localIdentity.deviceId;
  const weInitiate = local < remoteInstall;

  // Simultaneous dial with a FRIEND: our outbound handle is keyed on the peer id
  // (registry key for a recognised friend); B's dial arrives as inbound:1.
  const outbound = internals.createHandle(PEER);
  const inbound = internals.createHandle('inbound:1');
  const closed: string[] = [];
  outbound.session.events.on('closed', () => closed.push('outbound'));
  inbound.session.events.on('closed', () => closed.push('inbound'));

  // The inbound (responder) handshake happens to finish first.
  fakeAuthenticated(inbound, remoteInstall);
  inbound.session.events.emit('stateChanged', { state: ConnectionState.CONNECTED });
  const outboundStillMappedAfterInbound = internals.peers.get(PEER) === outbound;

  fakeAuthenticated(outbound, remoteInstall);
  outbound.session.events.emit('stateChanged', { state: ConnectionState.CONNECTED });
  await new Promise<void>((r) => setTimeout(r, 10));

  return {
    weInitiate,
    expectedKeep: weInitiate ? 'outbound' : 'inbound',
    discarded: closed,
    mapped: internals.peers.get(PEER) === outbound ? 'outbound' : internals.peers.get(PEER) === inbound ? 'inbound' : 'NOTHING',
    lookup: client.peer(PEER) === undefined ? 'undefined' : client.peer(PEER) === outbound ? 'outbound' : 'inbound',
    outboundStillMappedAfterInbound,
  };
}

test('simultaneous dial, inbound finishes first, we initiate', async () => {
  const r = await run('ffffffff-ffff-ffff-ffff-ffffffffffff');
  expect(r.discarded).toEqual(['inbound']);
  expect(r.mapped).toBe('outbound');
  expect(r.lookup).toBe('outbound');
});

test('simultaneous dial, inbound finishes first, peer initiates', async () => {
  const r = await run('00000000-0000-0000-0000-000000000000');
  expect(r.discarded).toEqual(['outbound']);
  expect(r.mapped).toBe('inbound');
  expect(r.lookup).toBe('inbound');
});
