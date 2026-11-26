import { strings } from '@menouchat/shared';

/**
 * Where to point a phone's browser to edit from the synagogue's Wi-Fi: the fixed name
 * first, then the numeric addresses for phones that cannot resolve it.
 */
export function PhoneAddress({ urls }: { urls: readonly string[] }) {
  const labels = strings.admin.phone;
  const [main, ...fallbacks] = urls;
  if (main === undefined) {
    return <p className="text-sm text-text-muted">{labels.noNetwork}</p>;
  }
  return (
    <div className="grid text-sm text-text-muted">
      <p>{labels.address}</p>
      <p>
        <span dir="ltr" className="font-mono font-semibold break-all text-text select-all">
          {main}
        </span>
      </p>
      {fallbacks.map((url) => (
        <p key={url}>
          {labels.or}{' '}
          <span dir="ltr" className="font-mono break-all select-all">
            {url}
          </span>
        </p>
      ))}
    </div>
  );
}
