import { useState, type SubmitEvent } from 'react';

import { strings } from '@menouchat/shared';

import { useApiClient } from '../api/api-client.ts';
import { Button } from '../components/Button.tsx';
import { errorCode, errorMessage } from './errors.ts';
import { Card } from './ui/Card.tsx';
import { TextInput } from './ui/fields.tsx';

const labels = strings.admin.login;

export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const api = useApiClient();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      await api.auth.login.mutate({ pin });
      onSignedIn();
    } catch (failure) {
      const code = errorCode(failure);
      setError(
        code === 'UNAUTHORIZED' || code === 'BAD_REQUEST'
          ? labels.wrong
          : code === 'TOO_MANY_REQUESTS'
            ? labels.locked(Number((failure as Error).message) || 15)
            : errorMessage(failure),
      );
      setPin('');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-sm gap-6 px-4 py-10">
      <Card title={labels.title}>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <TextInput
            label={labels.pin}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            dir="ltr"
            required
            autoFocus
            value={pin}
            onChange={setPin}
          />
          {error !== undefined && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button type="submit" isDisabled={pin.length === 0 || pending}>
            {labels.submit}
          </Button>
        </form>
      </Card>
    </main>
  );
}
