import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';

import {
  MAX_PRAYER_NAME_LENGTH,
  MAX_PRAYERS_PER_GROUP,
  strings,
  type Prayer,
  type ScheduleInput,
} from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { FormCard } from '../ui/Card.tsx';
import { inputClassFor } from '../ui/fields.tsx';
import { useAction } from '../use-action.ts';
import { useDraft } from '../use-draft.ts';

const labels = strings.admin.prayers;

type Group = keyof ScheduleInput;

/**
 * Made in the browser, where `crypto.randomUUID` may be missing (a phone on plain http);
 * it only has to differ from the other rows' ids.
 */
function newPrayerId(): string {
  return `prayer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function PrayerRow({
  prayer,
  saved,
  onChange,
  onRemove,
}: {
  prayer: Prayer;
  /** The same prayer as saved on the server, if it is not new. */
  saved: Prayer | undefined;
  onChange: (prayer: Prayer) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prayer.id });
  const shownName = prayer.name.trim() === '' ? labels.unnamed : prayer.name;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl bg-surface ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={labels.move(shownName)}
        // The handle alone starts a drag, so the page still scrolls under a finger elsewhere.
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-text-muted hover:bg-background focus-visible:outline-3 focus-visible:outline-focus active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        <input
          type="text"
          required
          maxLength={MAX_PRAYER_NAME_LENGTH}
          aria-label={labels.name}
          placeholder={labels.namePlaceholder}
          value={prayer.name}
          onChange={(event) => {
            onChange({ ...prayer, name: event.target.value });
          }}
          className={`${inputClassFor(saved?.name !== prayer.name)} min-w-40 flex-[2_1_10rem]`}
        />
        <input
          type="time"
          required
          dir="ltr"
          aria-label={`${labels.time} – ${shownName}`}
          value={prayer.time}
          onChange={(event) => {
            onChange({ ...prayer, time: event.target.value });
          }}
          className={`${inputClassFor(saved?.time !== prayer.time)} flex-[1_1_7rem] text-xl font-medium tabular-nums`}
        />
      </div>
      <Button variant="icon" aria-label={labels.remove(shownName)} onPress={onRemove}>
        <Trash2 aria-hidden className="mx-auto size-5" />
      </Button>
    </li>
  );
}

/**
 * One group's prayers: rename, retime, add, remove, and drag to reorder (by touch, mouse
 * or keyboard). The screen shows them in this order.
 */
function PrayerListCard({
  group,
  title,
  hint,
  schedule,
}: {
  group: Group;
  title: string;
  hint?: string;
  schedule: ScheduleInput;
}) {
  const api = useApiClient();
  const saved = schedule[group];
  const { draft, setDraft, dirty } = useDraft(saved);
  // Only this card's group is sent with the other group as saved, so that two cards
  // edited at once never undo each other.
  const save = useAction(() => api.admin.updateSchedule.mutate({ ...schedule, [group]: draft }));
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id: UniqueIdentifier) => {
    const name = draft.find((prayer) => prayer.id === id)?.name.trim();
    return name === undefined || name === '' ? labels.unnamed : name;
  };
  const positionOf = (id: UniqueIdentifier | undefined) =>
    draft.findIndex((prayer) => prayer.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => labels.drag.picked(nameOf(active.id)),
    onDragOver: ({ active, over }) =>
      over === null ? undefined : labels.drag.moved(nameOf(active.id), positionOf(over.id)),
    onDragEnd: ({ active, over }) =>
      over === null ? undefined : labels.drag.dropped(nameOf(active.id), positionOf(over.id)),
    onDragCancel: ({ active }) => labels.drag.cancelled(nameOf(active.id)),
  };

  function move({ active, over }: DragEndEvent) {
    if (over === null || active.id === over.id) {
      return;
    }
    setDraft(arrayMove(draft, positionOf(active.id) - 1, positionOf(over.id) - 1));
  }

  const full = draft.length >= MAX_PRAYERS_PER_GROUP;

  return (
    <FormCard
      title={title}
      dirty={dirty}
      pending={save.pending}
      done={save.done}
      error={save.error}
      onSave={() => void save.run()}
    >
      {hint !== undefined && <p className="text-sm text-text-muted">{hint}</p>}
      {draft.length === 0 ? (
        <p className="text-text-muted">{labels.empty}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={move}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: labels.drag.instructions },
          }}
        >
          <SortableContext
            items={draft.map((prayer) => prayer.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="grid gap-3">
              {draft.map((prayer, index) => (
                <PrayerRow
                  key={prayer.id}
                  prayer={prayer}
                  saved={saved.find((candidate) => candidate.id === prayer.id)}
                  onChange={(next) => {
                    setDraft(draft.with(index, next));
                  }}
                  onRemove={() => {
                    setDraft(draft.filter((candidate) => candidate.id !== prayer.id));
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          isDisabled={full}
          onPress={() => {
            setDraft([...draft, { id: newPrayerId(), name: '', time: '' }]);
          }}
        >
          <span className="flex items-center gap-2">
            <Plus aria-hidden className="size-5" />
            {labels.add}
          </span>
        </Button>
        {full && (
          <span className="text-sm text-text-muted">{labels.full(MAX_PRAYERS_PER_GROUP)}</span>
        )}
      </div>
    </FormCard>
  );
}

export function WeekdayTimesCard({ schedule }: { schedule: ScheduleInput }) {
  return <PrayerListCard group="weekday" title={strings.admin.weekday.title} schedule={schedule} />;
}

export function ShabbatTimesCard({ schedule }: { schedule: ScheduleInput }) {
  return (
    <PrayerListCard
      group="shabbat"
      title={strings.admin.shabbat.title}
      hint={strings.admin.shabbat.hint}
      schedule={schedule}
    />
  );
}
