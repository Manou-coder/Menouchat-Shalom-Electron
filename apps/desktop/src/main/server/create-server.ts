import fastifyStatic from '@fastify/static';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyInstance } from 'fastify';

import { SLIDES_PATH, TRPC_PATH } from '@menouchat/shared';

import {
  createAppRouter,
  type AdminApi,
  type AppRouter,
  type AuthApi,
  type DisplayStateApi,
} from '../api/router.ts';
import { bearerToken, resolveClientKind } from './client-kind.ts';
import { readSessionCookie, sessionCookieHeader } from './session-cookie.ts';

export interface ServerOptions {
  version: string;
  /** Per-launch secret that identifies the desktop app's own windows. */
  token: string;
  displayStates: DisplayStateApi;
  admin: AdminApi;
  auth: AuthApi;
  /** `userData/slides`, served read-only under `/slides`. */
  slidesRoot: string;
  /** Built web app to serve; omitted in development, where Vite serves it. */
  webRoot?: string;
  onError: (error: Error, path: string | undefined) => void;
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // pdf.js decodes some images with WebAssembly.
  "script-src 'self' 'wasm-unsafe-eval'",
  // React Aria injects a small stylesheet (touch handling); styles cannot run code.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'none'",
  // The admin previews the display in a frame.
  "frame-ancestors 'self'",
  "form-action 'self'",
].join('; ');

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  // Closing must not wait for server-sent event streams, which never end on their own.
  const server = Fastify({ logger: false, forceCloseConnections: true });

  server.addHook('onSend', async (_request, reply) => {
    reply.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
  });

  const trpcOptions: FastifyTRPCPluginOptions<AppRouter>['trpcOptions'] = {
    router: createAppRouter({
      version: options.version,
      displayStates: options.displayStates,
      admin: options.admin,
      auth: options.auth,
    }),
    createContext: ({ req, res, info }) => ({
      // Server-sent events cannot carry headers, so subscriptions pass the token as a
      // connection parameter instead.
      client: resolveClientKind(
        bearerToken(req.headers.authorization) ?? info.connectionParams?.['token'],
        options.token,
      ),
      remoteAddress: req.ip,
      sessionId: readSessionCookie(req.headers.cookie),
      setSessionCookie: (sessionId) => {
        void res.header('Set-Cookie', sessionCookieHeader(sessionId));
      },
    }),
    onError: ({ error, path }) => {
      // Refused PINs, unknown displays and the like are expected answers, not faults.
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        options.onError(error, path);
      }
    },
  };
  await server.register(fastifyTRPCPlugin, { prefix: TRPC_PATH, trpcOptions });

  server.get('/', async (_request, reply) => reply.redirect('/admin'));

  await server.register(fastifyStatic, {
    root: options.slidesRoot,
    prefix: `${SLIDES_PATH}/`,
    decorateReply: false,
    // Pages never change in place: a new upload gets a new slide id.
    maxAge: '1y',
    immutable: true,
  });

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
