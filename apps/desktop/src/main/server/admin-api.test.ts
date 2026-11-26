import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SLIDE_UPLOAD_FIELDS } from '@menouchat/shared';

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

interface ClientOptions {
  token?: string;
  cookie?: string;
  onSetCookie?: (value: string) => void;
}

function client({ token, cookie, onSetCookie }: ClientOptions = {}) {
  const url = `${baseUrl}/trpc`;
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url,
        headers: {
          ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
          ...(cookie === undefined ? {} : { cookie }),
        },
        fetch: async (input, init) => {
          // httpLink always calls with the procedure URL as a string.
          const response = await fetch(input as string, init as RequestInit | undefined);
          const setCookie = response.headers.get('set-cookie');
          if (setCookie !== null) onSetCookie?.(setCookie);
          return response;
        },
      }),
    ],
  });
}

const local = () => client({ token: TEST_TOKEN });

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

function uploadForm(pages: Uint8Array[] = [JPEG, JPEG], pageType = 'image/jpeg'): FormData {
  const form = new FormData();
  form.set(SLIDE_UPLOAD_FIELDS.title, 'Halacha yomit');
  form.set(
    SLIDE_UPLOAD_FIELDS.original,
    new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'halacha.pdf', {
      type: 'application/pdf',
    }),
  );
  pages.forEach((page, index) => {
    form.append(
      SLIDE_UPLOAD_FIELDS.pages,
      new File([page], `page-${String(index + 1)}.jpg`, { type: pageType }),
    );
  });
  return form;
}

describe('admin access', () => {
  it('refuses callers that are neither a local window nor signed in', async () => {
    await expect(errorCode(client().admin.state.query())).resolves.toBe('UNAUTHORIZED');
    await expect(
      errorCode(client({ token: 'wrong'.padEnd(43, 'x') }).admin.state.query()),
    ).resolves.toBe('UNAUTHORIZED');
  });

  it('lets local windows in without a PIN', async () => {
    const state = await local().admin.state.query();
    expect(state.phoneAccess).toEqual({ enabled: false, pinSet: false, port: 3741, urls: [] });
    await expect(local().auth.status.query()).resolves.toEqual({ signedIn: true, pinSet: false });
  });

  it('signs a phone in with the PIN and out again', async () => {
    await local().admin.phone.setPin.mutate({ pin: '2580' });
    let cookie = '';
    const phone = client({ onSetCookie: (value) => (cookie = value.split(';')[0] ?? '') });

    await expect(errorCode(phone.auth.login.mutate({ pin: '1111' }))).resolves.toBe('UNAUTHORIZED');
    await phone.auth.login.mutate({ pin: '2580' });
    expect(cookie).toMatch(/^menouchat_session=[\w-]{43}$/);

    const signedIn = client({ cookie });
    await expect(signedIn.auth.status.query()).resolves.toEqual({ signedIn: true, pinSet: true });
    await expect(signedIn.admin.state.query()).resolves.toMatchObject({ slides: [] });

    await signedIn.auth.logout.mutate();
    await expect(errorCode(signedIn.admin.state.query())).resolves.toBe('UNAUTHORIZED');
  });

  it('signs every phone out when the PIN changes', async () => {
    await local().admin.phone.setPin.mutate({ pin: '2580' });
    let cookie = '';
    await client({
      onSetCookie: (value) => (cookie = value.split(';')[0] ?? ''),
    }).auth.login.mutate({
      pin: '2580',
    });
    await local().admin.phone.setPin.mutate({ pin: '1357' });
    await expect(errorCode(client({ cookie }).admin.state.query())).resolves.toBe('UNAUTHORIZED');
  });

  it('locks a device out after five wrong PINs', async () => {
    await local().admin.phone.setPin.mutate({ pin: '2580' });
    const phone = client();
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(errorCode(phone.auth.login.mutate({ pin: '0000' }))).resolves.toBe(
        'UNAUTHORIZED',
      );
    }
    await expect(errorCode(phone.auth.login.mutate({ pin: '2580' }))).resolves.toBe(
      'TOO_MANY_REQUESTS',
    );
  });

  it('rejects PINs that are not 4 to 8 digits', async () => {
    await expect(errorCode(local().admin.phone.setPin.mutate({ pin: '12a4' }))).resolves.toBe(
      'BAD_REQUEST',
    );
  });
});

describe('phone access', () => {
  it('requires a PIN first, then asks the main process to listen on the network', async () => {
    await expect(errorCode(local().admin.phone.setEnabled.mutate({ enabled: true }))).resolves.toBe(
      'PRECONDITION_FAILED',
    );
    expect(app.phoneAccessChanges).toEqual([]);

    await local().admin.phone.setPin.mutate({ pin: '2580' });
    await local().admin.phone.setEnabled.mutate({ enabled: true });
    expect(app.phoneAccessChanges).toEqual([true]);
    await expect(local().admin.state.query()).resolves.toMatchObject({
      phoneAccess: { enabled: true, pinSet: true, urls: ['http://192.168.1.10:3741/admin'] },
    });
  });
});

describe('editing', () => {
  it('saves the schedule and the location, and the display follows', async () => {
    const before = await local().admin.state.query();
    await local().admin.updateSchedule.mutate({
      ...before.schedule,
      weekday: { ...before.schedule.weekday, shacharit: '06:45' },
    });
    await local().admin.updateLocation.mutate({ ...before.location, candleLightingMinutes: 30 });

    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.schedule.weekday.shacharit).toBe('06:45');
    expect((await app.store.settings.read()).candleLightingMinutes).toBe(30);
  });

  it('rejects invalid times', async () => {
    const { schedule } = await local().admin.state.query();
    await expect(
      errorCode(
        local().admin.updateSchedule.mutate({
          ...schedule,
          weekday: { ...schedule.weekday, mincha: '25:00' },
        }),
      ),
    ).resolves.toBe('BAD_REQUEST');
  });

  it('updates a display and refuses unknown ones', async () => {
    const input = {
      id: 'main',
      layoutId: 'classic-portrait',
      layoutOptions: { showClock: false },
      slideIntervalSec: 15,
    };
    await local().admin.updateDisplay.mutate(input);
    await expect(client().display.state.query({ displayId: 'main' })).resolves.toMatchObject({
      layoutOptions: { showClock: false },
      slideshow: { intervalSec: 15 },
    });
    await expect(
      errorCode(local().admin.updateDisplay.mutate({ ...input, id: 'lobby' })),
    ).resolves.toBe('NOT_FOUND');
  });
});

describe('slides', () => {
  it('stores an upload with its original and every page, then serves the pages', async () => {
    const slide = await local().admin.slides.add.mutate(uploadForm());
    expect(slide).toMatchObject({
      title: 'Halacha yomit',
      originalFile: 'original.pdf',
      pages: ['page-1.jpg', 'page-2.jpg'],
      enabled: true,
    });
    const folder = join(app.slidesRoot, slide.id);
    await expect(readFile(join(folder, 'original.pdf'))).resolves.toEqual(Buffer.from('%PDF'));
    const page = await fetch(`${baseUrl}/slides/${slide.id}/page-2.jpg`);
    expect(page.status).toBe(200);

    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.slideshow.pages.map((p) => p.url)).toEqual([
      `/slides/${slide.id}/page-1.jpg`,
      `/slides/${slide.id}/page-2.jpg`,
    ]);
  });

  it('refuses pages that are not JPEG images and leaves nothing behind', async () => {
    await expect(
      errorCode(local().admin.slides.add.mutate(uploadForm([JPEG], 'image/png'))),
    ).resolves.toBe('BAD_REQUEST');
    await expect(
      errorCode(local().admin.slides.add.mutate(uploadForm([new Uint8Array([1, 2, 3])]))),
    ).resolves.toBe('BAD_REQUEST');
    await expect(local().admin.state.query()).resolves.toMatchObject({ slides: [] });
  });

  it('does not accept uploads from anonymous callers', async () => {
    await expect(errorCode(client().admin.slides.add.mutate(uploadForm()))).resolves.toBe(
      'UNAUTHORIZED',
    );
  });

  it('reorders, toggles, renames and deletes slides', async () => {
    const first = await local().admin.slides.add.mutate(uploadForm());
    const second = await local().admin.slides.add.mutate(uploadForm([JPEG]));
    await local().admin.slides.reorder.mutate({ slideIds: [second.id, first.id] });
    await local().admin.slides.setEnabled.mutate({ slideId: first.id, enabled: false });
    await local().admin.slides.rename.mutate({ slideId: second.id, title: 'Shabbat' });

    const { slides } = await local().admin.state.query();
    expect(slides.map((slide) => [slide.title, slide.enabled])).toEqual([
      ['Shabbat', true],
      ['Halacha yomit', false],
    ]);
    await expect(
      errorCode(local().admin.slides.reorder.mutate({ slideIds: [first.id] })),
    ).resolves.toBe('BAD_REQUEST');

    await local().admin.slides.delete.mutate({ slideId: first.id });
    await expect(access(join(app.slidesRoot, first.id))).rejects.toThrow();
    await expect(local().admin.state.query()).resolves.toMatchObject({
      slides: [{ id: second.id }],
    });
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
          weekday: { ...schedule.weekday, arvit: '20:30' },
        });
      },
    );
    expect(text).toContain('"arvit":"20:10"');
    expect(text).toContain('"arvit":"20:30"');
  });

  it('refuses the stream to anonymous callers', async () => {
    const text = await readStream(adminStreamPath(), (received) =>
      received.includes('UNAUTHORIZED'),
    );
    expect(text).toContain('UNAUTHORIZED');
    expect(text).not.toContain('"schedule"');
  });
});
