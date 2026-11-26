import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

import { healthSchema } from '@menouchat/shared';

import { createServer } from './create-server.ts';

const token = 'test-token-'.padEnd(43, 'x');
const version = '2.0.0-test';

const servers: FastifyInstance[] = [];

async function startServer(webRoot?: string): Promise<FastifyInstance> {
  const server = await createServer({
    version,
    token,
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
