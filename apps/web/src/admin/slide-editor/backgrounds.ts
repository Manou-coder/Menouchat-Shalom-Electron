import { SLIDE_DESIGN_SIZE } from '@menouchat/shared';

import parchmentUrl from './assets/parchment.jpg';
import { coverCrop } from './design.ts';

/**
 * The backgrounds offered with the app. No frame of their own: the screen already shows
 * every slide inside its frame. The parchment is the real one, cut from the inside of the
 * classic theme's slide frame; the others are plain gradients.
 */
export const BACKGROUND_IDS = ['parchment', 'navy', 'white', 'dark'] as const;
export type BackgroundId = (typeof BACKGROUND_IDS)[number];

type BackgroundStyle =
  | { kind: 'picture'; url: string; textColor: string }
  | { kind: 'gradient'; from: string; to: string; radial: boolean; textColor: string };

const styles: Record<BackgroundId, BackgroundStyle> = {
  parchment: { kind: 'picture', url: parchmentUrl, textColor: '#12306a' },
  navy: { kind: 'gradient', from: '#1b3f80', to: '#0c2148', radial: true, textColor: '#fbf1d6' },
  white: { kind: 'gradient', from: '#ffffff', to: '#f4eee2', radial: false, textColor: '#2b2219' },
  dark: { kind: 'gradient', from: '#3a2e22', to: '#15110d', radial: true, textColor: '#f3ece2' },
};

/** The colour new texts get on this background. */
export function backgroundTextColor(id: BackgroundId): string {
  return styles[id].textColor;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

async function draw(context: CanvasRenderingContext2D, style: BackgroundStyle): Promise<void> {
  const { width, height } = SLIDE_DESIGN_SIZE;
  if (style.kind === 'picture') {
    const image = await loadImage(style.url);
    const crop = coverCrop({ width: image.naturalWidth, height: image.naturalHeight });
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
    return;
  }
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
  await draw(context, styles[id]);
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
