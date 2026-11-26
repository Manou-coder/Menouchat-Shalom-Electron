import { networkInterfaces } from 'node:os';

/** IPv4 addresses of this PC on the local network, where a phone can reach it. */
export function localNetworkAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => address.address);
}
