import { handAngles, useClock } from '../../display/use-clock.ts';
import hourHand from './assets/hour-hand.png';
import minuteHand from './assets/minute-hand.png';
import clockPin from './assets/clock-pin.png';

/** The hand artwork points to about 10:27; rotations are measured from there. */
const ARTWORK_ANGLE = -47;

/** Hands drawn over the clock face of the background, centred on its pivot. */
export function AnalogClock({ timeZoneId }: { timeZoneId: string }) {
  const angles = handAngles(useClock(timeZoneId));
  return (
    <div className="absolute top-[546px] left-[266px] size-0" aria-hidden>
      <img
        src={hourHand}
        alt=""
        className="absolute -top-[44px] -left-[44px] size-[88px] max-w-none"
        style={{ rotate: `${String(angles.hour - ARTWORK_ANGLE)}deg` }}
      />
      <img
        src={minuteHand}
        alt=""
        className="absolute -top-[62px] -left-[62px] size-[124px] max-w-none"
        style={{ rotate: `${String(angles.minute - ARTWORK_ANGLE)}deg` }}
      />
      <img
        src={clockPin}
        alt=""
        className="absolute -top-[6px] -left-[6px] size-[12px] max-w-none"
      />
    </div>
  );
}
