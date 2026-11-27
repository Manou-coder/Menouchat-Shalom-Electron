import type Konva from 'konva';
import { AlignCenter, AlignLeft, AlignRight, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog, FileTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Image as KonvaImage, Layer, Stage, Text, Transformer } from 'react-konva';

import {
  MAX_SLIDE_TEXT_LENGTH,
  MAX_SLIDE_TEXTS,
  SLIDE_DESIGN_SIZE,
  SLIDE_FONTS,
  TEMPLATE_UPLOAD_FIELDS,
  slideFontSchema,
  strings,
  type SlideDesign,
  type SlideText,
  type LibraryItem,
} from '@menouchat/shared';

import { useApiClient } from '../../api/api-client.ts';
import { Button } from '../../components/Button.tsx';
import { errorMessage } from '../errors.ts';
import { ErrorMessage } from '../ui/Card.tsx';
import { itemBackgroundUrl, type TemplateItem } from '../pictures/library.ts';
import { LibraryPicker } from '../pictures/LibraryPicker.tsx';
import { SelectInput, TextInput, Toggle } from '../ui/fields.tsx';
import {
  BACKGROUND_IDS,
  backgroundTextColor,
  renderBackground,
  type BackgroundId,
} from './backgrounds.ts';
import {
  COLOR_SWATCHES,
  coverCrop,
  createText,
  designTitle,
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
} from './design.ts';
import './slide-editor.css';

const labels = strings.admin.editor;

/** Pictures a user may pick as a background; the server keeps them with the template. */
const BACKGROUND_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type Background =
  | { kind: 'builtin'; id: BackgroundId }
  | { kind: 'file'; file: File }
  /** The background of a template being edited again, as stored on the server. */
  | { kind: 'saved'; url: string };

/** The background as a file to upload with the template. */
async function backgroundFile(background: Background): Promise<File> {
  switch (background.kind) {
    case 'builtin':
      return new File([await renderBackground(background.id)], 'background.png', {
        type: 'image/png',
      });
    case 'file':
      return background.file;
    case 'saved': {
      const blob = await (await fetch(background.url)).blob();
      return new File([blob], 'background', { type: blob.type });
    }
  }
}

/** Loads the background into an image element for the canvas. */
function useBackgroundImage(background: Background) {
  const [image, setImage] = useState<HTMLImageElement>();
  const [failedFor, setFailedFor] = useState<Background>();

  useEffect(() => {
    const run = { cancelled: false, objectUrl: undefined as string | undefined };
    void (async () => {
      try {
        let url: string;
        if (background.kind === 'saved') {
          url = background.url;
        } else {
          url = URL.createObjectURL(
            background.kind === 'file' ? background.file : await renderBackground(background.id),
          );
          run.objectUrl = url;
          if (run.cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
        }
        const element = new window.Image();
        element.src = url;
        await element.decode();
        if (!run.cancelled) {
          setImage(element);
        }
      } catch {
        if (!run.cancelled) {
          setFailedFor(background);
        }
      }
    })();
    return () => {
      run.cancelled = true;
      // The decoded picture stays drawable; only the blob behind the URL is let go.
      if (run.objectUrl !== undefined) {
        URL.revokeObjectURL(run.objectUrl);
      }
    };
  }, [background]);

  const failed = failedFor === background;
  return { image, failed };
}

/** True once every editor font has loaded, so the canvas measures text with the right font. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const loads = SLIDE_FONTS.flatMap((font) =>
      ['400', '700'].map((weight) =>
        document.fonts.load(`${weight} 40px "${FONT_FAMILIES[font]}"`, 'אבג abc'),
      ),
    );
    void Promise.allSettled(loads).then(() => {
      if (active) {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return ready;
}

/** The width available to the canvas, followed as the window resizes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { ref, width };
}

function firstLine(text: string): string | undefined {
  const line = text.split('\n')[0]?.trim();
  return line === '' ? undefined : line;
}

function TextControls({
  text,
  onChange,
}: {
  text: SlideText;
  onChange: (text: SlideText) => void;
}) {
  const alignIcons = { right: AlignRight, center: AlignCenter, left: AlignLeft } as const;
  return (
    <div className="grid gap-4">
      <label className="grid gap-1">
        <span className="text-sm font-medium text-text-muted">{labels.text}</span>
        <textarea
          dir="auto"
          rows={3}
          maxLength={MAX_SLIDE_TEXT_LENGTH}
          value={text.text}
          onChange={(event) => {
            onChange({ ...text, text: event.target.value });
          }}
          className="min-h-20 w-full rounded-xl border border-border bg-surface px-3 py-2 text-lg shadow-xs outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-focus/40"
        />
      </label>

      <SelectInput
        label={labels.font}
        value={text.font}
        options={SLIDE_FONTS.map((font) => ({ value: font, label: labels.fonts[font] }))}
        onChange={(value) => {
          const font = slideFontSchema.safeParse(value);
          if (font.success) {
            onChange({ ...text, font: font.data });
          }
        }}
      />

      <label className="grid gap-1">
        <span className="text-sm font-medium text-text-muted">
          {labels.size}: <span dir="ltr">{text.fontSize}</span>
        </span>
        <input
          type="range"
          min={FONT_SIZE_RANGE.min}
          max={FONT_SIZE_RANGE.max}
          step={FONT_SIZE_RANGE.step}
          value={text.fontSize}
          onChange={(event) => {
            onChange({ ...text, fontSize: event.target.valueAsNumber });
          }}
          className="h-11 w-full accent-accent"
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-text-muted">{labels.color}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              aria-pressed={text.color.toLowerCase() === color}
              onClick={() => {
                onChange({ ...text, color });
              }}
              className="size-11 rounded-full border-2 border-border shadow-xs focus-visible:outline-3 focus-visible:outline-focus aria-pressed:ring-3 aria-pressed:ring-focus"
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            aria-label={labels.color}
            value={text.color}
            onChange={(event) => {
              onChange({ ...text, color: event.target.value });
            }}
            className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-surface"
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle
          label={labels.bold}
          isSelected={text.bold}
          onChange={(bold) => {
            onChange({ ...text, bold });
          }}
        />
        <div role="group" aria-label={labels.align} className="flex gap-1">
          {(['right', 'center', 'left'] as const).map((align) => {
            const Icon = alignIcons[align];
            return (
              <button
                key={align}
                type="button"
                aria-label={labels.aligns[align]}
                aria-pressed={text.align === align}
                onClick={() => {
                  onChange({ ...text, align });
                }}
                className="grid size-11 place-items-center rounded-xl border border-border bg-surface text-text focus-visible:outline-3 focus-visible:outline-focus aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                <Icon aria-hidden className="size-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Makes a template from a background and texts the user places on it: drag a text to move it,
 * pull its side handles to change where it wraps, and style it in the panel. The result is
 * saved as a template, with the design kept so it can be edited again; slots showing it follow.
 */
function Editor({
  template,
  startFrom,
  library,
  onSaved,
  onClose,
}: {
  /** The template to edit; a new one is made without it. */
  template: TemplateItem | undefined;
  /** For a new template: the library item whose picture it starts on. */
  startFrom: LibraryItem | undefined;
  library: readonly LibraryItem[];
  onSaved: (template: LibraryItem) => void;
  onClose: () => void;
}) {
  const api = useApiClient();
  const startingItem = template ?? startFrom;
  const savedBackground = startingItem === undefined ? undefined : itemBackgroundUrl(startingItem);

  const [background, setBackground] = useState<Background>(() =>
    savedBackground === undefined
      ? { kind: 'builtin', id: 'parchment' }
      : { kind: 'saved', url: savedBackground },
  );
  const [texts, setTexts] = useState<SlideText[]>(
    () => template?.design.texts ?? [createText([], backgroundTextColor('parchment'))],
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(texts[0]?.id);
  const [name, setName] = useState(template?.name ?? startFrom?.name ?? '');
  const [pickingBackground, setPickingBackground] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const { image, failed } = useBackgroundImage(background);
  const fontsReady = useFontsReady();
  const { ref: frameRef, width } = useWidth<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const textNodes = useRef(new Map<string, Konva.Text>());

  const scale = width / SLIDE_DESIGN_SIZE.width;
  const selected = texts.find((text) => text.id === selectedId);
  const newTextColor =
    background.kind === 'builtin' ? backgroundTextColor(background.id) : '#ffffff';

  // After every render: when the layer is drawn again (fonts loaded, picture changed), the
  // handles must be put back on the selected text, which a narrower list of triggers missed.
  useEffect(() => {
    const node = selectedId === undefined ? undefined : textNodes.current.get(selectedId);
    const handles = transformerRef.current;
    if (handles !== null && handles.nodes()[0] !== node) {
      handles.nodes(node === undefined ? [] : [node]);
    }
  });

  function update(next: SlideText) {
    setTexts(texts.map((text) => (text.id === next.id ? next : text)));
  }

  /** Texts still in the old background's colour follow the new one, staying readable. */
  function chooseBuiltinBackground(id: BackgroundId) {
    const color = backgroundTextColor(id);
    setTexts(texts.map((text) => (text.color === newTextColor ? { ...text, color } : text)));
    setBackground({ kind: 'builtin', id });
  }

  function removeText(id: string) {
    setTexts(texts.filter((text) => text.id !== id));
    if (selectedId === id) {
      setSelectedId(undefined);
    }
  }

  // Delete or Backspace removes the selected text, unless a field is being typed in.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !typing &&
        selectedId !== undefined
      ) {
        event.preventDefault();
        setTexts((current) => current.filter((text) => text.id !== selectedId));
        setSelectedId(undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedId]);

  function addText() {
    const text = createText(texts, newTextColor);
    setTexts([...texts, text]);
    setSelectedId(text.id);
  }

  async function save() {
    const stage = stageRef.current;
    if (stage === null || scale === 0) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      // The handles must not end up in the picture. Hidden on the node itself, at once:
      // waiting for a re-render would need an animation frame, which a hidden page never gets.
      const handles = transformerRef.current;
      handles?.visible(false);
      const dataUrl = stage.toDataURL({
        mimeType: 'image/jpeg',
        quality: 0.9,
        pixelRatio: 1 / scale,
      });
      handles?.visible(true);
      const rendered = await (await fetch(dataUrl)).blob();
      const design: SlideDesign = { texts };
      const form = new FormData();
      if (template !== undefined) {
        form.set(TEMPLATE_UPLOAD_FIELDS.id, template.id);
      }
      // Without a name, the template is named after its first line of text.
      form.set(TEMPLATE_UPLOAD_FIELDS.name, name.trim() === '' ? designTitle(design) : name.trim());
      form.set(TEMPLATE_UPLOAD_FIELDS.background, await backgroundFile(background));
      form.set(TEMPLATE_UPLOAD_FIELDS.image, rendered, 'page-1.jpg');
      form.set(TEMPLATE_UPLOAD_FIELDS.design, JSON.stringify(design));
      onSaved(await api.admin.library.saveTemplate.mutate(form));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  const deselectOnEmpty = (event: Konva.KonvaEventObject<Event>) => {
    if (event.target === event.target.getStage() || event.target.name() === 'background') {
      setSelectedId(undefined);
    }
  };

  return (
    <Dialog className="flex h-full flex-col outline-none">
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Heading slot="title" className="flex-1 text-lg font-semibold">
          {template === undefined ? labels.newTemplate : labels.editTemplate}
        </Heading>
        <Button variant="icon" aria-label={labels.cancel} onPress={onClose} isDisabled={saving}>
          <X aria-hidden className="mx-auto size-5" />
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 lg:grid-cols-[1fr_22rem]">
        {/*
          On a phone the columns stack and this one dissolves into the scrolling grid, so the
          picture can stay at the top while the settings under it scroll.
        */}
        <div className="grid content-start gap-4 max-lg:contents">
          <div className="sticky top-0 z-10 bg-background pb-1 lg:static lg:pb-0">
            <div ref={frameRef} className="w-full overflow-hidden rounded-xl bg-black shadow-sm">
              {width > 0 && (
                <Stage
                  ref={stageRef}
                  width={width}
                  height={SLIDE_DESIGN_SIZE.height * scale}
                  scaleX={scale}
                  scaleY={scale}
                  onMouseDown={deselectOnEmpty}
                  onTouchStart={deselectOnEmpty}
                  aria-label={labels.canvasLabel}
                >
                  {/* Remounted once the fonts load, so Konva measures the texts again. */}
                  <Layer key={fontsReady ? 'fonts-ready' : 'fonts-loading'}>
                    {image !== undefined && (
                      <KonvaImage
                        name="background"
                        image={image}
                        width={SLIDE_DESIGN_SIZE.width}
                        height={SLIDE_DESIGN_SIZE.height}
                        crop={coverCrop({ width: image.naturalWidth, height: image.naturalHeight })}
                      />
                    )}
                    {texts.map((text) => (
                      <Text
                        key={text.id}
                        ref={(node) => {
                          if (node === null) {
                            textNodes.current.delete(text.id);
                          } else {
                            textNodes.current.set(text.id, node);
                          }
                        }}
                        text={text.text}
                        x={text.x}
                        y={text.y}
                        width={text.width}
                        fontSize={text.fontSize}
                        fontFamily={FONT_FAMILIES[text.font]}
                        fontStyle={text.bold ? 'bold' : 'normal'}
                        fill={text.color}
                        align={text.align}
                        direction="rtl"
                        lineHeight={1.2}
                        wrap="word"
                        draggable
                        onMouseDown={() => {
                          setSelectedId(text.id);
                        }}
                        onTouchStart={() => {
                          setSelectedId(text.id);
                        }}
                        onDragEnd={(event) => {
                          update({ ...text, x: event.target.x(), y: event.target.y() });
                        }}
                        onTransform={(event) => {
                          // Side handles change where lines wrap, never stretch the letters.
                          const node = event.target;
                          node.setAttrs({
                            width: Math.max(40, node.width() * node.scaleX()),
                            scaleX: 1,
                          });
                        }}
                        onTransformEnd={(event) => {
                          const node = event.target;
                          update({ ...text, x: node.x(), y: node.y(), width: node.width() });
                        }}
                      />
                    ))}
                    {selected !== undefined && (
                      <Transformer
                        ref={transformerRef}
                        enabledAnchors={['middle-left', 'middle-right']}
                        rotateEnabled={false}
                        // Smaller on a phone, where the picture itself is small.
                        anchorSize={width < 500 ? 16 : 28}
                        anchorCornerRadius={width < 500 ? 8 : 14}
                        anchorStroke="#b8892f"
                        borderStroke="#d6a64d"
                        borderStrokeWidth={2}
                        boundBoxFunc={(previous, next) =>
                          next.width < 40 * scale ? previous : next
                        }
                      />
                    )}
                  </Layer>
                </Stage>
              )}
            </div>
          </div>
          <p className="text-sm text-text-muted">{labels.selectHint}</p>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium text-text-muted">
              {labels.background}
            </legend>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={background.kind === 'builtin' && background.id === id}
                  onClick={() => {
                    chooseBuiltinBackground(id);
                  }}
                  className="min-h-11 rounded-xl border border-border bg-surface px-4 font-medium shadow-sm focus-visible:outline-3 focus-visible:outline-focus aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
                >
                  {labels.backgrounds[id]}
                </button>
              ))}
              <FileTrigger
                acceptedFileTypes={BACKGROUND_TYPES}
                onSelect={(files) => {
                  const file = files?.[0];
                  if (file !== undefined) {
                    setBackground({ kind: 'file', file });
                  }
                }}
              >
                <Button variant="secondary">{labels.ownImage}</Button>
              </FileTrigger>
              <Button
                variant="secondary"
                onPress={() => {
                  setPickingBackground(true);
                }}
              >
                {labels.fromLibrary}
              </Button>
            </div>
            {failed && <ErrorMessage message={labels.backgroundFailed} />}
          </fieldset>
        </div>

        <div className="grid content-start gap-4">
          <TextInput
            label={labels.name}
            placeholder={labels.namePlaceholder}
            maxLength={100}
            value={name}
            onChange={setName}
          />
          <div className="flex flex-wrap gap-2">
            {texts.map((text) => {
              const name = firstLine(text.text) ?? labels.newText;
              const isSelected = text.id === selectedId;
              return (
                <span
                  key={text.id}
                  className={`flex max-w-full items-center rounded-xl border ${isSelected ? 'border-accent bg-accent-soft' : 'border-border bg-surface'}`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedId(text.id);
                    }}
                    className="min-h-11 min-w-0 truncate rounded-xl ps-3 pe-1 focus-visible:outline-3 focus-visible:outline-focus"
                  >
                    <bdi>{name}</bdi>
                  </button>
                  <button
                    type="button"
                    aria-label={labels.removeNamed(name)}
                    onClick={() => {
                      removeText(text.id);
                    }}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-text-muted hover:text-danger focus-visible:outline-3 focus-visible:outline-focus"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </span>
              );
            })}
            <Button
              variant="secondary"
              onPress={addText}
              isDisabled={texts.length >= MAX_SLIDE_TEXTS}
            >
              <span className="flex items-center gap-2">
                <Plus aria-hidden className="size-5" />
                {labels.addText}
              </span>
            </Button>
          </div>
          {texts.length >= MAX_SLIDE_TEXTS && (
            <p className="text-sm text-text-muted">{labels.tooManyTexts(MAX_SLIDE_TEXTS)}</p>
          )}
          {selected === undefined ? (
            texts.length === 0 && <p className="text-text-muted">{labels.noText}</p>
          ) : (
            <TextControls text={selected} onChange={update} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/70 px-4 py-3">
        <Button onPress={() => void save()} isDisabled={saving || image === undefined}>
          {saving ? labels.saving : labels.save}
        </Button>
        <Button variant="secondary" onPress={onClose} isDisabled={saving}>
          {labels.cancel}
        </Button>
        <ErrorMessage message={error} />
      </div>
      {pickingBackground && (
        <ModalOverlay
          isOpen
          isDismissable
          onOpenChange={(open) => {
            setPickingBackground(open);
          }}
          className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4"
        >
          <Modal className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-5 shadow-xl">
            <Dialog aria-label={labels.fromLibrary} className="outline-none">
              <LibraryPicker
                library={library}
                onPick={(item) => {
                  setBackground({ kind: 'saved', url: itemBackgroundUrl(item) });
                  setPickingBackground(false);
                }}
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </Dialog>
  );
}

/** The editor in a full-screen dialog over the admin. */
export function TemplateEditorDialog({
  template,
  startFrom,
  library,
  isOpen,
  onClose,
  onSaved,
}: {
  template?: TemplateItem | undefined;
  startFrom?: LibraryItem | undefined;
  library: readonly LibraryItem[];
  isOpen: boolean;
  onClose: () => void;
  /** Called with the saved template; the dialog is closed by its owner. */
  onSaved: (template: LibraryItem) => void;
}) {
  return (
    <ModalOverlay isOpen={isOpen} className="fixed inset-0 z-30 bg-black/50 md:p-6">
      <Modal className="mx-auto h-full max-w-6xl overflow-hidden bg-background md:rounded-2xl md:shadow-xl">
        {isOpen && (
          <Editor
            template={template}
            startFrom={startFrom}
            library={library}
            onSaved={onSaved}
            onClose={onClose}
          />
        )}
      </Modal>
    </ModalOverlay>
  );
}
