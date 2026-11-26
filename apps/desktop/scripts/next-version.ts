// Usage: node scripts/next-version.ts <latest v* tag, or ""> <version in package.json>
// Prints the version of the next release (plan step 9): every push to main releases, as
// in v1, by bumping the patch of the latest tag, unless package.json already names a
// newer version (2.0.0 for the first v2 release, or a hand-made minor/major bump).

type Version = readonly [number, number, number];

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

function parse(text: string): Version {
  const match = VERSION_PATTERN.exec(text.trim());
  if (match === null) {
    throw new Error(`Not a version: "${text}"`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

export function nextVersion(latestTag: string, packageVersion: string): string {
  const wanted = parse(packageVersion);
  if (latestTag.trim() === '') {
    return wanted.join('.');
  }
  const latest = parse(latestTag);
  if (compare(wanted, latest) > 0) {
    return wanted.join('.');
  }
  return [latest[0], latest[1], latest[2] + 1].join('.');
}

if (import.meta.main) {
  const [latestTag = '', packageVersion = ''] = process.argv.slice(2);
  process.stdout.write(`${nextVersion(latestTag, packageVersion)}\n`);
}
