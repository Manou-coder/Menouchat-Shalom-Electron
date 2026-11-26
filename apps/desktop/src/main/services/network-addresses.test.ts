import type { NetworkInterfaceInfo } from 'node:os';

import { describe, expect, it } from 'vitest';

import { addressesFacing } from './network-addresses.ts';

function ipv4(address: string, netmask: string, internal = false): NetworkInterfaceInfo {
  return { address, netmask, family: 'IPv4', mac: '00:00:00:00:00:00', internal, cidr: null };
}

const interfaces = {
  lo: [ipv4('127.0.0.1', '255.0.0.0', true)],
  wifi: [ipv4('192.168.1.10', '255.255.255.0')],
  vpn: [ipv4('10.8.0.2', '255.255.0.0')],
};

describe('addressesFacing', () => {
  it("answers a phone with the PC's address on the phone's network", () => {
    expect(addressesFacing('192.168.1.42', interfaces)).toEqual(['192.168.1.10']);
    expect(addressesFacing('10.8.3.4', interfaces)).toEqual(['10.8.0.2']);
  });

  it('falls back to every address when no subnet matches', () => {
    expect(addressesFacing('172.16.0.5', interfaces)).toEqual(['192.168.1.10', '10.8.0.2']);
  });
});
