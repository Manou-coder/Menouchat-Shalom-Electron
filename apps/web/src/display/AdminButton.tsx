import { strings } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { Button } from '../components/Button.tsx';

/** Opens the admin window on the synagogue PC; shown only while the mouse moves. */
export function AdminButton() {
  const api = useApiClient();
  return (
    <div className="fixed top-4 right-4 z-10">
      <Button
        variant="alert"
        onPress={() => {
          void api.desktop.showAdmin.mutate();
        }}
      >
        {strings.admin.openAdmin}
      </Button>
    </div>
  );
}
