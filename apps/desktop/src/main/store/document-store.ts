import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import {
  moveIfExists,
  readTextFileIfExists,
  syncDirectory,
  writeDurableTempFile,
} from './atomic-file.ts';

export interface StoreLogger {
  info(message: string): void;
  warn(message: string): void;
}

type JsonObject = Record<string, unknown>;

/** Upgrades a document from one schema version to the next. */
export type Migration = (document: JsonObject) => JsonObject;

export interface DocumentDefinition<T extends { schemaVersion: number }> {
  fileName: string;
  schema: z.ZodType<T>;
  currentVersion: T['schemaVersion'];
  /** `migrations[n]` turns a version-`n` document into a version-`n + 1` one. */
  migrations: Readonly<Partial<Record<number, Migration>>>;
  createDefault: () => T;
}

export interface DocumentStore<T> {
  /** The stored document, else its backup, else the defaults; every fallback is logged. */
  read(): Promise<T>;
  /** Validates and durably replaces the document, keeping the previous one as `.bak`. */
  write(value: T): Promise<void>;
}

const versionedDocumentSchema = z.looseObject({ schemaVersion: z.number().int().positive() });

class UnreadableDocumentError extends Error {
  override readonly name = 'UnreadableDocumentError';
}

export function createDocumentStore<T extends { schemaVersion: number }>(
  directory: string,
  definition: DocumentDefinition<T>,
  logger: StoreLogger,
): DocumentStore<T> {
  const path = join(directory, definition.fileName);
  const backupPath = `${path}.bak`;
  const invalidPath = `${path}.invalid`;
  // Writes run one at a time so that two quick saves never interleave their renames.
  let pendingWrite: Promise<void> = Promise.resolve();
  // Every display snapshot reads the store: say once that defaults are in use, not each time.
  let defaultsLogged = false;

  function parse(text: string): T {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new UnreadableDocumentError('Invalid JSON', { cause: error });
    }
    const versioned = versionedDocumentSchema.safeParse(json);
    if (!versioned.success) {
      throw new UnreadableDocumentError('Missing or invalid schemaVersion');
    }
    const migrated = migrate(versioned.data, definition);
    const result = definition.schema.safeParse(migrated);
    if (!result.success) {
      throw new UnreadableDocumentError(z.prettifyError(result.error));
    }
    return result.data;
  }

  /** `undefined` when the file does not exist; throws when it exists but is unusable. */
  async function load(filePath: string): Promise<T | undefined> {
    const text = await readTextFileIfExists(filePath);
    return text === null ? undefined : parse(text);
  }

  async function tryLoad(filePath: string): Promise<T | undefined> {
    try {
      return await load(filePath);
    } catch (error) {
      logger.warn(`Ignoring unreadable ${filePath}: ${describe(error)}`);
      return undefined;
    }
  }

  async function read(): Promise<T> {
    const current = await tryLoad(path);
    if (current !== undefined) {
      return current;
    }
    const backup = await tryLoad(backupPath);
    if (backup !== undefined) {
      logger.warn(`Using backup ${backupPath}`);
      return backup;
    }
    if (!defaultsLogged) {
      logger.info(`Using default ${definition.fileName}`);
      defaultsLogged = true;
    }
    return definition.createDefault();
  }

  async function replace(value: T): Promise<void> {
    const content = `${JSON.stringify(definition.schema.parse(value), null, 2)}\n`;
    await mkdir(directory, { recursive: true });
    const tempPath = await writeDurableTempFile(path, content);

    // A corrupt current file must not become the backup and destroy the good one: it is
    // set aside instead, so that only a valid document is ever rotated.
    try {
      await load(path);
    } catch (error) {
      logger.warn(`Moving unreadable ${path} to ${invalidPath}: ${describe(error)}`);
      await moveIfExists(path, invalidPath);
    }
    await moveIfExists(path, backupPath);
    // Between these renames a crash leaves no current file; read() then uses the backup.
    await moveIfExists(tempPath, path);
    await syncDirectory(path);
  }

  return {
    read,
    write(value) {
      const result = pendingWrite.then(() => replace(value));
      pendingWrite = result.catch(() => undefined);
      return result;
    },
  };
}

function migrate<T extends { schemaVersion: number }>(
  document: JsonObject & { schemaVersion: number },
  definition: DocumentDefinition<T>,
): JsonObject {
  if (document.schemaVersion > definition.currentVersion) {
    throw new UnreadableDocumentError(
      `schemaVersion ${String(document.schemaVersion)} is newer than this app supports (${String(definition.currentVersion)})`,
    );
  }
  let migrated: JsonObject = document;
  for (let version = document.schemaVersion; version < definition.currentVersion; version++) {
    const step = definition.migrations[version];
    if (step === undefined) {
      throw new UnreadableDocumentError(`No migration from schemaVersion ${String(version)}`);
    }
    migrated = { ...step(migrated), schemaVersion: version + 1 };
  }
  return migrated;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
