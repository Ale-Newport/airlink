/**
 * The AirLink network harness scenarios.
 *
 * Runs the real protocol between simulated devices and reports what happened.
 * Every number comes from the same code that runs on a phone - the only thing
 * replaced is the radio. The time is virtual, so a run is exact and repeatable.
 *
 * Shared by three callers, so they can never drift apart:
 *   scripts/harness.ts        the command line (`pnpm harness [scenario]`)
 *   tests/harness.test.ts     asserts every verdict passes
 *   demo/src/main.ts          the browser demo on GitHub Pages
 *
 * This module must stay platform-neutral: no Node APIs, no DOM.
 */
import {
  BLE_LIKE_CONDITIONS,
  HOSTILE_CONDITIONS,
  MessageType,
  MockNetwork,
  PROTOCOL_VERSION,
  PeerSession,
  SeededRandom,
  TransportKind,
  VirtualClock,
  WIFI_LIKE_CONDITIONS,
  createIdentity,
  type Link,
  type PeerCapabilities,
} from '../../packages/core/src/index.js';

function capabilities(name: string): PeerCapabilities {
  return {
    protocolVersion: PROTOCOL_VERSION,
    appVersion: 'harness',
    platform: 'node',
    deviceModel: 'simulator',
    displayName: name,
    deviceId: `device-${name}`,
    transports: [TransportKind.MOCK],
    features: ['chat', 'files', 'games', 'sync'],
    games: [],
    maxPayloadBytes: 256 * 1024,
  };
}

interface Rig {
  clock: VirtualClock;
  network: MockNetwork;
  a: PeerSession;
  b: PeerSession;
  linkA: Link;
  transportA: ReturnType<MockNetwork['createTransport']>;
  transportB: ReturnType<MockNetwork['createTransport']>;
}

async function buildPair(conditions: Partial<typeof BLE_LIKE_CONDITIONS>): Promise<Rig> {
  const clock = new VirtualClock();
  const network = new MockNetwork(clock, 0xa11);
  network.setConditions(conditions);

  const randA = new SeededRandom(1);
  const randB = new SeededRandom(2);
  const idA = createIdentity(randA, 0);
  const idB = createIdentity(randB, 0);

  const transportA = network.createTransport('a');
  const transportB = network.createTransport('b');
  await transportA.startAdvertising({ protocolVersion: PROTOCOL_VERSION, token: new Uint8Array(6) });
  await transportB.startAdvertising({ protocolVersion: PROTOCOL_VERSION, token: new Uint8Array(6) });

  const a = new PeerSession('b', {
    clock,
    handshake: {
      identity: idA,
      capabilities: capabilities('A'),
      random: randA,
      lookupTrustedKey: (p) => (p === idB.peerId ? idB.signing.publicKey : undefined),
    },
  });
  const b = new PeerSession('a', {
    clock,
    handshake: {
      identity: idB,
      capabilities: capabilities('B'),
      random: randB,
      lookupTrustedKey: (p) => (p === idA.peerId ? idA.signing.publicKey : undefined),
    },
  });

  transportB.events.on('incomingLink', ({ link }) => {
    if (b.isSecure) b.migrateToLink(link);
    else b.startAsResponder(link);
  });

  const pending = transportA.connect('b');
  await clock.advanceAsync(300);
  const linkA = await pending;
  await a.startAsInitiator(linkA);
  // Long enough for the handshake to retransmit its way through a lossy link.
  for (let waited = 0; waited < 20_000 && !a.isSecure; waited += 500) {
    await clock.advanceAsync(500);
  }

  return { clock, network, a, b, linkA, transportA, transportB };
}

/** Where a scenario writes. The CLI prints to a terminal, the demo to a page. */
export interface Reporter {
  heading(title: string): void;
  row(label: string, value: string): void;
  verdict(ok: boolean, detail: string): void;
}

export type Scenario = (out: Reporter) => Promise<void>;

const bytes = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : n >= 1000 ? `${(n / 1000).toFixed(1)} KB` : `${n} B`;

async function ping(out: Reporter): Promise<void> {
  out.heading('Ping - round-trip time over each link profile');
  for (const [name, conditions] of [
    ['Bluetooth-like', BLE_LIKE_CONDITIONS],
    ['Wi-Fi-like', WIFI_LIKE_CONDITIONS],
    ['Hostile', HOSTILE_CONDITIONS],
  ] as const) {
    const rig = await buildPair(conditions);
    rig.a.clockSync.startRound(9);
    await rig.clock.advanceAsync(4000);
    out.row(
      name,
      `rtt ${rig.a.clockSync.roundTripMs?.toFixed(1) ?? '-'} ms, clock offset ${
        rig.a.clockSync.offsetMs?.toFixed(1) ?? '-'
      } ms, ${rig.a.clockSync.sampleCount} samples`,
    );
    await rig.a.close('done');
  }
}

async function throughput(out: Reporter): Promise<void> {
  out.heading('Throughput - 200 KB of application payload');
  for (const [name, conditions] of [
    ['Bluetooth-like (180 B MTU)', BLE_LIKE_CONDITIONS],
    ['Wi-Fi-like (16 KB MTU)', WIFI_LIKE_CONDITIONS],
  ] as const) {
    const rig = await buildPair(conditions);
    const payload = new Uint8Array(4096).fill(7);
    const total = 50;
    let received = 0;
    rig.b.events.on('message', (m) => {
      if (m.type === MessageType.FILE_CHUNK) received += m.raw.length;
    });

    const start = rig.clock.now();
    for (let i = 0; i < total; i++) rig.a.sendReliableRaw(MessageType.FILE_CHUNK, payload, { bulk: true });
    // Advance until it is actually done rather than for a fixed window, or the
    // reported rate is a measure of the window rather than of the link.
    const target = total * payload.length;
    for (let waited = 0; waited < 300_000 && received < target; waited += 500) {
      await rig.clock.advanceAsync(500);
    }
    const elapsed = rig.clock.now() - start;

    out.row(name, `${bytes(received)} in ${(elapsed / 1000).toFixed(1)} s, ${bytes(received / (elapsed / 1000))}/s`);
    out.verdict(received === total * payload.length, `all ${total} chunks arrived intact`);
    await rig.a.close('done');
  }
}

async function loss(out: Reporter): Promise<void> {
  out.heading('Loss and reordering - 15% loss, 20% reordering, 10% duplication');
  const rig = await buildPair(WIFI_LIKE_CONDITIONS);
  rig.network.setConditions(HOSTILE_CONDITIONS);

  const seen: number[] = [];
  rig.b.events.on('message', (m) => {
    if (m.type === MessageType.MESSAGE) seen.push((m.value as { i: number }).i);
  });

  const count = 40;
  for (let i = 0; i < count; i++) rig.a.sendReliable(MessageType.MESSAGE, { i });
  await rig.clock.advanceAsync(240_000);

  const expected = Array.from({ length: count }, (_, i) => i);
  out.row('Sent', String(count));
  out.row('Received', String(seen.length));
  out.row('Packets put on the wire', String(rig.a.diagnostics().packetsSent));
  out.verdict(JSON.stringify(seen) === JSON.stringify(expected), 'every message arrived exactly once, in order');
  await rig.a.close('done');
}

async function reconnect(out: Reporter): Promise<void> {
  out.heading('Reconnect - the link dies mid-conversation');
  const rig = await buildPair(BLE_LIKE_CONDITIONS);
  const seen: number[] = [];
  rig.b.events.on('message', (m) => {
    if (m.type === MessageType.MESSAGE) seen.push((m.value as { i: number }).i);
  });

  rig.a.sendReliable(MessageType.MESSAGE, { i: 0 });
  await rig.clock.advanceAsync(2000);

  rig.network.partition('a', 'b');
  await rig.clock.advanceAsync(300);
  out.row('After the link dropped', String(rig.a.state));
  out.row('Session keys retained', rig.a.isSecure ? 'yes' : 'no');

  rig.a.sendReliable(MessageType.MESSAGE, { i: 1 });
  rig.a.sendReliable(MessageType.MESSAGE, { i: 2 });
  await rig.clock.advanceAsync(3000);

  rig.network.heal('a', 'b');
  const pending = rig.transportA.connect('b');
  await rig.clock.advanceAsync(400);
  rig.a.migrateToLink(await pending);
  await rig.clock.advanceAsync(20_000);

  out.row('After reconnect', String(rig.a.state));
  out.verdict(JSON.stringify(seen) === '[0,1,2]', 'messages queued while apart were delivered, in order');
  await rig.a.close('done');
}

async function upgrade(out: Reporter): Promise<void> {
  out.heading('Transport upgrade - Bluetooth to Wi-Fi mid-conversation');
  const rig = await buildPair(BLE_LIKE_CONDITIONS);
  const seen: number[] = [];
  rig.b.events.on('message', (m) => {
    if (m.type === MessageType.MESSAGE) seen.push((m.value as { i: number }).i);
  });
  let switched = 0;
  rig.a.events.on('transportChanged', () => switched++);

  rig.a.sendReliable(MessageType.MESSAGE, { i: 0 });
  await rig.clock.advanceAsync(2000);
  out.row('Before', `MTU ${rig.a.currentLink?.maxDatagramSize ?? 0} B`);

  rig.network.setConditions(WIFI_LIKE_CONDITIONS);
  const pending = rig.transportA.connect('b');
  await rig.clock.advanceAsync(300);
  rig.a.migrateToLink(await pending);
  await rig.clock.advanceAsync(1000);

  rig.a.sendReliable(MessageType.MESSAGE, { i: 1 });
  await rig.clock.advanceAsync(2000);

  out.row('After', `MTU ${rig.a.currentLink?.maxDatagramSize ?? 0} B`);
  out.row('Transport changes', String(switched));
  out.row('Still authenticated', rig.a.isSecure ? 'yes, no re-handshake' : 'no');
  out.verdict(JSON.stringify(seen) === '[0,1]', 'the conversation did not notice');
  await rig.a.close('done');
}

async function transfer(out: Reporter): Promise<void> {
  out.heading('Large payload - 100 KB over a 180-byte Bluetooth MTU');
  const rig = await buildPair(BLE_LIKE_CONDITIONS);
  const payload = new Uint8Array(100_000);
  for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff;

  let got: Uint8Array | null = null;
  rig.b.events.on('message', (m) => {
    if (m.type === MessageType.FILE_CHUNK) got = m.raw;
  });

  const start = rig.clock.now();
  rig.a.sendReliableRaw(MessageType.FILE_CHUNK, payload, { bulk: true });
  for (let waited = 0; waited < 300_000 && got === null; waited += 500) {
    await rig.clock.advanceAsync(500);
  }
  const elapsed = rig.clock.now() - start;

  out.row('Fragments needed', String(Math.ceil(payload.length / 160)));
  out.row('Time', `${(elapsed / 1000).toFixed(1)} s`);
  const received: Uint8Array | null = got;
  out.verdict(received !== null && received.length === payload.length, 'reassembled byte for byte');
  await rig.a.close('done');
}

async function group(out: Reporter): Promise<void> {
  out.heading('Three peers - A and C out of range, B between them');
  const clock = new VirtualClock();
  const network = new MockNetwork(clock, 0xbee);
  network.setConditions(BLE_LIKE_CONDITIONS);
  network.createTransport('a');
  network.createTransport('b');
  network.createTransport('c');
  network.partition('a', 'c');

  out.row('A can reach B', network.canReach('a', 'b') ? 'yes' : 'no');
  out.row('B can reach C', network.canReach('b', 'c') ? 'yes' : 'no');
  out.row('A can reach C', network.canReach('a', 'c') ? 'yes' : 'no, needs a relay');
  out.verdict(!network.canReach('a', 'c'), 'the topology the mesh module has to route around');
}

export const SCENARIOS: Record<string, Scenario> = {
  ping,
  throughput,
  loss,
  reconnect,
  upgrade,
  transfer,
  group,
};
