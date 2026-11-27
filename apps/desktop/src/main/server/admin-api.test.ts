import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { libraryFileUrl, SLIDE_UPLOAD_FIELDS, TEMPLATE_UPLOAD_FIELDS } from '@menouchat/shared';

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
  slot: number | string | null = 2,
  image: Uint8Array = JPEG,
  imageType = 'image/jpeg',
): FormData {
  const form = new FormData();
  if (slot !== null) {
    form.set(SLIDE_UPLOAD_FIELDS.slot, String(slot));
  }
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
  it('keeps an uploaded file in the library, shows it in its slot, then serves it', async () => {
    const item = await local().admin.slides.upload.mutate(uploadForm(2));
    expect(item).toMatchObject({
      kind: 'file',
      name: 'halacha.pdf',
      original: 'original.pdf',
      image: 'page-1.jpg',
    });
    const folder = join(app.slidesRoot, ...item.folder.split('/'));
    await expect(readFile(join(folder, 'original.pdf'))).resolves.toEqual(Buffer.from('%PDF'));
    const page = await fetch(`${baseUrl}${libraryFileUrl(item, item.image)}`);
    expect(page.status).toBe(200);
    const state = await local().admin.state.query();
    expect(state.slots).toEqual([{ slot: 2, itemId: item.id, enabled: true }]);
    expect(state.library).toEqual([
      expect.objectContaining({ id: item.id, sizeBytes: 4 + JPEG.length }),
    ]);
  });

  it('keeps what a slot showed in the library when it gets a new picture', async () => {
    const first = await local().admin.slides.upload.mutate(uploadForm(2));
    await local().admin.slides.setEnabled.mutate({ slot: 2, enabled: false });
    const second = await local().admin.slides.upload.mutate(uploadForm(2));

    const { slots, library } = await local().admin.state.query();
    expect(slots).toEqual([{ slot: 2, itemId: second.id, enabled: false }]);
    expect(library.map((item) => item.id)).toEqual([second.id, first.id]);
    await local().admin.slides.show.mutate({ slot: 3, itemId: first.id });
    await expect(local().admin.state.query()).resolves.toMatchObject({
      slots: expect.arrayContaining([{ slot: 3, itemId: first.id, enabled: true }]) as unknown,
    });
  });

  it('uploads to the library alone when no slot is named', async () => {
    const item = await local().admin.slides.upload.mutate(uploadForm(null));
    await expect(local().admin.state.query()).resolves.toMatchObject({
      slots: [],
      library: [expect.objectContaining({ id: item.id })],
    });
  });

  it('shows the enabled slots on the display in slot order', async () => {
    const third = await local().admin.slides.upload.mutate(uploadForm(3));
    const first = await local().admin.slides.upload.mutate(uploadForm(1));
    await local().admin.slides.upload.mutate(uploadForm(4));
    await local().admin.slides.setEnabled.mutate({ slot: 4, enabled: false });

    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.slideshow.pages.map((p) => p.url)).toEqual([
      libraryFileUrl(first, first.image),
      libraryFileUrl(third, third.image),
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
    await expect(local().admin.state.query()).resolves.toMatchObject({ slots: [], library: [] });
  });

  it('cannot show an empty slot, or a picture that is not in the library', async () => {
    await expect(
      errorCode(local().admin.slides.setEnabled.mutate({ slot: 1, enabled: true })),
    ).resolves.toBe('NOT_FOUND');
    await expect(
      errorCode(
        local().admin.slides.show.mutate({
          slot: 1,
          itemId: '00000000-0000-4000-8000-000000000000',
        }),
      ),
    ).resolves.toBe('NOT_FOUND');
  });
});

describe('library', () => {
  it('renames an item', async () => {
    const item = await local().admin.slides.upload.mutate(uploadForm(null));
    await local().admin.library.rename.mutate({ itemId: item.id, name: 'הלכה יומית' });
    const { library } = await local().admin.state.query();
    expect(library[0]?.name).toBe('הלכה יומית');
  });

  it('deletes an item and its files, but never one a slot shows', async () => {
    const shown = await local().admin.slides.upload.mutate(uploadForm(1));
    const old = await local().admin.slides.upload.mutate(uploadForm(null));
    await expect(
      errorCode(local().admin.library.remove.mutate({ itemId: shown.id })),
    ).resolves.toBe('PRECONDITION_FAILED');
    await local().admin.library.remove.mutate({ itemId: old.id });
    const { library } = await local().admin.state.query();
    expect(library.map((item) => item.id)).toEqual([shown.id]);
    await expect(access(join(app.slidesRoot, ...old.folder.split('/')))).rejects.toThrow();
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
  it('keeps a template with its design in the library, and serves its picture', async () => {
    const template = await local().admin.library.saveTemplate.mutate(templateForm());
    expect(template).toMatchObject({
      kind: 'template',
      name: 'מזל טוב',
      design: DESIGN,
      background: 'background.png',
    });
    await expect(local().admin.state.query()).resolves.toMatchObject({
      library: [expect.objectContaining({ id: template.id })],
    });
    const page = await fetch(`${baseUrl}${libraryFileUrl(template, template.image)}`);
    expect(page.status).toBe(200);
  });

  it('shows a template in a slot, and the screens follow when the template is edited', async () => {
    const template = await local().admin.library.saveTemplate.mutate(templateForm());
    await local().admin.slides.show.mutate({ slot: 2, itemId: template.id });

    const edited = await local().admin.library.saveTemplate.mutate(
      templateForm({ id: template.id, name: 'שבת שלום' }),
    );
    expect(edited.folder).not.toBe(template.folder);
    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.slideshow.pages.map((page) => page.url)).toEqual([
      libraryFileUrl(edited, edited.image),
    ]);
    await expect(access(join(app.slidesRoot, ...template.folder.split('/')))).rejects.toThrow();
  });

  it('duplicates an item under a new name', async () => {
    const template = await local().admin.library.saveTemplate.mutate(templateForm());
    const copy = await local().admin.library.duplicate.mutate({ itemId: template.id });
    expect(copy).toMatchObject({ kind: 'template', name: 'מזל טוב (עותק)', design: DESIGN });
    const { library } = await local().admin.state.query();
    expect(library.map((item) => item.id)).toEqual([copy.id, template.id]);
    const page = await fetch(`${baseUrl}${libraryFileUrl(copy, copy.image)}`);
    expect(page.status).toBe(200);
  });

  it('refuses an invalid design, a PDF background, an unknown item or editing a file', async () => {
    await expect(
      errorCode(local().admin.library.saveTemplate.mutate(templateForm({ design: 'not json' }))),
    ).resolves.toBe('BAD_REQUEST');
    await expect(
      errorCode(
        local().admin.library.saveTemplate.mutate(
          templateForm({ background: new File([PNG], 'b.pdf', { type: 'application/pdf' }) }),
        ),
      ),
    ).resolves.toBe('BAD_REQUEST');
    const unknown = '00000000-0000-4000-8000-000000000000';
    await expect(
      errorCode(local().admin.library.saveTemplate.mutate(templateForm({ id: unknown }))),
    ).resolves.toBe('NOT_FOUND');
    const file = await local().admin.slides.upload.mutate(uploadForm(null));
    await expect(
      errorCode(local().admin.library.saveTemplate.mutate(templateForm({ id: file.id }))),
    ).resolves.toBe('BAD_REQUEST');
  });
});
