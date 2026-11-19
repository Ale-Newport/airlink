/**
 * The live demo: the real AirLink protocol, running in a browser tab.
 *
 * These are the same scenarios `pnpm harness` prints and `tests/harness.test.ts`
 * asserts. `@airlink/core` is bundled unchanged - the code that does the
 * handshake, encryption, retransmission and transport migration on a phone.
 * Only the radio is simulated, on a virtual clock, so simulated minutes take
 * milliseconds and every run is exact.
 */
import { SCENARIOS, type Reporter } from '../../scripts/harness/scenarios.js';

const output = document.getElementById('terminal') as HTMLElement;
const status = document.getElementById('run-status') as HTMLElement;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-scenario]'));

function line(className: string, text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  output.appendChild(el);
  output.scrollTop = output.scrollHeight;
  return el;
}

function pageReporter(tally: { pass: number; fail: number }): Reporter {
  return {
    heading(title) {
      line('t-heading', title);
    },
    row(label, value) {
      const el = line('t-row', '');
      const l = document.createElement('span');
      l.className = 't-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.textContent = value;
      el.append(l, v);
    },
    verdict(ok, detail) {
      if (ok) tally.pass++;
      else tally.fail++;
      const el = line(ok ? 't-pass' : 't-fail', '');
      const badge = document.createElement('strong');
      badge.textContent = ok ? 'PASS' : 'FAIL';
      el.append(badge, ` ${detail}`);
    },
  };
}

/** Let the browser paint between scenarios, so the page never looks frozen. */
const nextFrame = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 16));

async function run(names: string[]): Promise<void> {
  for (const b of buttons) b.disabled = true;
  output.textContent = '';
  line('t-dim', '$ pnpm harness ' + (names.length > 1 ? 'all' : names[0]));
  const tally = { pass: 0, fail: 0 };
  const started = performance.now();
  try {
    for (const name of names) {
      const scenario = SCENARIOS[name];
      if (!scenario) continue;
      status.textContent = `Running ${name}…`;
      await nextFrame();
      await scenario(pageReporter(tally));
    }
    const ms = Math.round(performance.now() - started);
    status.textContent =
      tally.fail === 0
        ? `${tally.pass} checks passed in ${ms} ms of real time.`
        : `${tally.fail} of ${tally.pass + tally.fail} checks failed.`;
  } catch (error) {
    line('t-fail', String(error));
    status.textContent = 'The run stopped with an error.';
  } finally {
    for (const b of buttons) b.disabled = false;
  }
}

for (const button of buttons) {
  button.addEventListener('click', () => {
    const name = button.dataset.scenario as string;
    void run(name === 'all' ? Object.keys(SCENARIOS) : [name]);
  });
}
