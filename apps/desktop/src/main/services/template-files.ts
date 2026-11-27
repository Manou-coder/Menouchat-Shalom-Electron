import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { TEMPLATES_FOLDER, type Template } from '@menouchat/shared';

import type { TemplateUpload } from '../api/template-upload.ts';
import { ORIGINAL_EXTENSIONS, readJpeg } from './slide-files.ts';

const IMAGE = 'page-1.jpg';

function templateFolder(slidesRoot: string, templateId: string, revision?: string): string {
  const folder = join(slidesRoot, TEMPLATES_FOLDER, templateId);
  return revision === undefined ? folder : join(folder, revision);
}

/**
 * Fills a folder through a temporary one renamed at the end, so a failure never leaves
 * half-written files where the screens or the admin read them.
 */
async function writeFolder(folder: string, fill: (folder: string) => Promise<void>) {
  const temporary = `${folder}.incomplete`;
  await mkdir(temporary, { recursive: true });
  try {
    await fill(temporary);
    await rename(temporary, folder);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

/** Writes one saved version of a template: its background and its rendered JPEG. */
export async function saveTemplateFiles(
  slidesRoot: string,
  templateId: string,
  revision: string,
  upload: TemplateUpload,
): Promise<{ background: string; image: string }> {
  const background = `background${ORIGINAL_EXTENSIONS[upload.background.type] ?? extname(upload.background.name)}`;
  const jpeg = await readJpeg(upload.image);
  await writeFolder(templateFolder(slidesRoot, templateId, revision), async (folder) => {
    await writeFile(
      join(folder, background),
      new Uint8Array(await upload.background.arrayBuffer()),
    );
    await writeFile(join(folder, IMAGE), jpeg);
  });
  return { background, image: IMAGE };
}

/** Copies a template's current files to another template, for a duplicate. */
export async function copyTemplateFiles(
  slidesRoot: string,
  template: Template,
  copyId: string,
  copyRevision: string,
): Promise<void> {
  const source = templateFolder(slidesRoot, template.id, template.revision);
  await writeFolder(templateFolder(slidesRoot, copyId, copyRevision), async (folder) => {
    await copyFile(join(source, template.background), join(folder, template.background));
    await copyFile(join(source, template.image), join(folder, template.image));
  });
}

/**
 * Copies a template into `slides/<slideId>/` as an ordinary slide (the background as the
 * original), so the screens show it like any other picture.
 */
export async function copyTemplateToSlide(
  slidesRoot: string,
  template: Template,
  slideId: string,
): Promise<{ originalFile: string; image: string }> {
  const source = templateFolder(slidesRoot, template.id, template.revision);
  const originalFile = `original${extname(template.background)}`;
  await writeFolder(join(slidesRoot, slideId), async (folder) => {
    await copyFile(join(source, template.background), join(folder, originalFile));
    await copyFile(join(source, template.image), join(folder, IMAGE));
  });
  return { originalFile, image: IMAGE };
}

/** Removes one saved version of a template, or every version when none is given. */
export async function removeTemplateFiles(
  slidesRoot: string,
  templateId: string,
  revision?: string,
): Promise<void> {
  await rm(templateFolder(slidesRoot, templateId, revision), { recursive: true, force: true });
}
