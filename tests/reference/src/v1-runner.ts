import { createRequire } from 'node:module';

import FakeTimers from '@sinonjs/fake-timers';
import { z } from 'zod';

const require = createRequire(import.meta.url);

const zmanJsonSchema = z.object({
  BasicZmanim: z.object({
    AlosHashachar: z.string(),
    SeaLevelSunrise: z.string(),
    SofZmanShmaMGA: z.string(),
    SofZmanShmaGRA: z.string(),
    Chatzos: z.string(),
    Sunset: z.string(),
    Tzais: z.string(),
  }),
  HadlakAndTzais: z.object({
    hadlaka: z.string(),
    Tzais: z.string(),
    Tzais16Point1Degrees: z.string(),
  }),
});

const infoSchema = z.object({
  ParashatAshavua: z.string(),
  DafYomiEvent: z.object({ render: z.string() }),
  HebrewDateEvent: z.object({ render2: z.string() }),
});

const exportedFunction = z.custom<() => unknown>((value) => typeof value === 'function');
const zmanimModuleSchema = z.object({ zmanJerusalem: exportedFunction });
const hebcalModuleSchema = z.object({ eventsByDate: exportedFunction });

export type V1Zmanim = z.infer<typeof zmanJsonSchema>;
export type V1Info = z.infer<typeof infoSchema>;

export interface V1Runner {
  /** Runs v1's two API computations as if the system clock read `instant`. */
  capture(instant: Date): { zmanim: V1Zmanim; info: V1Info };
  dispose(): void;
}

/**
 * Loads the verbatim v1 modules under a fake clock. They read `new Date()` and start
 * `setInterval` timers when loaded, so the clock must be installed before they are required.
 */
export function createV1Runner(initial: Date): V1Runner {
  const clock = FakeTimers.install({
    now: initial,
    toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
  const zmanimModule = zmanimModuleSchema.parse(require('../v1/cities/zmanim.js'));
  const hebcalModule = hebcalModuleSchema.parse(require('../v1/hebcal3.js'));

  return {
    capture(instant) {
      clock.setSystemTime(instant);
      return {
        zmanim: zmanJsonSchema.parse(zmanimModule.zmanJerusalem()),
        info: infoSchema.parse(hebcalModule.eventsByDate()),
      };
    },
    dispose() {
      clock.uninstall();
    },
  };
}
