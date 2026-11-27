import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SLIDE_UPLOAD_FIELDS, TEMPLATE_UPLOAD_FIELDS, templateFileUrl } from '@menouchat/shared';

import type { AppRouter } from '../api/router.ts';
import { createTestApp, TEST_TOKEN, type TestApp } from '../testing/test-app.ts';

let app: TestApp;
let baseUrl: string;

beforeEach(async () => {
  app = await createTestApp();
  baseUrl = await app.server.listen({ host: '127.0.0.1', port: 0 });
});

afterEach(async () => {
  await app.dispose();
});

function client(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${baseUrl}/trpc`,
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
      }),
    ],
  });
}

const local = () => client(TEST_TOKEN);

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCClientError) {
      return (error.data as { code?: string } | undefined)?.code;
    }
    throw error;
  }
  return undefined;
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const DESIGN = {
  texts: [
    {
      id: 'title',
      text: 'מזל טוב',
      x: 100,
      y: 80,
      width: 1500,
      fontSize: 120,
      font: 'frank-ruhl-libre',
      color: '#9b1b1b',
      bold: true,
      align: 'center',
    },
  ],
};

/** A template save from the editor: a PNG background, the rendered JPEG and the design. */
function templateForm(
  fields: { id?: string; name?: string; design?: string; background?: File } = {},
): FormData {
  const form = new FormData();
  if (fields.id !== undefined) {
    form.set(TEMPLATE_UPLOAD_FIELDS.id, fields.id);
  }
  form.set(TEMPLATE_UPLOAD_FIELDS.name, fields.name ?? 'מזל טוב');
  form.set(TEMPLATE_UPLOAD_FIELDS.design, fields.design ?? JSON.stringify(DESIGN));
  form.set(
    TEMPLATE_UPLOAD_FIELDS.background,
    fields.background ?? new File([PNG], 'background.png', { type: 'image/png' }),
  );
  form.set(TEMPLATE_UPLOAD_FIELDS.image, new File([JPEG], 'page-1.jpg', { type: 'image/jpeg' }));
  return form;
}

function uploadForm(
  slot: number | string = 2,
  image: Uint8Array = JPEG,
  imageType = 'image/jpeg',
): FormData {
  const form = new FormData();
  form.set(SLIDE_UPLOAD_FIELDS.slot, String(slot));
  form.set(SLIDE_UPLOAD_FIELDS.title, 'halacha.pdf');
  form.set(
    SLIDE_UPLOAD_FIELDS.original,
    new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'halacha.pdf', {
      type: 'application/pdf',
    }),
  );
  form.set(SLIDE_UPLOAD_FIELDS.image, new File([image], 'page-1.jpg', { type: imageType }));
  return form;
}

describe('admin access', () => {
  it("lets any device on the network edit, without a PIN (owner's decision)", async () => {
    const phone = client();
    const { schedule } = await phone.admin.state.query();
    await phone.admin.updateSchedule.mutate({
      ...schedule,
      weekday: [...schedule.weekday, { id: 'late', name: 'ערבית ב׳', time: '20:30' }],
    });
    const { schedule: saved } = await local().admin.state.query();
    expect(saved.weekday.at(-1)).toEqual({ id: 'late', name: 'ערבית ב׳', time: '20:30' });
  });

  it('shows the full address to type on a phone', async () => {
    await expect(local().admin.state.query()).resolves.toMatchObject({
      phoneUrls: ['http://192.168.1.10:3741/admin'],
    });
  });
});

describe('desktop actions', () => {
  it("lets only the app's own windows open the admin on the PC", async () => {
    await expect(errorCode(client().desktop.showAdmin.mutate())).resolves.toBe('FORBIDDEN');
    await local().desktop.showAdmin.mutate();
    expect(app.desktopCalls).toEqual(['showAdmin']);
  });

  it('shows a ready update in the admin and installs it on request', async () => {
    await expect(local().admin.state.query()).resolves.toMatchObject({
      update: { status: 'ready', version: '2.0.1' },
    });
    await local().admin.installUpdate.mutate();
    expect(app.desktopCalls).toEqual(['installUpdate']);
  });

  it('checks for an update on request, from a phone too', async () => {
    await expect(client().admin.checkForUpdate.mutate()).resolves.toEqual({ result: 'upToDate' });
    expect(app.desktopCalls).toEqual(['checkForUpdate']);
  });
});

describe('editing', () => {
  it('switches a kind of day event off and on', async () => {
    await expect(local().admin.state.query()).resolves.toMatchObject({
      events: { roshChodesh: true, holiday: true, chanukah: true, omer: true },
    });
    await client().admin.setDayEventEnabled.mutate({ kind: 'omer', enabled: false });
    await expect(local().admin.state.query()).resolves.toMatchObject({
      events: { roshChodesh: true, omer: false },
    });
    await expect(app.store.settings.read()).resolves.toMatchObject({ events: { omer: false } });
  });

  it('saves the schedule and the display follows', async () => {
    const { schedule } = await local().admin.state.query();
    // Reordered, one removed, one renamed and retimed.
    const [shacharit, mincha] = schedule.weekday;
    if (shacharit === undefined || mincha === undefined) {
      throw new Error('Expected the default weekday prayers');
    }
    const weekday = [{ ...mincha, name: 'מנחה גדולה', time: '13:15' }, shacharit];
    await local().admin.updateSchedule.mutate({ ...schedule, weekday });
    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.schedule.weekday).toEqual(weekday);
  });

  it.each([
    ['an empty name', [{ id: 'a', name: '  ', time: '07:00' }]],
    [
      'a repeated id',
      [
        { id: 'a', name: 'שחרית', time: '07:00' },
        { id: 'a', name: 'מנחה', time: '13:00' },
      ],
    ],
    [
      'too many prayers',
      Array.from({ length: 7 }, (_, index) => ({
        id: `p${String(index)}`,
        name: 'תפילה',
        time: '07:00',
      })),
    ],
  ])('rejects %s', async (_case, weekday) => {
    const { schedule } = await local().admin.state.query();
    await expect(
      errorCode(local().admin.updateSchedule.mutate({ ...schedule, weekday })),
    ).resolves.toBe('BAD_REQUEST');
  });

  it('rejects invalid times', async () => {
    const { schedule } = await local().admin.state.query();
    await expect(
      errorCode(
        local().admin.updateSchedule.mutate({
          ...schedule,
          weekday: [{ id: 'bad', name: 'מנחה', time: '25:00' }],
        }),
      ),
    ).resolves.toBe('BAD_REQUEST');
  });

  it('sets the seconds per slide, from 3 to 300', async () => {
    await local().admin.slides.setInterval.mutate({ slideIntervalSec: 15 });
    await expect(local().admin.state.query()).resolves.toMatchObject({ slideIntervalSec: 15 });
    await expect(client().display.state.query({ displayId: 'main' })).resolves.toMatchObject({
      slideshow: { intervalSec: 15 },
    });
    await expect(
      errorCode(local().admin.slides.setInterval.mutate({ slideIntervalSec: 2 })),
    ).resolves.toBe('BAD_REQUEST');
  });
});

describe('theme', () => {
  it('switches the main display to another layout, which the display follows', async () => {
    await expect(local().admin.state.query()).resolves.toMatchObject({
      layoutId: 'classic-portrait',
    });
    await local().admin.setLayout.mutate({ layoutId: 'blue-gold' });
    await expect(local().admin.state.query()).resolves.toMatchObject({ layoutId: 'blue-gold' });
    await expect(client().display.state.query({ displayId: 'main' })).resolves.toMatchObject({
      layoutId: 'blue-gold',
      layoutOptions: {},
    });
  });

  it('refuses a layout that does not exist', async () => {
    await expect(
      errorCode(local().admin.setLayout.mutate({ layoutId: 'neon' as 'blue-gold' })),
    ).resolves.toBe('BAD_REQUEST');
  });
});

describe('slides', () => {
  it('stores a picture in its slot with the original file, then serves it', async () => {
    const slide = await local().admin.slides.upload.mutate(uploadForm(2));
    expect(slide).toMatchObject({
      slot: 2,
      title: 'halacha.pdf',
      originalFile: 'original.pdf',
      image: 'page-1.jpg',
      enabled: true,
    });
    const folder = join(app.slidesRoot, slide.id);
    await expect(readFile(join(folder, 'original.pdf'))).resolves.toEqual(Buffer.from('%PDF'));
    const page = await fetch(`${baseUrl}/slides/${slide.id}/page-1.jpg`);
    expect(page.status).toBe(200);
  });

  it('replaces what a slot held, keeping whether it was shown', async () => {
    const first = await local().admin.slides.upload.mutate(uploadForm(2));
    await local().admin.slides.setEnabled.mutate({ slot: 2, enabled: false });
    const second = await local().admin.slides.upload.mutate(uploadForm(2));

    await expect(access(join(app.slidesRoot, first.id))).rejects.toThrow();
    const { slides } = await local().admin.state.query();
    expect(slides).toEqual([expect.objectContaining({ id: second.id, slot: 2, enabled: false })]);
  });

  it('shows the enabled slots on the display in slot order', async () => {
    const third = await local().admin.slides.upload.mutate(uploadForm(3));
    const first = await local().admin.slides.upload.mutate(uploadForm(1));
    await local().admin.slides.upload.mutate(uploadForm(4));
    await local().admin.slides.setEnabled.mutate({ slot: 4, enabled: false });

    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.slideshow.pages.map((p) => p.url)).toEqual([
      `/slides/${first.id}/page-1.jpg`,
      `/slides/${third.id}/page-1.jpg`,
    ]);
  });

  it('refuses images that are not JPEG, unknown slots, and leaves nothing behind', async () => {
    await expect(
      errorCode(local().admin.slides.upload.mutate(uploadForm(2, JPEG, 'image/png'))),
    ).resolves.toBe('BAD_REQUEST');
    await expect(
      errorCode(local().admin.slides.upload.mutate(uploadForm(2, new Uint8Array([1, 2, 3])))),
    ).resolves.toBe('BAD_REQUEST');
    await expect(errorCode(local().admin.slides.upload.mutate(uploadForm(5)))).resolves.toBe(
      'BAD_REQUEST',
    );
    await expect(local().admin.state.query()).resolves.toMatchObject({ slides: [] });
  });

  it('cannot show an empty slot', async () => {
    await expect(
      errorCode(local().admin.slides.setEnabled.mutate({ slot: 1, enabled: true })),
    ).resolves.toBe('NOT_FOUND');
  });
});

/** Reads a server-sent event stream until `done` accepts what has arrived. */
async function readStream(
  path: string,
  done: (text: string) => boolean,
  onOpen?: () => Promise<void>,
) {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
  const reader: ReadableStreamDefaultReader<Uint8Array> | undefined = response.body?.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let opened = false;
  while (reader !== undefined && !done(text)) {
    const { value, done: ended } = await reader.read();
    if (ended) break;
    text += decoder.decode(value);
    if (!opened && onOpen !== undefined && text.includes('data:')) {
      opened = true;
      await onOpen();
    }
  }
  controller.abort();
  return text;
}

// Node has no EventSource (Electron and browsers do), so the stream is read with fetch,
// passing the token as the subscription link does: a `connectionParams` query parameter.
const adminStreamPath = (connectionParams?: Record<string, string>) =>
  `/trpc/admin.onState${
    connectionParams === undefined
      ? ''
      : `?connectionParams=${encodeURIComponent(JSON.stringify(connectionParams))}`
  }`;

describe('admin state stream', () => {
  it('pushes the state to local windows over server-sent events, then every change', async () => {
    const text = await readStream(
      adminStreamPath({ token: TEST_TOKEN }),
      (received) => received.includes('20:30'),
      async () => {
        const { schedule } = await local().admin.state.query();
        await local().admin.updateSchedule.mutate({
          ...schedule,
          weekday: [...schedule.weekday, { id: 'late', name: 'ערבית ב׳', time: '20:30' }],
        });
      },
    );
    expect(text).toContain('"time":"20:10"');
    expect(text).toContain('"time":"20:30"');
  });
});

describe('templates', () => {
  it('keeps a template with its design, and serves its picture', async () => {
    const template = await local().admin.templates.save.mutate(templateForm());
    expect(template).toMatchObject({
      name: 'מזל טוב',
      design: DESIGN,
      background: 'background.png',
    });
    await expect(local().admin.state.query()).resolves.toMatchObject({ templates: [template] });
    const page = await fetch(`${baseUrl}${templateFileUrl(template, template.image)}`);
    expect(page.status).toBe(200);
  });

  it('shows a template in a slot, and the slot follows when the template is edited', async () => {
    const template = await local().admin.templates.save.mutate(templateForm());
    const shown = await local().admin.slides.useTemplate.mutate({
      slot: 2,
      templateId: template.id,
    });
    expect(shown).toMatchObject({ slot: 2, title: 'מזל טוב', templateId: template.id });

    const edited = await local().admin.templates.save.mutate(
      templateForm({ id: template.id, name: 'שבת שלום' }),
    );
    expect(edited.revision).not.toBe(template.revision);
    const { slides } = await local().admin.state.query();
    expect(slides).toEqual([
      expect.objectContaining({ slot: 2, title: 'שבת שלום', templateId: template.id }),
    ]);
    expect(slides[0]?.id).not.toBe(shown.id);
    await expect(access(join(app.slidesRoot, shown.id))).rejects.toThrow();
    await expect(
      access(join(app.slidesRoot, 'templates', template.id, template.revision)),
    ).rejects.toThrow();
  });

  it('duplicates a template under a new name', async () => {
    const template = await local().admin.templates.save.mutate(templateForm());
    const copy = await local().admin.templates.duplicate.mutate({ templateId: template.id });
    expect(copy).toMatchObject({ name: 'מזל טוב (עותק)', design: DESIGN });
    expect(copy.id).not.toBe(template.id);
    const { templates } = await local().admin.state.query();
    expect(templates.map((other) => other.id)).toEqual([copy.id, template.id]);
  });

  it('deletes a template; a slot showing it keeps its picture', async () => {
    const template = await local().admin.templates.save.mutate(templateForm());
    const shown = await local().admin.slides.useTemplate.mutate({
      slot: 1,
      templateId: template.id,
    });
    await local().admin.templates.remove.mutate({ templateId: template.id });
    const { templates, slides } = await local().admin.state.query();
    expect(templates).toEqual([]);
    expect(slides).toEqual([expect.objectContaining({ id: shown.id, slot: 1 })]);
    expect(slides[0]?.templateId).toBeUndefined();
    await expect(access(join(app.slidesRoot, 'templates', template.id))).rejects.toThrow();
  });

  it('refuses an invalid design, a PDF background or an unknown template', async () => {
    await expect(
      errorCode(local().admin.templates.save.mutate(templateForm({ design: 'not json' }))),
    ).resolves.toBe('BAD_REQUEST');
    await expect(
      errorCode(
        local().admin.templates.save.mutate(
          templateForm({ background: new File([PNG], 'b.pdf', { type: 'application/pdf' }) }),
        ),
      ),
    ).resolves.toBe('BAD_REQUEST');
    const unknown = '00000000-0000-4000-8000-000000000000';
    await expect(
      errorCode(local().admin.templates.save.mutate(templateForm({ id: unknown }))),
    ).resolves.toBe('NOT_FOUND');
    await expect(
      errorCode(local().admin.slides.useTemplate.mutate({ slot: 1, templateId: unknown })),
    ).resolves.toBe('NOT_FOUND');
    await expect(local().admin.state.query()).resolves.toMatchObject({ templates: [], slides: [] });
  });
});
