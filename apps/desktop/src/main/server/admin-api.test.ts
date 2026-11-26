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
  it('refuses callers that are neither a local window nor signed in', async () => {
    await expect(errorCode(client().admin.state.query())).resolves.toBe('UNAUTHORIZED');
    await expect(
      errorCode(client({ token: 'wrong'.padEnd(43, 'x') }).admin.state.query()),
    ).resolves.toBe('UNAUTHORIZED');
  });

  it('lets local windows in without a PIN', async () => {
    const state = await local().admin.state.query();
    expect(state.phoneAccess).toEqual({ enabled: false, pinSet: false, urls: [] });
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
    await expect(errorCode(client().admin.installUpdate.mutate())).resolves.toBe('UNAUTHORIZED');
    await local().admin.installUpdate.mutate();
    expect(app.desktopCalls).toEqual(['installUpdate']);
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
  it('saves the schedule and the display follows', async () => {
    const { schedule } = await local().admin.state.query();
    await local().admin.updateSchedule.mutate({
      ...schedule,
      weekday: { ...schedule.weekday, shacharit: '06:45' },
    });
    const display = await client().display.state.query({ displayId: 'main' });
    expect(display.schedule.weekday.shacharit).toBe('06:45');
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

  it('does not accept uploads from anonymous callers', async () => {
    await expect(errorCode(client().admin.slides.upload.mutate(uploadForm()))).resolves.toBe(
      'UNAUTHORIZED',
    );
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
