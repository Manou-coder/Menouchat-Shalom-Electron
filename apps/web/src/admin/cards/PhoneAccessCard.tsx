import { useState, type SubmitEvent } from 'react';

import { pinSchema, strings, type PhoneAccess } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { TextInput, Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';

const labels = strings.admin.phone;

function PinForm({ pinSet }: { pinSet: boolean }) {
  const api = useApiClient();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const save = useAction(() => api.admin.phone.setPin.mutate({ pin }), labels.pinSaved);
  const valid = pinSchema.safeParse(pin).success;
  const mismatch = confirmation !== '' && confirmation !== pin;

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (valid && !mismatch && (await save.run())) {
      setPin('');
      setConfirmation('');
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label={labels.newPin}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="\d{4,8}"
          dir="ltr"
          value={pin}
          onChange={setPin}
        />
        <TextInput
          label={labels.confirmPin}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          dir="ltr"
          value={confirmation}
          onChange={setConfirmation}
          aria-invalid={mismatch}
          {...(mismatch ? { description: labels.pinMismatch } : {})}
        />
      </div>
      <div>
        <Button
          type="submit"
          variant="secondary"
          isDisabled={!valid || confirmation !== pin || save.pending}
        >
          {pinSet ? labels.changePin : labels.setPin}
        </Button>
      </div>
    </form>
  );
}

/** Editing from a phone on the synagogue Wi-Fi, with a PIN (plan §4.4). */
export function PhoneAccessCard({ access }: { access: PhoneAccess }) {
  const api = useApiClient();
  const toggle = useAction((enabled: boolean) => api.admin.phone.setEnabled.mutate({ enabled }));

  return (
    <Card title={labels.title}>
      <p className="text-text-muted">{labels.explanation}</p>
      <Toggle
        label={labels.enable}
        isSelected={access.enabled}
        isDisabled={!access.pinSet || toggle.pending}
        onChange={(enabled) => void toggle.run(enabled)}
      />
      {!access.pinSet && <p className="text-sm">{labels.pinRequired}</p>}
      {access.enabled &&
        (access.urls.length === 0 ? (
          <p>{labels.noNetwork}</p>
        ) : (
          <div className="grid gap-1">
            <p>{labels.address}</p>
            {access.urls.map((url) => (
              <p
                key={url}
                dir="ltr"
                className="rounded-lg bg-background px-3 py-2 text-center font-mono text-lg select-all"
              >
                {url}
              </p>
            ))}
          </div>
        ))}
      <PinForm pinSet={access.pinSet} />
    </Card>
  );
}
