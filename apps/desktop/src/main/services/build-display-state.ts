import { civilDateAt, computeDay, startOfNextCivilDate } from '@menouchat/core';
import {
  slidePageUrl,
  type Display,
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
      pages: slidesFor(display, inputs.slides).flatMap((slide) =>
        slide.pages.map((page) => ({
          key: `${slide.id}/${page}`,
          url: slidePageUrl(slide.id, page),
        })),
      ),
    },
  };
}

function slidesFor(display: Display, library: Slides): Slides['slides'] {
  const enabled = library.slides.filter((slide) => slide.enabled);
  if (display.slideIds.length === 0) {
    return enabled;
  }
  return display.slideIds.flatMap((id) => enabled.filter((slide) => slide.id === id));
}
