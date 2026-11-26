import { readFileSync } from 'node:fs';

import { referenceFixtureSchema, type ReferenceFixture } from './fixture-schema.ts';

const FIXTURE_URL = new URL('../../fixtures/v1-reference.json', import.meta.url);

/** Reads and validates `tests/fixtures/v1-reference.json`. */
export function loadReferenceFixture(): ReferenceFixture {
  return referenceFixtureSchema.parse(JSON.parse(readFileSync(FIXTURE_URL, 'utf8')));
}
