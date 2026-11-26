import { useMemo } from 'react';

import { strings, type LocationInput } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { FormCard } from '../ui/Card.tsx';
import { NumberInput, SelectInput, TextInput, Toggle } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { useDraft } from '../use-draft.ts';

const labels = strings.admin.location;

export function LocationCard({ location }: { location: LocationInput }) {
  const api = useApiClient();
  const { draft, setDraft, dirty } = useDraft(location);
  const save = useAction(() => api.admin.updateLocation.mutate(draft), strings.admin.saved);
  const timeZones = useMemo(
    () => Intl.supportedValuesOf('timeZone').map((zone) => ({ value: zone, label: zone })),
    [],
  );
  const place = draft.location;
  const setPlace = (changes: Partial<LocationInput['location']>) => {
    setDraft({ ...draft, location: { ...place, ...changes } });
  };

  return (
    <FormCard
      title={labels.title}
      dirty={dirty}
      pending={save.pending}
      onSave={() => void save.run()}
    >
      <TextInput
        label={labels.name}
        value={place.name}
        required
        maxLength={100}
        onChange={(name) => {
          setPlace({ name });
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label={labels.latitude}
          value={place.latitude}
          min={-90}
          max={90}
          step={0.000001}
          onChange={(latitude) => {
            setPlace({ latitude });
          }}
        />
        <NumberInput
          label={labels.longitude}
          value={place.longitude}
          min={-180}
          max={180}
          step={0.000001}
          onChange={(longitude) => {
            setPlace({ longitude });
          }}
        />
        <NumberInput
          label={labels.elevation}
          value={place.elevation}
          min={-500}
          max={9000}
          onChange={(elevation) => {
            setPlace({ elevation });
          }}
        />
        <SelectInput
          label={labels.timeZone}
          value={place.timeZoneId}
          options={timeZones}
          dir="ltr"
          onChange={(timeZoneId) => {
            setPlace({ timeZoneId });
          }}
        />
      </div>
      <Toggle
        label={labels.inIsrael}
        isSelected={place.inIsrael}
        onChange={(inIsrael) => {
          setPlace({ inIsrael });
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label={labels.candleLighting}
          value={draft.candleLightingMinutes}
          min={0}
          max={120}
          onChange={(candleLightingMinutes) => {
            setDraft({ ...draft, candleLightingMinutes });
          }}
        />
        <NumberInput
          label={labels.motzashOffset}
          value={draft.motzashArvitOffsetMinutes}
          min={0}
          max={120}
          onChange={(motzashArvitOffsetMinutes) => {
            setDraft({ ...draft, motzashArvitOffsetMinutes });
          }}
        />
      </div>
    </FormCard>
  );
}
