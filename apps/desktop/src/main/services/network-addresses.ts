import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';

/** The fixed name phones can type instead of an IP address, answered over mDNS. */
export const LOCAL_HOSTNAME = 'menouchat.local';

function localIPv4(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces(),
): NetworkInterfaceInfo[] {
  return Object.values(interfaces)
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === 'IPv4' && !address.internal);
}

/** IPv4 addresses of this PC on the local network, where a phone can reach it. */
export function localNetworkAddresses(): string[] {
  return localIPv4().map((address) => address.address);
}

function toNumber(ipv4: string): number {
  return ipv4.split('.').reduce((value, part) => value * 256 + Number(part), 0);
}

function sameSubnet(a: string, b: string, netmask: string): boolean {
  const mask = toNumber(netmask);
  // `>>> 0` keeps the bitwise results unsigned, so equal subnets compare equal.
  return (toNumber(a) & mask) >>> 0 === (toNumber(b) & mask) >>> 0;
}

/**
 * The addresses a device at `remote` can reach: those on its subnet, or every address
 * when none matches (a routed network), so a PC with a VPN or a second card answers
 * with the one the phone is actually on.
 */
export function addressesFacing(
  remote: string,
  interfaces?: NodeJS.Dict<NetworkInterfaceInfo[]>,
): string[] {
  const all = localIPv4(interfaces);
  const facing = all.filter((address) => sameSubnet(address.address, remote, address.netmask));
  return (facing.length > 0 ? facing : all).map((address) => address.address);
}
