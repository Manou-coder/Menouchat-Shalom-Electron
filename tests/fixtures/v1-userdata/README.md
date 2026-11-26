# v1 userData fixture

A copy of a real Menouchat Chalom v1 `userData` folder, used by the v1 import tests (plan §5, step 7).

- `db/*.txt`: copied byte for byte from a v1 installation. Slot 1 holds an uploaded photo, slots 2–4 the bundled test PDFs; only slot 1 is shown, at 10 seconds.
- `images/imageAffiche{0..4}.jpg`: the same images, re-encoded at 200 px so the repository stays small. Slot 0 is v1's fallback image, which the import ignores.

v1 also kept a `files/` folder. The import does not read it: what it holds is the converted JPEG under the original name, not the original file.

Never edit these files to make a test pass.
