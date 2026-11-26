import { useParams } from 'react-router';

import { strings } from '@menouchat/shared';

import { Page } from '../components/Page.tsx';
import { HealthStatus } from '../health/HealthStatus.tsx';
import { useHealth } from '../health/use-health.ts';

export function DisplayPage() {
  const { id } = useParams();
  const { state } = useHealth();
  return (
    <Page
      title={
        <>
          {strings.display.title} <bdi>{id}</bdi>
        </>
      }
    >
      <HealthStatus state={state} />
    </Page>
  );
}
