// v1 ran on a PC set to Israel time and used local dates everywhere, so the capture must
// too. Imported first by the generator, before anything creates a Date.
export const V1_TIME_ZONE = 'Asia/Jerusalem';
process.env['TZ'] = V1_TIME_ZONE;
