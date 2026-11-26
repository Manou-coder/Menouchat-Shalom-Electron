import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { nextVersion } from './next-version.ts';

describe('nextVersion', () => {
  it('starts v2 at the version in package.json, after the v1 tags', () => {
    expect(nextVersion('v1.1.11', '2.0.0')).toBe('2.0.0');
  });

  it('then bumps the patch on every release, as v1 did', () => {
    expect(nextVersion('v2.0.0', '2.0.0')).toBe('2.0.1');
    expect(nextVersion('v2.0.7', '2.0.0')).toBe('2.0.8');
  });

  it('follows a minor or major bump made by hand in package.json', () => {
    expect(nextVersion('v2.0.7', '2.1.0')).toBe('2.1.0');
  });

  it('uses package.json when there is no tag yet', () => {
    expect(nextVersion('', '2.0.0')).toBe('2.0.0');
  });

  it('rejects anything that is not a plain version', () => {
    expect(() => nextVersion('v2.0', '2.0.0')).toThrow('Not a version');
    expect(() => nextVersion('v2.0.0', '2.0.0-beta.1')).toThrow('Not a version');
  });

  it('runs as the script the release workflow calls', () => {
    const script = fileURLToPath(new URL('next-version.ts', import.meta.url));
    expect(execFileSync(process.execPath, [script, 'v2.0.3', '2.0.0'], { encoding: 'utf8' })).toBe(
      '2.0.4\n',
    );
  });
});
