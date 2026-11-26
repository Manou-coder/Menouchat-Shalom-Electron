import makeMdns from 'multicast-dns';

import { addressesFacing, LOCAL_HOSTNAME } from './network-addresses.ts';

const TTL_SECONDS = 120;

/**
 * Answers mDNS queries for {@link LOCAL_HOSTNAME}, like a printer announcing its name, so
 * phones on the Wi-Fi reach the admin at an address that survives DHCP changes.
 * Returns a function that stops answering.
 */
export function announceLocalHostname(onError: (error: Error) => void): () => void {
  const mdns = makeMdns();
  mdns.on('query', (query, remote) => {
    const asked = (query.questions ?? []).some(
      (question) => question.name.toLowerCase() === LOCAL_HOSTNAME && question.type === 'A',
    );
    if (!asked) return;
    const answers = addressesFacing(remote.address).map((data) => ({
      name: LOCAL_HOSTNAME,
      type: 'A' as const,
      ttl: TTL_SECONDS,
      flush: true,
      data,
    }));
    if (answers.length > 0) {
      mdns.respond({ answers });
    }
  });
  mdns.on('error', onError);
  return () => {
    mdns.destroy();
  };
}
