import type { FastifyInstance } from 'fastify';

export const LOOPBACK_HOST = '127.0.0.1';
/** Every interface: phones on the local network can connect (plan §4.4). */
export const ALL_INTERFACES_HOST = '0.0.0.0';

export interface ServerListener {
  /** (Re)starts the server on `host`; open connections, server-sent events included, are closed. */
  listen(host: string): Promise<string>;
  close(): Promise<void>;
}

/**
 * Owns the running HTTP server. Fastify cannot change the address it listens on, so
 * switching phone access closes the server and starts a fresh one on the same port; the
 * windows' event streams reconnect by themselves.
 */
export function createServerListener(
  create: () => Promise<FastifyInstance>,
  port: number,
): ServerListener {
  let current: FastifyInstance | undefined;
  return {
    async listen(host) {
      await current?.close();
      current = await create();
      return current.listen({ host, port });
    },
    async close() {
      await current?.close();
      current = undefined;
    },
  };
}
