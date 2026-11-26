import { strings } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { Button } from '../components/Button.tsx';

/** Opens the admin window on the synagogue PC; shown only while the mouse moves. */
export function AdminButton() {
  const api = useApiClient();
  return (
    <div className="fixed inset-x-0 top-4 z-10 flex justify-center">
      <Button
        onPress={() => {
          void api.desktop.showAdmin.mutate();
        }}
      >
        {strings.admin.openAdmin}
      </Button>
    </div>
  );
}
