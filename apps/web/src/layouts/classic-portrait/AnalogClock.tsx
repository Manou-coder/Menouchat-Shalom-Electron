import { handAngles, useClock } from '../../display/use-clock.ts';
import clockPin from './assets/clock-pin.png';
import hourHand from './assets/hour-hand.png';
import minuteHand from './assets/minute-hand.png';
import { clock } from './placements.ts';

/** The hand artwork points to about 10:27; rotations are measured from there. */
const ARTWORK_ANGLE = -47;

function Hand({ src, size, angle }: { src: string; size: number; angle: number }) {
  return (
    <img
      src={src}
      alt=""
      className="absolute max-w-none"
      style={{
        left: -size / 2,
        top: -size / 2,
        width: size,
        height: size,
        rotate: `${String(angle - ARTWORK_ANGLE)}deg`,
      }}
    />
  );
}

/** Hands drawn over the clock face of the background, centred on its pivot. */
export function AnalogClock({ timeZoneId }: { timeZoneId: string }) {
  const angles = handAngles(useClock(timeZoneId));
  return (
    <div
      className="absolute size-0"
      style={{ left: clock.centerX, top: clock.centerY }}
      aria-hidden
    >
      <Hand src={hourHand} size={clock.hour} angle={angles.hour} />
      <Hand src={minuteHand} size={clock.minute} angle={angles.minute} />
      <img
        src={clockPin}
        alt=""
        className="absolute max-w-none"
        style={{ left: -clock.pin / 2, top: -clock.pin / 2, width: clock.pin, height: clock.pin }}
      />
    </div>
  );
}
