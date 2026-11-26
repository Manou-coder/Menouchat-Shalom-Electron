import { strings } from '@menouchat/shared';

import { Button } from '../components/Button.tsx';
import { Card } from '../components/Card.tsx';
import { Page } from '../components/Page.tsx';
import { HealthStatus } from '../health/HealthStatus.tsx';
import { useHealth } from '../health/use-health.ts';

export function AdminPage() {
  const { state, recheck } = useHealth();
  return (
    <Page title={`${strings.appName} · ${strings.admin.title}`}>
      <Card>
        <HealthStatus state={state} />
        <Button onPress={recheck} isDisabled={state.status === 'checking'}>
          {strings.admin.checkConnection}
        </Button>
      </Card>
    </Page>
  );
}
