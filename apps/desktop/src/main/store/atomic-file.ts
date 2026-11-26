import { open, readFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Reads a UTF-8 file, or returns `null` when it does not exist. */
export async function readTextFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

/** Moves `from` to `to`, replacing it; returns `false` when `from` does not exist. */
export async function moveIfExists(from: string, to: string): Promise<boolean> {
  try {
    await rename(from, to);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Writes `content` to a temporary file next to `path` and flushes it to disk, so that a
 * crash or power cut never leaves a half-written file at `path`. Returns the temporary path,
 * which the caller renames into place.
 */
export async function writeDurableTempFile(path: string, content: string): Promise<string> {
  const tempPath = `${path}.tmp`;
  const handle = await open(tempPath, 'w');
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  return tempPath;
}

/**
 * Flushes a directory entry change (rename) to disk. Windows cannot open directories for
 * this; NTFS journals renames itself.
 */
export async function syncDirectory(path: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  const handle = await open(dirname(path), 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
