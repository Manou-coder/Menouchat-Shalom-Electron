import fastifyStatic from '@fastify/static';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyInstance } from 'fastify';

import { TRPC_PATH } from '@menouchat/shared';

import { createAppRouter, type AppRouter } from '../api/router.ts';
import { resolveClientKind } from './client-kind.ts';

export interface ServerOptions {
  version: string;
  /** Per-launch secret that identifies the desktop app's own windows. */
  token: string;
  /** Built web app to serve; omitted in development, where Vite serves it. */
  webRoot?: string;
  onError: (error: Error, path: string | undefined) => void;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });

  server.addHook('onSend', async (_request, reply) => {
    reply.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
  });

  const trpcOptions: FastifyTRPCPluginOptions<AppRouter>['trpcOptions'] = {
    router: createAppRouter({ version: options.version }),
    createContext: ({ req }) => ({
      client: resolveClientKind(req.headers.authorization, options.token),
    }),
    onError: ({ error, path }) => {
      options.onError(error, path);
    },
  };
  await server.register(fastifyTRPCPlugin, { prefix: TRPC_PATH, trpcOptions });

  server.get('/', async (_request, reply) => reply.redirect('/admin'));

  if (options.webRoot !== undefined) {
    await registerWebApp(server, options.webRoot);
  }

  return server;
}

async function registerWebApp(server: FastifyInstance, webRoot: string): Promise<void> {
  await server.register(fastifyStatic, {
    root: webRoot,
    cacheControl: false,
    setHeaders: (reply, filePath) => {
      // Vite fingerprints everything under assets/; index.html must always be revalidated
      // so that an update is picked up on the next load.
      reply.header(
        'Cache-Control',
        /[\\/]assets[\\/]/.test(filePath) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  // Client-side routes (/admin, /display/:id) all resolve to the single-page app.
  server.setNotFoundHandler(async (request, reply) => {
    const wantsPage =
      (request.method === 'GET' || request.method === 'HEAD') &&
      !request.url.startsWith(TRPC_PATH) &&
      request.headers.accept?.includes('text/html') === true;
    if (!wantsPage) {
      return reply.code(404).send({ error: 'Not Found' });
    }
    return reply.sendFile('index.html');
  });
}
