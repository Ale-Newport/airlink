/**
 * The AirLink network harness, from the command line.
 *
 * Runs the real protocol between simulated devices and prints what happened.
 * Every number here comes from the same code that runs on a phone - the only
 * thing replaced is the radio.
 *
 *   pnpm harness [scenario]
 *
 * Scenarios: ping - throughput - loss - reconnect - upgrade - transfer - group - all
 *
 * Exits non-zero if any verdict fails, so it can gate a script or CI step.
 */
import { SCENARIOS, type Reporter } from './harness/scenarios.js';

const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

let failures = 0;

const terminal: Reporter = {
  heading(title) {
    console.log(`\n${BOLD}${title}${RESET}`);
    console.log('-'.repeat(Math.max(24, title.length)));
  },
  row(label, value) {
    console.log(`  ${label.padEnd(28)} ${value}`);
  },
  verdict(ok, detail) {
    if (!ok) failures++;
    console.log(`  ${ok ? GREEN + 'PASS' + RESET : RED + 'FAIL' + RESET}  ${detail}`);
  },
};

async function main(): Promise<void> {
  const requested = process.argv[2] ?? 'all';
  console.log(`${BOLD}AirLink network harness${RESET}`);
  console.log('The real protocol over a simulated radio. Nothing here touches a network.');

  const chosen = requested === 'all' ? Object.keys(SCENARIOS) : [requested];
  for (const name of chosen) {
    const scenario = SCENARIOS[name];
    if (!scenario) {
      console.error(`\nUnknown scenario "${name}". Try: ${Object.keys(SCENARIOS).join(', ')}, all`);
      process.exitCode = 1;
      return;
    }
    await scenario(terminal);
  }
  console.log('');
  if (failures > 0) process.exitCode = 1;
}

void main();
