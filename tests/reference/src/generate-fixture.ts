// Usage: node src/generate-fixture.ts [--check]
// Without --check, (re)writes the fixture; with it, fails if the committed fixture differs
// from what v1 produces, which catches hand edits and library drift.
import './set-time-zone.ts';

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildFixture } from './build-fixture.ts';

const FIXTURE_PATH = fileURLToPath(new URL('../../fixtures/v1-reference.json', import.meta.url));

const expected = `${JSON.stringify(buildFixture(), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const committed = await readFile(FIXTURE_PATH, 'utf8');
  if (committed !== expected) {
    process.stderr.write(
      `${FIXTURE_PATH} does not match v1's output. Regenerate it with \`pnpm --filter @menouchat/reference-tests generate\` and review the diff.\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`${FIXTURE_PATH} matches v1's output.\n`);
} else {
  await writeFile(FIXTURE_PATH, expected);
  process.stdout.write(`Wrote ${FIXTURE_PATH}.\n`);
}
