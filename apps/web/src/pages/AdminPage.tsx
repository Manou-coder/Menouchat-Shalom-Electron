import { useCallback, useEffect, useState } from 'react';

import { strings } from '@menouchat/shared';

import { Dashboard } from '../admin/Dashboard.tsx';
import { LoginForm } from '../admin/LoginForm.tsx';
import { Toasts } from '../admin/toasts.tsx';
import { useApiClient } from '../api/api-client.ts';

type Access = 'checking' | 'signed-in' | 'sign-in' | 'disabled';

/** Local windows go straight in; phones sign in with the PIN (plan §4.4). */
export function AdminPage() {
  const api = useApiClient();
  const [access, setAccess] = useState<Access>('checking');

  const check = useCallback(() => {
    void api.auth.status.query().then(
      ({ signedIn, pinSet }) => {
        setAccess(signedIn ? 'signed-in' : pinSet ? 'sign-in' : 'disabled');
      },
      () => {
        setAccess('sign-in');
      },
    );
  }, [api]);

  useEffect(check, [check]);

  return (
    <>
      {access === 'checking' && (
        <p role="status" className="p-6">
          {strings.admin.loading}
        </p>
      )}
      {access === 'signed-in' && <Dashboard onSignedOut={check} />}
      {access === 'sign-in' && <LoginForm onSignedIn={check} />}
      {access === 'disabled' && <p className="p-6">{strings.admin.login.notEnabled}</p>}
      <Toasts />
    </>
  );
}
