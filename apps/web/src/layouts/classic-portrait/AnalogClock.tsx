import { handAngles, useClock } from '../../display/use-clock.ts';
import clockPin from './assets/clock-pin.png';
import hourHand from './assets/hour-hand.png';
import minuteHand from './assets/minute-hand.png';
import { clock } from './placements.ts';

/** The hand artwork points to about 10:27; rotations are measured from there. */
const ARTWORK_ANGLE = -47;

interface Placement {
  x: number;
  y: number;
  size: number;
}

function ClockImage({ src, at, angle = 0 }: { src: string; at: Placement; angle?: number }) {
  return (
    <img
      src={src}
      alt=""
      className="absolute max-w-none"
      style={{
        left: at.x - at.size / 2,
        top: at.y - at.size / 2,
        width: at.size,
        height: at.size,
        rotate: `${String(angle)}deg`,
      }}
    />
  );
}

/** Hands drawn over the clock face of the background, as v1 placed them. */
export function AnalogClock({ timeZoneId }: { timeZoneId: string }) {
  const angles = handAngles(useClock(timeZoneId));
  return (
    <div aria-hidden>
      <ClockImage src={hourHand} at={clock.hour} angle={angles.hour - ARTWORK_ANGLE} />
      <ClockImage src={minuteHand} at={clock.minute} angle={angles.minute - ARTWORK_ANGLE} />
      <ClockImage src={clockPin} at={clock.pin} />
    </div>
  );
}
