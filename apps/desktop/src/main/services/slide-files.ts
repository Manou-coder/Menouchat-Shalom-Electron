import { cp, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import type { LibraryItem } from '@menouchat/shared';

import { AdminError } from '../api/errors.ts';
import type { SlideUpload } from '../api/slide-upload.ts';
import type { TemplateUpload } from '../api/template-upload.ts';

const ORIGINAL_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const IMAGE = 'page-1.jpg';
const LIBRARY_FOLDER = 'library';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

async function readJpeg(file: File): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!JPEG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new AdminError('BAD_REQUEST', 'The slide image is not a JPEG');
  }
  return bytes;
}

function extensionOf(file: File): string {
  return ORIGINAL_EXTENSIONS[file.type] ?? extname(file.name).toLowerCase();
}

/** Where a new library item's files go: one folder per item, or per saved version. */
export function libraryFolder(itemId: string, revision?: string): string {
  return revision === undefined
    ? `${LIBRARY_FOLDER}/${itemId}`
    : `${LIBRARY_FOLDER}/${itemId}/${revision}`;
}

/**
 * Fills `slides/<folder>/` through a temporary folder renamed at the end, so a failure never
 * leaves half-written files where the screens or the admin read them.
 */
async function writeFolder(
  slidesRoot: string,
  folder: string,
  fill: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = join(slidesRoot, ...folder.split('/'));
  const temporary = `${directory}.incomplete`;
  await mkdir(temporary, { recursive: true });
  try {
    await fill(temporary);
    await rename(temporary, directory);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

/** Writes an uploaded file: the original as `original.<ext>`, the screen image as JPEG. */
export async function saveUploadedFiles(
  slidesRoot: string,
  folder: string,
  upload: SlideUpload,
): Promise<{ original: string; image: string }> {
  const original = `original${extensionOf(upload.original)}`;
  const jpeg = await readJpeg(upload.image);
  await writeFolder(slidesRoot, folder, async (directory) => {
    await writeFile(join(directory, original), new Uint8Array(await upload.original.arrayBuffer()));
    await writeFile(join(directory, IMAGE), jpeg);
  });
  return { original, image: IMAGE };
}

/** Writes one saved version of a template: its background and its rendered JPEG. */
export async function saveTemplateFiles(
  slidesRoot: string,
  folder: string,
  upload: TemplateUpload,
): Promise<{ background: string; image: string }> {
  const background = `background${extensionOf(upload.background)}`;
  const jpeg = await readJpeg(upload.image);
  await writeFolder(slidesRoot, folder, async (directory) => {
    await writeFile(
      join(directory, background),
      new Uint8Array(await upload.background.arrayBuffer()),
    );
    await writeFile(join(directory, IMAGE), jpeg);
  });
  return { background, image: IMAGE };
}

/** Copies an item's files to another folder, for a duplicate. */
export async function copyFolder(slidesRoot: string, from: string, to: string): Promise<void> {
  await writeFolder(slidesRoot, to, async (directory) => {
    await cp(join(slidesRoot, ...from.split('/')), directory, { recursive: true });
  });
}

export async function removeFolder(slidesRoot: string, folder: string): Promise<void> {
  await rm(join(slidesRoot, ...folder.split('/')), { recursive: true, force: true });
}

/** Removes every file of an item: for a template, all its saved versions. */
export async function removeItemFiles(slidesRoot: string, item: LibraryItem): Promise<void> {
  const [first, id] = item.folder.split('/');
  await removeFolder(
    slidesRoot,
    first === LIBRARY_FOLDER && id !== undefined ? `${LIBRARY_FOLDER}/${id}` : item.folder,
  );
}

/** The room an item's files take on disk; 0 if they are missing. */
export async function folderSize(slidesRoot: string, folder: string): Promise<number> {
  const directory = join(slidesRoot, ...folder.split('/'));
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const sizes = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => (await stat(join(directory, entry.name))).size),
    );
    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
}
