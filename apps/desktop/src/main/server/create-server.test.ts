import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

import {
  createDefaultDisplays,
  createDefaultSchedule,
  createDefaultSettings,
  createDefaultSlides,
  displayStateSchema,
  healthSchema,
} from '@menouchat/shared';

import { createDisplayStateService } from '../services/display-state-service.ts';

import { createServer } from './create-server.ts';

const token = 'test-token-'.padEnd(43, 'x');
const version = '2.0.0-test';

const servers: FastifyInstance[] = [];

let slidesRoot: string;
const slideId = '00000000-0000-4000-8000-00000000000a';

beforeAll(async () => {
  slidesRoot = await mkdtemp(join(tmpdir(), 'menouchat-slides-'));
  await mkdir(join(slidesRoot, slideId));
  await writeFile(join(slidesRoot, slideId, 'page-1.jpg'), 'jpeg bytes');
});

afterAll(async () => {
  await rm(slidesRoot, { recursive: true, force: true });
});

const displayStates = createDisplayStateService({
  readInputs: () =>
    Promise.resolve({
      settings: createDefaultSettings(),
      schedule: createDefaultSchedule(),
      slides: createDefaultSlides(),
      displays: createDefaultDisplays(),
    }),
  now: () => Date.UTC(2026, 10, 27, 10),
});

async function startServer(webRoot?: string): Promise<FastifyInstance> {
  const server = await createServer({
    version,
    token,
    displayStates,
    slidesRoot,
    onError: vi.fn(),
    ...(webRoot === undefined ? {} : { webRoot }),
  });
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function getHealth(server: FastifyInstance, authorization?: string) {
  const response = await server.inject({
    method: 'GET',
    url: '/trpc/health',
    headers: authorization === undefined ? {} : { authorization },
  });
  expect(response.statusCode).toBe(200);
  const body: unknown = response.json();
  return healthSchema.parse((body as { result: { data: unknown } }).result.data);
}

describe('health procedure', () => {
  it('reports a local client when the launch token is presented', async () => {
    const server = await startServer();
    await expect(getHealth(server, `Bearer ${token}`)).resolves.toEqual({
      status: 'ok',
      version,
      client: 'local',
    });
  });

  it.each([undefined, 'Bearer wrong', `Basic ${token}`, `Bearer ${token}x`])(
    'reports a remote client for authorization %j',
    async (authorization) => {
      const server = await startServer();
      await expect(getHealth(server, authorization)).resolves.toMatchObject({ client: 'remote' });
    },
  );
});

describe('display procedures', () => {
  const stateUrl = (displayId: string) =>
    `/trpc/display.state?input=${encodeURIComponent(JSON.stringify({ displayId }))}`;

  it('returns the snapshot of a display', async () => {
    const server = await startServer();
    const response = await server.inject({ method: 'GET', url: stateUrl('main') });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ result: { data: unknown } }>();
    expect(displayStateSchema.parse(body.result.data).calendar.parasha).toBe('וישלח');
  });

  it('answers 404 for an unknown display', async () => {
    const server = await startServer();
    const response = await server.inject({ method: 'GET', url: stateUrl('lobby') });
    expect(response.statusCode).toBe(404);
  });

  it('streams snapshots over server-sent events', async () => {
    const server = await startServer();
    const address = await server.listen({ host: '127.0.0.1', port: 0 });
    const controller = new AbortController();
    const response = await fetch(
      `${address}/trpc/display.onState?input=${encodeURIComponent(JSON.stringify({ displayId: 'main' }))}`,
      { signal: controller.signal },
    );
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader: ReadableStreamDefaultReader<Uint8Array> | undefined = response.body?.getReader();
    let received = '';
    while (reader !== undefined && !received.includes('וישלח')) {
      const { value, done } = await reader.read();
      if (done) break;
      received += new TextDecoder().decode(value);
    }
    controller.abort();
    expect(received).toContain('"displayId":"main"');
  });
});

describe('slides', () => {
  it('serves slide pages as immutable files', async () => {
    const server = await startServer();
    const response = await server.inject({ method: 'GET', url: `/slides/${slideId}/page-1.jpg` });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('jpeg bytes');
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('does not serve files outside the slides folder', async () => {
    const server = await startServer();
    const response = await server.inject({ method: 'GET', url: '/slides/..%2F..%2Fetc%2Fpasswd' });
    expect(response.statusCode).toBe(404);
  });
});

describe('HTTP server', () => {
  it('sets security headers on every response', async () => {
    const server = await startServer();
    const response = await server.inject({ method: 'GET', url: '/trpc/health' });
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('redirects the root to the admin', async () => {
    const server = await startServer();
    const response = await server.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin');
  });
});

describe('web app hosting', () => {
  let webRoot: string;

  beforeAll(async () => {
    webRoot = await mkdtemp(join(tmpdir(), 'menouchat-web-'));
    await mkdir(join(webRoot, 'assets'));
    await writeFile(join(webRoot, 'index.html'), '<!doctype html><title>app</title>');
    await writeFile(join(webRoot, 'assets', 'index-abc123.js'), 'export {};');
  });

  afterAll(async () => {
    await rm(webRoot, { recursive: true, force: true });
  });

  it.each(['/admin', '/display/main'])('serves the app shell for %s', async (url) => {
    const server = await startServer(webRoot);
    const response = await server.inject({ method: 'GET', url, headers: { accept: 'text/html' } });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<title>app</title>');
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  it('serves fingerprinted assets as immutable', async () => {
    const server = await startServer(webRoot);
    const response = await server.inject({ method: 'GET', url: '/assets/index-abc123.js' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('returns 404 rather than the app shell for missing files', async () => {
    const server = await startServer(webRoot);
    const response = await server.inject({ method: 'GET', url: '/assets/missing.js' });
    expect(response.statusCode).toBe(404);
  });
});
