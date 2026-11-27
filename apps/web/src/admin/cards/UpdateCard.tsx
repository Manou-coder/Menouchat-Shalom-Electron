import { useEffect, useState } from 'react';

import { strings, type UpdateCheckResult, type UpdateStatus } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { Card, ErrorMessage } from '../ui/Card.tsx';
import { useAction } from '../use-action.ts';

const labels = strings.admin.update;

function useVersion(): string | undefined {
  const api = useApiClient();
  const [version, setVersion] = useState<string>();
  useEffect(() => {
    void api.health.query().then(
      (health) => {
        setVersion(health.version);
      },
      () => undefined,
    );
  }, [api]);
  return version;
}

function resultMessage(result: UpdateCheckResult): string {
  switch (result.result) {
    case 'upToDate':
      return labels.upToDate;
    case 'found':
      return labels.found(result.version);
    case 'disabled':
      return labels.disabled;
    case 'failed':
      return labels.failed;
  }
}

/**
 * The installed version and a manual check. A version found downloads in the background,
 * then the card offers to restart into it.
 */
export function UpdateCard({ update }: { update: UpdateStatus }) {
  const api = useApiClient();
  const version = useVersion();
  const [result, setResult] = useState<UpdateCheckResult>();
  const check = useAction(async () => {
    setResult(undefined);
    setResult(await api.admin.checkForUpdate.mutate());
  });
  const install = useAction(() => api.admin.installUpdate.mutate());

  return (
    <Card title={labels.title}>
      {version !== undefined && <p className="text-text-muted">{labels.currentVersion(version)}</p>}

      {update.status === 'none' ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onPress={() => void check.run()} isPending={check.pending}>
            {check.pending ? labels.checking : labels.check}
          </Button>
          {result !== undefined && (
            <p role="status" className={result.result === 'failed' ? 'text-danger' : ''}>
              {resultMessage(result)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status">
            {update.status === 'ready'
              ? labels.ready(update.version)
              : labels.downloading(update.version)}
          </p>
          {update.status === 'ready' && (
            <Button onPress={() => void install.run()} isDisabled={install.pending}>
              {labels.installNow}
            </Button>
          )}
        </div>
      )}

      <ErrorMessage message={check.error ?? install.error} />
    </Card>
  );
}
