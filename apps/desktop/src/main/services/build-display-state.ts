import { civilDateAt, computeDay, startOfNextCivilDate } from '@menouchat/core';
import {
  slidePageUrl,
  type DisplayState,
  type Displays,
  type Schedule,
  type Settings,
  type Slides,
} from '@menouchat/shared';

export interface DisplayInputs {
  settings: Settings;
  schedule: Schedule;
  slides: Slides;
  displays: Displays;
}

export class DisplayNotFoundError extends Error {
  override readonly name = 'DisplayNotFoundError';

  constructor(readonly displayId: string) {
    super(`No display with id "${displayId}"`);
  }
}

/** Builds the snapshot a display renders at `instant`. Pure: the clock is a parameter. */
export function buildDisplayState(
  inputs: DisplayInputs,
  displayId: string,
  instant: number,
): DisplayState {
  const display = inputs.displays.displays.find((candidate) => candidate.id === displayId);
  if (display === undefined) {
    throw new DisplayNotFoundError(displayId);
  }
  const { location } = inputs.settings;
  const date = civilDateAt(instant, location.timeZoneId);
  const day = computeDay(date, location, {
    candleLightingMinutes: inputs.settings.candleLightingMinutes,
    motzeiShabbatArvitOffsetMinutes: inputs.settings.motzashArvitOffsetMinutes,
  });
  return {
    displayId: display.id,
    layoutId: display.layoutId,
    layoutOptions: display.layoutOptions,
    locationName: location.name,
    timeZoneId: location.timeZoneId,
    date,
    validUntil: startOfNextCivilDate(date, location),
    schedule: { weekday: inputs.schedule.weekday, shabbat: inputs.schedule.shabbat },
    dailyZmanim: day.dailyZmanim,
    shabbat: {
      candleLighting: day.shabbat.candleLighting,
      motzeiShabbatArvit: day.shabbat.motzeiShabbatArvit,
      rabbeinuTam: day.shabbat.rabbeinuTam,
    },
    calendar: day.calendar,
    slideshow: {
      intervalSec: display.slideIntervalSec,
      // The enabled slots, in slot order, as v1 did.
      pages: inputs.slides.slides
        .filter((slide) => slide.enabled)
        .toSorted((a, b) => a.slot - b.slot)
        .map((slide) => ({
          key: `${slide.id}/${slide.image}`,
          url: slidePageUrl(slide.id, slide.image),
        })),
    },
  };
}
