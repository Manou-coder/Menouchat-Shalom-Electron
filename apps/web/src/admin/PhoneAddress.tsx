import { strings } from '@menouchat/shared';

/** Where to point a phone's browser to edit from the synagogue's Wi-Fi. */
export function PhoneAddress({ urls }: { urls: readonly string[] }) {
  const labels = strings.admin.phone;
  if (urls.length === 0) {
    return <p className="text-sm text-text-muted">{labels.noNetwork}</p>;
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-text-muted">
      <span>{labels.address}</span>
      {urls.map((url) => (
        <span key={url} dir="ltr" className="font-mono text-base text-text select-all">
          {url}
        </span>
      ))}
    </p>
  );
}
