import { SLIDE_DESIGN_SIZE } from '@menouchat/shared';

/**
 * The backgrounds offered with the app, drawn in code rather than shipped as pictures: a
 * gradient and a gold frame in the spirit of the two screen themes.
 */
export const BACKGROUND_IDS = ['parchment', 'navy', 'white', 'dark'] as const;
export type BackgroundId = (typeof BACKGROUND_IDS)[number];

interface BackgroundStyle {
  from: string;
  to: string;
  frame: string;
  /** The colour new texts get on this background. */
  textColor: string;
  radial: boolean;
}

const styles: Record<BackgroundId, BackgroundStyle> = {
  parchment: {
    from: '#fbf3df',
    to: '#e4cf9f',
    frame: '#b8892f',
    textColor: '#12306a',
    radial: true,
  },
  navy: { from: '#1b3f80', to: '#0c2148', frame: '#d6a64d', textColor: '#fbf1d6', radial: true },
  white: { from: '#ffffff', to: '#f4eee2', frame: '#b8892f', textColor: '#2b2219', radial: false },
  dark: { from: '#3a2e22', to: '#15110d', frame: '#d6a64d', textColor: '#f3ece2', radial: true },
};

export function backgroundTextColor(id: BackgroundId): string {
  return styles[id].textColor;
}

function draw(context: CanvasRenderingContext2D, style: BackgroundStyle): void {
  const { width, height } = SLIDE_DESIGN_SIZE;
  const gradient = style.radial
    ? context.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.1,
        width / 2,
        height / 2,
        width * 0.6,
      )
    : context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, style.from);
  gradient.addColorStop(1, style.to);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // A thick frame and a thin one inside it, with small squares at the inner corners.
  context.strokeStyle = style.frame;
  context.lineWidth = 14;
  context.strokeRect(30, 30, width - 60, height - 60);
  context.lineWidth = 4;
  context.strokeRect(56, 56, width - 112, height - 112);
  context.fillStyle = style.frame;
  for (const [x, y] of [
    [56, 56],
    [width - 56, 56],
    [56, height - 56],
    [width - 56, height - 56],
  ] as const) {
    context.fillRect(x - 12, y - 12, 24, 24);
  }
}

/** The background as a PNG at the slide's design size, uploaded as the slide's original. */
export async function renderBackground(id: BackgroundId): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_DESIGN_SIZE.width;
  canvas.height = SLIDE_DESIGN_SIZE.height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('Canvas 2D is not available');
  }
  draw(context, styles[id]);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Could not draw the background'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}
