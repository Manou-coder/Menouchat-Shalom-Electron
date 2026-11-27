import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import type { SlideUpload } from '../api/slide-upload.ts';
import { AdminError } from '../api/errors.ts';

export const ORIGINAL_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export async function readJpeg(file: File): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!JPEG_SIGNATURE.every((byte, index) => bytes[index] === byte)) {
    throw new AdminError('BAD_REQUEST', 'The slide image is not a JPEG');
  }
  return bytes;
}

/**
 * Writes an uploaded slide to `slides/<id>/`: the original as `original.<ext>` and the
 * screen image as `page-1.jpg`. Files go to a temporary folder renamed at the end, so a
 * failed upload never leaves a half-written slide behind.
 */
export async function saveSlideFiles(
  slidesRoot: string,
  slideId: string,
  upload: SlideUpload,
): Promise<{ originalFile: string; image: string }> {
  const finalDirectory = join(slidesRoot, slideId);
  const temporaryDirectory = `${finalDirectory}.incomplete`;
  const extension =
    ORIGINAL_EXTENSIONS[upload.original.type] ?? extname(upload.original.name).toLowerCase();
  const originalFile = `original${extension}`;
  const image = 'page-1.jpg';

  await mkdir(temporaryDirectory, { recursive: true });
  try {
    await writeFile(
      join(temporaryDirectory, originalFile),
      new Uint8Array(await upload.original.arrayBuffer()),
    );
    await writeFile(join(temporaryDirectory, image), await readJpeg(upload.image));
    await rename(temporaryDirectory, finalDirectory);
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
  return { originalFile, image };
}

export async function removeSlideFiles(slidesRoot: string, slideId: string): Promise<void> {
  await rm(join(slidesRoot, slideId), { recursive: true, force: true });
}
