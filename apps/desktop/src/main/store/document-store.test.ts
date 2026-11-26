import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createDocumentStore, type DocumentDefinition } from './document-store.ts';

// A test document at version 3, so that migrations can be exercised: v1 stored `name`,
// v2 renamed it to `title`, v3 added `count`.
const testSchema = z.object({
  schemaVersion: z.literal(3),
  title: z.string(),
  count: z.number().int(),
});
type TestDocument = z.infer<typeof testSchema>;

const definition: DocumentDefinition<TestDocument> = {
  fileName: 'test.json',
  schema: testSchema,
  currentVersion: 3,
  migrations: {
    1: ({ name, ...rest }) => ({ ...rest, title: name }),
    2: (document) => ({ ...document, count: 0 }),
  },
  createDefault: () => ({ schemaVersion: 3, title: 'default', count: 0 }),
};

let directory: string;
const logger = { info: vi.fn(), warn: vi.fn() };

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'menouchat-store-'));
  logger.info.mockClear();
  logger.warn.mockClear();
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const store = () => createDocumentStore(directory, definition, logger);
const filePath = (suffix = '') => join(directory, `test.json${suffix}`);
const readJson = async (suffix = ''): Promise<unknown> =>
  JSON.parse(await readFile(filePath(suffix), 'utf8'));
const document = (title: string, count = 1): TestDocument => ({ schemaVersion: 3, title, count });

describe('document store', () => {
  it('returns the defaults on first launch, without warning, saying so once', async () => {
    const shared = store();
    await expect(shared.read()).resolves.toEqual(definition.createDefault());
    await shared.read();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledExactlyOnceWith('Using default test.json');
  });

  it('round-trips a document and creates the directory', async () => {
    const nested = createDocumentStore(join(directory, 'data'), definition, logger);
    await nested.write(document('first'));
    await expect(nested.read()).resolves.toEqual(document('first'));
  });

  it('keeps the previous version as a backup and leaves no temporary file', async () => {
    await store().write(document('first'));
    await store().write(document('second'));
    await expect(readJson()).resolves.toEqual(document('second'));
    await expect(readJson('.bak')).resolves.toEqual(document('first'));
    expect((await readdir(directory)).sort()).toEqual(['test.json', 'test.json.bak']);
  });

  it('refuses to write an invalid document and leaves the file untouched', async () => {
    await store().write(document('first'));
    await expect(store().write({ ...document('bad'), count: 1.5 })).rejects.toThrow();
    await expect(readJson()).resolves.toEqual(document('first'));
  });

  it.each([
    ['invalid JSON', '{"schemaVersion": 3, "title": '],
    ['a schema violation', JSON.stringify({ schemaVersion: 3, title: 42, count: 0 })],
    ['no schemaVersion', JSON.stringify({ title: 'x', count: 0 })],
    ['a newer schemaVersion', JSON.stringify({ schemaVersion: 4, title: 'x', count: 0 })],
  ])('falls back to the backup when the file holds %s', async (_case, content) => {
    await writeFile(filePath(), content);
    await writeFile(filePath('.bak'), JSON.stringify(document('backup')));
    await expect(store().read()).resolves.toEqual(document('backup'));
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the defaults when the file and its backup are unreadable', async () => {
    await writeFile(filePath(), 'not json');
    await writeFile(filePath('.bak'), 'not json either');
    await expect(store().read()).resolves.toEqual(definition.createDefault());
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('sets a corrupt file aside on write instead of overwriting the good backup', async () => {
    await writeFile(filePath(), 'corrupt');
    await writeFile(filePath('.bak'), JSON.stringify(document('backup')));
    await store().write(document('new'));
    await expect(readJson()).resolves.toEqual(document('new'));
    await expect(readJson('.bak')).resolves.toEqual(document('backup'));
    await expect(readFile(filePath('.invalid'), 'utf8')).resolves.toBe('corrupt');
  });

  it('migrates older documents step by step', async () => {
    await writeFile(filePath(), JSON.stringify({ schemaVersion: 1, name: 'old' }));
    await expect(store().read()).resolves.toEqual({ schemaVersion: 3, title: 'old', count: 0 });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('treats a version without a migration as unreadable', async () => {
    await writeFile(filePath(), JSON.stringify({ schemaVersion: 1, name: 'old' }));
    const withoutMigrations = createDocumentStore(
      directory,
      { ...definition, migrations: {} },
      logger,
    );
    await expect(withoutMigrations.read()).resolves.toEqual(definition.createDefault());
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No migration from schemaVersion 1'),
    );
  });

  it('serialises concurrent writes so the last one wins', async () => {
    const shared = store();
    await Promise.all(['a', 'b', 'c', 'd'].map((title) => shared.write(document(title))));
    await expect(readJson()).resolves.toEqual(document('d'));
    await expect(readJson('.bak')).resolves.toEqual(document('c'));
  });

  it('keeps accepting writes after one fails', async () => {
    const shared = store();
    await expect(shared.write({ ...document('bad'), count: 0.5 })).rejects.toThrow();
    await shared.write(document('good'));
    await expect(readJson()).resolves.toEqual(document('good'));
  });

  it('ignores a temporary file left by an interrupted write', async () => {
    await store().write(document('saved'));
    await writeFile(filePath('.tmp'), '{"half":');
    await expect(store().read()).resolves.toEqual(document('saved'));
  });
});
