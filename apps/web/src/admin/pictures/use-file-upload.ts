import { useState } from 'react';

import { SLIDE_UPLOAD_FIELDS, strings, type LibraryItem, type SlideSlot } from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { convertSlide, SlideConversionError } from '../../slides/convert-slide.ts';
import { errorMessage } from '../errors.ts';

/**
 * Sends a PDF or picture to the library, its first page converted to JPEG in the browser,
 * and shows it in `slot` when one is given.
 */
export function useFileUpload(slot?: SlideSlot) {
  const api = useApiClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File): Promise<LibraryItem | undefined> {
    setBusy(true);
    setError(undefined);
    try {
      const image = await convertSlide(file);
      const form = new FormData();
      if (slot !== undefined) {
        form.set(SLIDE_UPLOAD_FIELDS.slot, String(slot));
      }
      form.set(SLIDE_UPLOAD_FIELDS.title, file.name);
      form.set(SLIDE_UPLOAD_FIELDS.original, file);
      form.set(SLIDE_UPLOAD_FIELDS.image, image, 'page-1.jpg');
      return await api.admin.slides.upload.mutate(form);
    } catch (failure) {
      setError(
        failure instanceof SlideConversionError
          ? strings.admin.slides.conversionFailed
          : errorMessage(failure),
      );
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy, error };
}
