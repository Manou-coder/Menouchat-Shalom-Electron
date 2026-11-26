/** Where the zmanim are computed. Settings validate it; the core only consumes it. */
export interface Location {
  latitude: number;
  longitude: number;
  /** Metres above sea level; raises sunrise and lowers sunset as in v1. */
  elevation: number;
  /** IANA time zone, e.g. `Asia/Jerusalem`. Every time is formatted in this zone. */
  timeZoneId: string;
  /** Selects the Israel or diaspora Torah reading schedule. */
  inIsrael: boolean;
}
